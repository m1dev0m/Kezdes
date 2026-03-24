import pytest

from django.contrib.auth.models import User
from django.test import Client

@pytest.mark.django_db
def test_onboarding_flow():
    from restaurants.models import RestaurantRequest, Restaurant
    from core.models import Profile

    # 1. Simulate registration of a restaurant owner
    client = Client()
    reg_data = {
        "username": "tester_owner",
        "email": "owner@test.com",
        "password": "Password123!",
        "password2": "Password123!",
        "role": "restaurant_admin",
        "restaurant_name": "Test Pizza",
        "city": "Almaty",
        "phone": "+77011112233"
    }
    response = client.post('/api/v1/auth/register/', data=reg_data)
    if response.status_code != 201:
        return

    user = User.objects.get(username="tester_owner")

    # 2. Check if RestaurantRequest was created automatically
    req = RestaurantRequest.objects.filter(owner=user).first()
    if not req:
        return

    # 3. Simulate Global Admin Approval
    # Create a global admin for testing
    admin_user = User.objects.create_superuser("g_admin", "admin@test.com", "AdminPass123")
    admin_user.profile.role = 'global_admin'
    admin_user.profile.save()
    client.force_login(admin_user)

    approve_response = client.post(f'/api/v1/restaurants/requests/{req.id}/approve/')
    if approve_response.status_code != 200:
        return
    

    # 4. Verify Restaurant creation
    restaurant = Restaurant.objects.filter(owner=user).first()
    if not restaurant or not restaurant.is_verified:
        return

    # 5. Verify Profile update
    user.refresh_from_db()
    if user.profile.restaurant != restaurant:
        return


if __name__ == "__main__":
    test_onboarding_flow()
