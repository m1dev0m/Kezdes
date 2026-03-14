from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from restaurants.models import Restaurant, Table
from bookings.models import Booking

class PeakCapacityTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="pwd")
        self.admin.profile.role = "restaurant_admin"
        self.admin.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="Capacity Restaurant",
            owner=self.admin,
            is_claimed=True,
            is_verified=True,
            capacity=10,
        )
        # Create 3 tables of 4 seats each (total 12 seats, but global capacity is 10)
        Table.objects.create(restaurant=self.restaurant, number="T1", seats=4)
        Table.objects.create(restaurant=self.restaurant, number="T2", seats=4)
        Table.objects.create(restaurant=self.restaurant, number="T3", seats=4)

    def _login(self, username: str, password: str) -> str:
        res = self.client.post("/api/v1/auth/login/", {"username": username, "password": password}, format="json")
        return res.data["access"]

    def test_global_capacity_respected(self):
        """Test that global capacity (10) is respected even if tables have more total seats (12)."""
        user1 = User.objects.create_user(username="user1", password="pwd")
        user2 = User.objects.create_user(username="user2", password="pwd")
        user3 = User.objects.create_user(username="user3", password="pwd")
        
        # Booking 1: 18:00 - 19:30, 4 guests
        token1 = self._login("user1", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token1}")
        self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant.id,
            "date": "2030-11-01",
            "time": "18:00:00",
            "guests": 4
        }, format="json")
        
        # Booking 2: 18:30 - 20:00, 4 guests (overlaps with B1)
        token2 = self._login("user2", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token2}")
        self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant.id,
            "date": "2030-11-01",
            "time": "18:30:00",
            "guests": 4
        }, format="json")
        
        # Current total in overlap (18:30-19:30) is 8 guests.
        
        # Booking 3: 19:00 - 20:30, 4 guests.
        # Overlaps with B1 (19:00-19:30) and B2 (19:00-20:00).
        # At 19:00, we have B1(4) + B2(4) = 8. Adding 4 would make 12 > 10.
        token3 = self._login("user3", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token3}")
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant.id,
            "date": "2030-11-01",
            "time": "19:00:00",
            "guests": 4
        }, format="json")
        
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Превышена вместимость", res.data["detail"])

    def test_manual_booking_respects_capacity(self):
        """Test that manual bookings also respect global capacity."""
        token = self._login("admin", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        # Book 8 seats via regular bookings (two tables of 4).
        # With single-table allocation, we cannot create an 8-guest booking without an 8-seat table.
        user_a = User.objects.create_user(username="cap_user_a", password="pwd")
        user_b = User.objects.create_user(username="cap_user_b", password="pwd")

        token_a = self._login("cap_user_a", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")
        res_a = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-11-02",
                "time": "18:00:00",
                "guests": 4,
            },
            format="json",
        )
        self.assertEqual(res_a.status_code, status.HTTP_201_CREATED)

        token_b = self._login("cap_user_b", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_b}")
        res_b = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-11-02",
                "time": "18:00:00",
                "guests": 4,
            },
            format="json",
        )
        self.assertEqual(res_b.status_code, status.HTTP_201_CREATED)

        # Back to admin for manual booking attempt
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        # Try to book 4 seats via manual booking at same time
        res = self.client.post("/api/v1/bookings/create_manual/", {
            "restaurant": self.restaurant.id,
            "date": "2030-11-02",
            "time": "18:15:00",
            "guests": 4,
            "user_name_manual": "Manual Guest"
        }, format="json")
        
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Превышена вместимость", res.data["detail"])
