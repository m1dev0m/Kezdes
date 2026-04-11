from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from django.contrib.auth.models import User
from core.models import Profile
from restaurants.models import RestaurantRequest


class SetupRestaurantFlowTests(APITestCase):
    def test_owner_like_registration_stays_pending_until_approval(self):
        register_payload = {
            "username": "pending_owner_user",
            "email": "pending_owner_user@test.local",
            "password": "Str0ng!Pass#2026",
            "password2": "Str0ng!Pass#2026",
            "role": "restaurant_admin",
        }

        reg = self.client.post(reverse("register"), register_payload, format="json")

        self.assertEqual(reg.status_code, status.HTTP_201_CREATED, reg.data)
        user = User.objects.get(username="pending_owner_user")
        self.assertEqual(user.profile.role, "pending")

    def test_two_step_restaurant_onboarding_flow(self):
        register_payload = {
            "username": "rest_setup_user",
            "email": "rest_setup_user@test.local",
            "password": "Str0ng!Pass#2026",
            "password2": "Str0ng!Pass#2026",
            "role": "restaurant_admin",
        }
        reg = self.client.post(reverse("register"), register_payload, format="json")
        self.assertEqual(reg.status_code, status.HTTP_201_CREATED)

        login = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "rest_setup_user@test.local", "password": "Str0ng!Pass#2026"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        me_before = self.client.get(reverse("user_me"))
        self.assertEqual(me_before.status_code, status.HTTP_200_OK)
        self.assertEqual(me_before.data.get("role"), "pending")
        self.assertFalse(me_before.data.get("restaurant_verified", True))
        self.assertTrue(me_before.data.get("restaurant_setup_required", False))

        setup = self.client.post(
            reverse("setup_restaurant"),
            {
                "restaurant_name": "Demo Setup Restaurant",
                "city": "Алматы",
                "address": "Абая 1",
                "phone": "+77770000000",
            },
            format="json",
        )
        self.assertEqual(setup.status_code, status.HTTP_201_CREATED)
        self.assertTrue(RestaurantRequest.objects.filter(owner__username="rest_setup_user", status="pending").exists())

        me_after = self.client.get(reverse("user_me"))
        self.assertEqual(me_after.status_code, status.HTTP_200_OK)
        self.assertEqual(me_after.data.get("role"), "pending")
        self.assertFalse(me_after.data.get("restaurant_verified", True))
        self.assertFalse(me_after.data.get("restaurant_setup_required", True))

    def test_setup_restaurant_with_missing_profile_is_handled(self):
        user = User.objects.create_user(
            username="no_profile_setup",
            email="no_profile_setup@test.local",
            password="Str0ng!Pass#2026",
        )
        Profile.objects.filter(user=user).delete()
        self.client.force_authenticate(user=user)

        response = self.client.post(
            reverse("setup_restaurant"),
            {
                "restaurant_name": "No Profile Restaurant",
                "city": "Алматы",
                "address": "Абая 2",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
