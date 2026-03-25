from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from restaurants.models import RestaurantRequest


class SetupRestaurantFlowTests(APITestCase):
    def test_two_step_restaurant_onboarding_flow(self):
        from core.models import OTPVerification
        OTPVerification.objects.update_or_create(
            email="rest_setup_user@test.local", defaults={"code": "333444", "is_verified": False}
        )
        register_payload = {
            "username": "rest_setup_user",
            "email": "rest_setup_user@test.local",
            "password": "Str0ng!Pass#2026",
            "password2": "Str0ng!Pass#2026",
            "role": "restaurant_admin",
            "otp_code": "333444",
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
        self.assertFalse(me_after.data.get("restaurant_verified", True))
        self.assertFalse(me_after.data.get("restaurant_setup_required", True))
