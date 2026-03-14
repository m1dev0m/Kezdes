from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from restaurants.models import Restaurant, Table


class EndToEndBookingFlowTest(APITestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(
            username="testorg",
            email="testorg@test.local",
            password="pwd",
        )
        self.organizer.profile.role = "organizer"
        self.organizer.profile.save()

        self.admin = User.objects.create_user(
            username="newtestadmin",
            email="newtestadmin@test.local",
            password="pwd",
        )
        self.admin.profile.role = "restaurant_admin"
        self.admin.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="E2E Restaurant",
            address="Test address",
            latitude=43.2,
            longitude=76.9,
            owner=self.admin,
            is_claimed=True,
            is_verified=True,
            capacity=20,
        )
        Table.objects.create(restaurant=self.restaurant, number="T1", seats=6, is_active=True)

    def _login(self, username: str, password: str) -> str:
        res = self.client.post(
            "/api/v1/auth/login/",
            {"username": username, "password": password},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        return res.data["access"]

    def test_organizer_booking_visible_for_restaurant_admin(self):
        organizer_token = self._login("testorg", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {organizer_token}")
        booking_payload = {
            "restaurant": self.restaurant.id,
            "date": "2030-10-20",
            "time": "14:00:00",
            "guests": 5,
            "event_type": "business",
            "special_requests": "Доп. услуги: VIP room",
        }
        create_res = self.client.post("/api/v1/bookings/", booking_payload, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)

        admin_token = self._login("newtestadmin", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        list_res = self.client.get("/api/v1/bookings/my_restaurant/?status=pending")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        returned_ids = [row["id"] for row in list_res.data]
        self.assertIn(create_res.data["id"], returned_ids)

    def test_admin_manual_booking_not_visible_in_organizer_personal_list(self):
        """
        Admin creates a manual booking (walk-in guest) and it should NOT appear
        in the organizer's own /bookings/ list, because that list is per-auth user.
        """
        admin_token = self._login("newtestadmin", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        manual_payload = {
            "restaurant": self.restaurant.id,
            "date": "2030-10-21",
            "time": "20:00:00",
            "guests": 2,
            "event_type": "business",
            "event_title": "Walk-in",
            "status": "approved",
        }
        manual_res = self.client.post("/api/v1/bookings/create_manual/", manual_payload, format="json")
        self.assertEqual(manual_res.status_code, status.HTTP_201_CREATED)

        organizer_token = self._login("testorg", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {organizer_token}")
        user_list_res = self.client.get("/api/v1/bookings/", format="json")
        self.assertEqual(user_list_res.status_code, status.HTTP_200_OK)
        user_booking_ids = [row["id"] for row in user_list_res.data]
        self.assertNotIn(manual_res.data["id"], user_booking_ids)
