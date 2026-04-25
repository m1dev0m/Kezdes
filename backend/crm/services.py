from django.db import transaction
from django.utils import timezone
import re
from .models import Customer, Visit

def normalize_phone(phone):
    
    if not phone:
        return None
    digits = re.sub(r"[^\d]", "", str(phone))

                                                                                     
                                                                  
    if len(digits) == 10:
        digits = f"7{digits}"
    elif len(digits) == 11 and digits[0] == "8":
        digits = f"7{digits[1:]}"

    if len(digits) == 11 and digits[0] == "7":
        return f"+{digits}"

                                                                                                
    return f"+{digits}" if digits else None

class CRMService:
    @staticmethod
    def ensure_customer(restaurant, phone, name=None, email=None):
        normalized_phone = normalize_phone(phone)
        if not normalized_phone:
            return None

        with transaction.atomic():
            customer, _created = Customer.objects.get_or_create(
                restaurant=restaurant,
                phone=normalized_phone,
                defaults={
                    'name': name or 'Guest',
                    'email': email,
                },
            )

            updated_fields = []
            if name and (customer.name == 'Guest' or not customer.name):
                customer.name = name
                updated_fields.append('name')
            if email and not customer.email:
                customer.email = email
                updated_fields.append('email')
            if updated_fields:
                customer.save(update_fields=updated_fields)

            return customer

    @staticmethod
    def record_visit(restaurant, phone, name=None, email=None, booking=None, spent_amount=0):
        normalized_phone = normalize_phone(phone)
        if not normalized_phone:
            return None

        with transaction.atomic():
            customer = CRMService.ensure_customer(
                restaurant=restaurant,
                phone=normalized_phone,
                name=name,
                email=email,
            )

            visit, created = Visit.objects.get_or_create(
                customer=customer,
                booking=booking,
                defaults={
                    'spent_amount': spent_amount or 0,
                },
            )

            if not created and spent_amount is not None and visit.spent_amount != spent_amount:
                visit.spent_amount = spent_amount
                visit.save(update_fields=['spent_amount'])

            customer.recalculate_stats()
            if customer.last_visit is None:
                customer.last_visit = timezone.now()
                customer.save(update_fields=['last_visit'])

            return customer

    @staticmethod
    def get_guest_loyalty_status(phone, restaurant):
        normalized_phone = normalize_phone(phone)
        try:
            customer = Customer.objects.get(restaurant=restaurant, phone=normalized_phone)
            return {
                'visits': customer.visits_count,
                'total_spent': customer.total_spent,
                'is_vip': customer.visits_count >= 5
            }
        except Customer.DoesNotExist:
            return None
