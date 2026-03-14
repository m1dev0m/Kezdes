import pytest

from django.contrib.auth.models import User
from django.test import Client

@pytest.mark.django_db
def test_onboarding_flow():
    from restaurants.models import RestaurantRequest, Restaurant
    from core.models import Profile

    # 1. Simulate registration of a restaurant owner
    print("Step 1: Registering owner...")
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
        print(f"FAILED: Registration failed with {response.status_code}: {response.content}")
        return

    user = User.objects.get(username="tester_owner")
    print(f"SUCCESS: User created with role {user.profile.role}")

    # 2. Check if RestaurantRequest was created automatically
    req = RestaurantRequest.objects.filter(owner=user).first()
    if not req:
        print("FAILED: RestaurantRequest not created automatically")
        return
    print(f"SUCCESS: RestaurantRequest found with status {req.status}")

    # 3. Simulate Global Admin Approval
    print("Step 2: Approving restaurant...")
    # Create a global admin for testing
    admin_user = User.objects.create_superuser("g_admin", "admin@test.com", "AdminPass123")
    admin_user.profile.role = 'global_admin'
    admin_user.profile.save()
    client.force_login(admin_user)

    approve_response = client.post(f'/api/v1/restaurants/requests/{req.id}/approve/')
    if approve_response.status_code != 200:
        print(f"FAILED: Approval failed with {approve_response.status_code}: {approve_response.content}")
        return
    
    print("SUCCESS: Restaurant approved via API")

    # 4. Verify Restaurant creation
    restaurant = Restaurant.objects.filter(owner=user).first()
    if not restaurant or not restaurant.is_verified:
        print("FAILED: Restaurant not created or not verified")
        return
    print(f"SUCCESS: Restaurant '{restaurant.name}' is verified and linked to owner.")

    # 5. Verify Profile update
    user.refresh_from_db()
    if user.profile.restaurant != restaurant:
        print("FAILED: Profile not linked to restaurant")
        return
    print("SUCCESS: Profile correctly linked to restaurant")

    print("\n--- MVP FLOW TEST PASSED ---")

if __name__ == "__main__":
    test_onboarding_flow()
