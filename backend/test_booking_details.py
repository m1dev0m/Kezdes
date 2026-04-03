from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from restaurants.models import Restaurant, Table
from bookings.models import Booking

class ReproIssuesTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@test.local",
            password="pwd",
        )
        self.admin.profile.role = "restaurant_admin"
        self.admin.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="Repro Restaurant",
            address="Test address",
            owner=self.admin,
            is_claimed=True,
            is_verified=True,
            capacity=10,
        )
        self.admin.profile.restaurant = self.restaurant
        self.admin.profile.save()
        self.table1 = Table.objects.create(restaurant=self.restaurant, number="T1", seats=4, is_active=True)
        self.table2 = Table.objects.create(restaurant=self.restaurant, number="T2", seats=6, is_active=True)

    def _login(self, username: str, password: str) -> str:
        res = self.client.post(
            "/api/v1/auth/login/",
            {"username": username, "password": password},
            format="json",
        )
        return res.data["access"]

    def test_manual_booking_correct_table_allocation(self):
        """Confirm that manual bookings now allocate tables."""
        admin_token = self._login("admin", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        
        manual_payload = {
            "restaurant": self.restaurant.id,
            "date": "2030-10-21",
            "time": "20:00:00",
            "guests": 2,
            "user_name": "Guest 1",
            "user_phone": "+123456789",
            "status": "confirmed",
        }
        res = self.client.post("/api/v1/bookings/create_manual/", manual_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        booking = Booking.objects.get(id=res.data["id"])
        self.assertIsNotNone(booking.table, "Table should NOT be None after fix")
        self.assertEqual(booking.table.number, "T1")

    def test_manual_booking_correct_user_association(self):
        """Confirm that manual bookings now do NOT associate with the admin user."""
        admin_token = self._login("admin", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        
        manual_payload = {
            "restaurant": self.restaurant.id,
            "date": "2030-10-22",
            "time": "20:00:00",
            "guests": 2,
            "user_name": "Guest 2",
            "user_phone": "+987654321",
            "status": "confirmed",
        }
        res = self.client.post("/api/v1/bookings/create_manual/", manual_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        booking = Booking.objects.get(id=res.data["id"])
        self.assertIsNone(booking.user, "Booking should NOT associate with admin user")

    def test_check_in_flow(self):
        """Test that a confirmed booking can be checked in."""
        admin_token = self._login("admin", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        
        # Create a confirmed (approved) booking
        booking = Booking.objects.create(
            restaurant=self.restaurant,
            date="2030-10-23",
            time="18:00:00",
            guests=2,
            status=Booking.APPROVED,
            table=self.table1
        )
        
        res = self.client.post(f"/api/v1/bookings/{booking.id}/check_in/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        booking.refresh_from_db()
        self.assertTrue(booking.is_checked_in)
        self.assertIsNotNone(booking.check_in_time)

    def test_check_in_only_approved(self):
        """Test that only approved bookings can be checked in."""
        admin_token = self._login("admin", "pwd")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        
        # Create a pending booking
        booking = Booking.objects.create(
            restaurant=self.restaurant,
            date="2030-10-23",
            time="19:00:00",
            guests=2,
            status=Booking.PENDING
        )
        
        res = self.client.post(f"/api/v1/bookings/{booking.id}/check_in/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Только подтвержденные", res.data["detail"])
