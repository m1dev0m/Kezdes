from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from restaurants.models import RestaurantRequest


class MvpSmokeFlowTests(APITestCase):
    def setUp(self):
        self.global_admin = User.objects.create_user(
            username="global_admin_smoke",
            email="global_admin_smoke@test.local",
            password="admin-pass-123",
        )
        self.global_admin.profile.role = "global_admin"
        self.global_admin.profile.save()

    def _login(self, username: str, password: str) -> str:
        res = self.client.post(
            reverse("token_obtain_pair"),
            {"username": username, "password": password},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        return res.data["access"]

    def test_end_to_end_owner_customer_admin_flow(self):
        from core.models import OTPVerification
        OTPVerification.objects.update_or_create(
            email="owner_smoke@test.local", defaults={"code": "111222", "is_verified": False}
        )
        reg_owner = self.client.post(
            reverse("register"),
            {
                "username": "owner_smoke",
                "email": "owner_smoke@test.local",
                "password": "owner-pass-123",
                "password2": "owner-pass-123",
                "role": "restaurant_admin",
                "otp_code": "111222",
            },
            format="json",
        )
        self.assertEqual(reg_owner.status_code, status.HTTP_201_CREATED)
        owner_token = self._login("owner_smoke@test.local", "owner-pass-123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {owner_token}")

        setup = self.client.post(
            reverse("setup_restaurant"),
            {
                "restaurant_name": "Smoke Restaurant",
                "city": "Алматы",
                "address": "Абая 10",
                "phone": "+77770001122",
            },
            format="json",
        )
        self.assertEqual(setup.status_code, status.HTTP_201_CREATED)
        req = RestaurantRequest.objects.get(owner__username="owner_smoke")
        self.assertEqual(req.status, "pending")

        admin_token = self._login("global_admin_smoke", "admin-pass-123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        approve = self.client.post(f"/api/v1/restaurants/requests/{req.id}/approve/")
        self.assertEqual(approve.status_code, status.HTTP_200_OK)

        owner_token = self._login("owner_smoke@test.local", "owner-pass-123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {owner_token}")
        table_res = self.client.post(
            "/api/v1/restaurants/tables/",
            {"number": "T1", "seats": 4, "status": "free", "is_active": True},
            format="json",
        )
        self.assertEqual(table_res.status_code, status.HTTP_201_CREATED)

        me_rest = self.client.get("/api/v1/restaurants/me/")
        self.assertEqual(me_rest.status_code, status.HTTP_200_OK)
        restaurant_id = me_rest.data["id"]

        self.client.credentials()
        from core.models import OTPVerification
        OTPVerification.objects.update_or_create(
            email="customer_smoke@test.local", defaults={"code": "999000", "is_verified": False}
        )
        reg_customer = self.client.post(
            reverse("register"),
            {
                "username": "customer_smoke",
                "email": "customer_smoke@test.local",
                "password": "customer-pass-123",
                "password2": "customer-pass-123",
                "role": "customer",
                "otp_code": "999000",
            },
            format="json",
        )
        self.assertEqual(reg_customer.status_code, status.HTTP_201_CREATED)
        customer_token = self._login("customer_smoke@test.local", "customer-pass-123")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {customer_token}")
        booking = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": restaurant_id,
                "date": "2030-01-04",
                "time": "19:00",
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(booking.status_code, status.HTTP_201_CREATED)
        booking_id = booking.data["id"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {owner_token}")
        confirm = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {customer_token}")
        cancel = self.client.post(f"/api/v1/bookings/{booking_id}/cancel/")
        self.assertEqual(cancel.status_code, status.HTTP_200_OK)
