import requests
import logging
from django.conf import settings
from django.db import transaction
from .models import Restaurant
from core.utils import get_user_profile
logger = logging.getLogger(__name__)
class TwoGISService:
    BASE_URL = "https://catalog.api.2gis.com/3.0/items"
    @classmethod
    def import_restaurants(cls, city="Астана"):
        api_key = getattr(settings, 'TWOGIS_API_KEY', '') or ''
        if not api_key:
            raise ValueError("TWOGIS_API_KEY is not configured")

        params = {
            "q": "ресторан",
            "key": api_key,
            "fields": "items.point,items.address_name,items.contact_groups",
            "point": "71.4491,51.1694", 
            "radius": 10000, 
            "page_size": 10
        }
        try:
            response = requests.get(cls.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            items = data.get('result', {}).get('items', [])
            count = 0
            with transaction.atomic():
                for item in items:
                    source_id = item.get('id')
                    point = item.get('point', {})
                    name = item.get('name')
                    address = item.get('address_name', 'No address')
                    lat = point.get('lat')
                    lon = point.get('lon')
                    if not lat or not lon:
                        continue
                    phone = ""
                    contacts = item.get('contact_groups', [])
                    for group in contacts:
                        for contact in group.get('contacts', []):
                            if contact.get('type') == 'phone':
                                phone = contact.get('value')
                                break
                        if phone: break
                    restaurant, created = Restaurant.objects.update_or_create(
                        source_id=source_id,
                        defaults={
                            'name': name,
                            'address': address,
                            'latitude': lat,
                            'longitude': lon,
                            'phone': phone,
                            'source': '2gis',
                            'is_verified': False
                        }
                    )
                    count += 1
            return count
        except Exception as e:
            logger.error(f"Error importing from 2GIS: {e}")
            raise

class RestaurantService:
    @staticmethod
    def approve_request(request_id, admin_user=None):
        """
        Approves a RestaurantRequest, ensures the User has the correct role,
        creates/verifies the Restaurant, and links them.
        """
        from django.contrib.auth.models import User
        from .models import Restaurant, RestaurantRequest
        import string
        import random

        with transaction.atomic():
            req = RestaurantRequest.objects.select_for_update().get(pk=request_id)
            if req.status != 'pending':
                return None, f"Request is already {req.status}"

            req.status = 'approved'
            req.save(update_fields=['status'])

            # 1. Find or create user
            # For MVP we must never accidentally approve an application for a different account.
            # If the request was created by an authenticated user, prefer that owner.
            user = req.owner
            if not user:
                user = User.objects.filter(email=req.email).first()
                if not user and req.admin_username:
                    user = User.objects.filter(username=req.admin_username).first()

            created_new_user = False
            password = None
            username = None

            if not user:
                base_username = req.admin_username or req.email.split('@')[0]
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                password = req.admin_password or ''.join(
                    random.choice(string.ascii_letters + string.digits) for _ in range(12)
                )
                user = User.objects.create_user(
                    username=username,
                    email=req.email,
                    password=password,
                    first_name=req.owner_name or req.name
                )
                created_new_user = True
            else:
                username = user.username

            # 2. Update role
            profile = get_user_profile(user)
            if profile:
                if not profile.is_owner:
                    profile.role = 'owner'
                profile.save()

            # 3. Create or verify restaurant
            restaurant = Restaurant.objects.filter(owner=user).first()
            if not restaurant:
                # Use standard Almaty coordinates if not provided
                restaurant = Restaurant.objects.create(
                    name=req.name,
                    address=req.address or req.city,
                    city=req.city,
                    latitude=43.238949,
                    longitude=76.889709,
                    phone=req.phone,
                    is_claimed=True,
                    is_verified=True,
                    owner=user,
                    source='manual'
                )
            else:
                restaurant.is_verified = True
                restaurant.name = req.name # Update name from request
                restaurant.city = req.city
                restaurant.phone = req.phone
                restaurant.save()

            profile = get_user_profile(user)
            if profile:
                profile.restaurant = restaurant
                profile.save()

            # Trigger notification
            try:
                from core.notifications import NotificationService
                NotificationService.notify_restaurant_approved(
                    user, 
                    restaurant.name, 
                    credentials={
                        "username": username,
                        "password": password if created_new_user else None
                    }
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to send approval notification: {e}")
            
            return {
                "restaurant": restaurant,
                "created_new_user": created_new_user,
                "credentials": {
                    "username": username,
                    "password": password if created_new_user else "Existing user",
                    "email": req.email,
                }
            }, None
