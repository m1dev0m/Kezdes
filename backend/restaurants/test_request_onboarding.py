from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from restaurants.models import Restaurant, RestaurantRequest


class RestaurantRequestOnboardingSecurityTests(APITestCase):
    def setUp(self):
        self.global_admin = User.objects.create_user(
            username="requests_admin",
            email="requests-admin@test.local",
            password="admin-pass-123",
        )
        self.global_admin.profile.role = "global_admin"
        self.global_admin.profile.save()

    def test_public_request_creation_keeps_user_pending(self):
        response = self.client.post(
            "/api/v1/restaurants/requests/",
            {
                "name": "Pending Access Cafe",
                "email": "pending-access@test.local",
                "admin_password": "OwnerPass123!",
                "city": "Алматы",
                "address": "Абая 1",
                "phone": "+77770000000",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        user = User.objects.get(email="pending-access@test.local")
        request_obj = RestaurantRequest.objects.get(owner=user)
        self.assertEqual(user.profile.role, "pending")
        self.assertEqual(request_obj.status, "pending")

    def test_approval_flow_grants_owner_role(self):
        owner = User.objects.create_user(
            username="approval_owner",
            email="approval-owner@test.local",
            password="owner-pass-123",
        )
        owner.profile.role = "pending"
        owner.profile.save()

        request_obj = RestaurantRequest.objects.create(
            owner=owner,
            name="Approval Bistro",
            city="Алматы",
            address="Тестовая 2",
            phone="+77770001122",
            email=owner.email,
            admin_username=owner.username,
            status="pending",
        )

        self.client.force_authenticate(user=self.global_admin)
        response = self.client.post(f"/api/v1/restaurants/requests/{request_obj.id}/approve/")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        owner.refresh_from_db()
        owner.profile.refresh_from_db()
        request_obj.refresh_from_db()

        self.assertEqual(owner.profile.role, "owner")
        self.assertEqual(request_obj.status, "approved")

        restaurant = Restaurant.objects.get(owner=owner)
        self.assertTrue(restaurant.is_verified)
        self.assertEqual(owner.profile.restaurant_id, restaurant.id)
