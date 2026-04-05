from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from core.utils import get_user_restaurant
from restaurants.models import Restaurant


class UpdateRoleViewTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="role_owner",
            email="role-owner@example.com",
            password="pass1234",
        )
        self.owner.profile.role = "owner"
        self.owner.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="Role Update Restaurant",
            address="1 Role Street",
            city="Almaty",
            owner=self.owner,
            is_claimed=True,
            is_verified=True,
        )

        self.staff = User.objects.create_user(
            username="role_staff",
            email="role-staff@example.com",
            password="pass1234",
        )
        self.staff.profile.role = "manager"
        self.staff.profile.restaurant = self.restaurant
        self.staff.profile.save()

        self.pending_user = User.objects.create_user(
            username="role_pending",
            email="role-pending@example.com",
            password="pass1234",
        )
        self.pending_user.profile.role = "pending"
        self.pending_user.profile.save()

    def test_update_role_clears_profile_restaurant_for_customers(self):
        self.client.force_authenticate(user=self.staff)

        response = self.client.post("/api/v1/auth/update-role/", {"role": "customer"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.staff.refresh_from_db()
        self.staff.profile.refresh_from_db()
        self.assertEqual(self.staff.profile.role, "customer")
        self.assertIsNone(self.staff.profile.restaurant)
        self.assertIsNone(get_user_restaurant(self.staff))

    def test_pending_user_cannot_self_upgrade_to_owner(self):
        self.client.force_authenticate(user=self.pending_user)

        response = self.client.post("/api/v1/auth/update-role/", {"role": "owner"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.pending_user.refresh_from_db()
        self.pending_user.profile.refresh_from_db()
        self.assertEqual(self.pending_user.profile.role, "pending")

    def test_customer_user_cannot_self_upgrade_to_owner(self):
        customer = User.objects.create_user(
            username="role_customer",
            email="role-customer@example.com",
            password="pass1234",
        )
        customer.profile.role = "customer"
        customer.profile.save()

        self.client.force_authenticate(user=customer)
        response = self.client.post("/api/v1/auth/update-role/", {"role": "owner"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        customer.refresh_from_db()
        customer.profile.refresh_from_db()
        self.assertEqual(customer.profile.role, "customer")


class RestaurantResolutionSafetyTests(TestCase):
    def test_customer_profile_restaurant_is_ignored(self):
        user = User.objects.create_user(
            username="customer_role_guard",
            email="customer-role-guard@example.com",
            password="pass1234",
        )
        user.profile.role = "customer"
        user.profile.save()

        restaurant = Restaurant.objects.create(
            name="Guarded Restaurant",
            address="2 Guard Street",
            city="Almaty",
            owner=None,
            is_claimed=False,
            is_verified=False,
        )
        user.profile.restaurant = restaurant
        user.profile.save()

        self.assertIsNone(get_user_restaurant(user))
