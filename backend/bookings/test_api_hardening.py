from datetime import date, time

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from bookings.models import Booking
from restaurants.models import Restaurant, Table


class BookingApiHardeningTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username="customer_hardening",
            email="customer_hardening@test.local",
            password="test-pass-123",
        )
        self.customer.profile.role = "customer"
        self.customer.profile.save()

        self.admin = User.objects.create_user(
            username="admin_hardening",
            email="admin_hardening@test.local",
            password="test-pass-123",
        )
        self.admin.profile.role = "restaurant_admin"
        self.admin.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="Hardening Test Restaurant",
            address="Test street 1",
            latitude=43.2,
            longitude=76.9,
            owner=self.admin,
            is_claimed=True,
            is_verified=True,
        )

    def _auth_as_customer(self):
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.customer.username, "password": "test-pass-123"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_available_slots_validation_error_shape(self):
        response = self.client.get(
            "/api/v1/bookings/available_slots/",
            {
                "restaurant_id": self.restaurant.id,
                "date": "2030-01-01",
                "guests": 0,
                "duration": 1,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("success", response.data)
        self.assertFalse(response.data["success"])
        self.assertIn("error", response.data)
        self.assertIn("message", response.data["error"])

    def test_optional_pagination_for_bookings_list(self):
        self._auth_as_customer()

        for hour in range(10, 14):
            Booking.objects.create(
                user=self.customer,
                restaurant=self.restaurant,
                date=date(2030, 1, 2),
                time=time(hour, 0),
                guests=2,
                status=Booking.PENDING,
            )

        response = self.client.get("/api/v1/bookings/", {"page": 1, "page_size": 2})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 2)

    def test_cannot_create_booking_for_unverified_restaurant(self):
        self._auth_as_customer()
        self.restaurant.is_verified = False
        self.restaurant.save(update_fields=["is_verified"])

        response = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-02",
                "time": "12:00",
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("success", response.data)
        self.assertIn("restaurant", response.data["error"]["details"])

    def test_cannot_create_booking_when_no_table_available(self):
        self._auth_as_customer()
        table = Table.objects.create(
            restaurant=self.restaurant,
            number="T1",
            seats=2,
            is_active=True,
        )

        Booking.objects.create(
            user=self.customer,
            restaurant=self.restaurant,
            table=table,
            date=date(2030, 1, 3),
            time=time(12, 0),
            duration_hours=2,
            guests=2,
            status=Booking.APPROVED,
        )

        another_customer = User.objects.create_user(
            username="customer_hardening_2",
            email="customer_hardening_2@test.local",
            password="test-pass-123",
        )
        another_customer.profile.role = "customer"
        another_customer.profile.save()
        login2 = self.client.post(
            "/api/v1/auth/login/",
            {"username": another_customer.username, "password": "test-pass-123"},
            format="json",
        )
        self.assertEqual(login2.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login2.data['access']}")

        response = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-03",
                "time": "12:30",
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("success", response.data)
        self.assertIn("Нет доступных столов", response.data["error"]["message"])

    def test_duration_overlap_blocks_and_back_to_back_allows(self):
        self._auth_as_customer()
        Table.objects.create(
            restaurant=self.restaurant,
            number="T1",
            seats=4,
            is_active=True,
        )

        first = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-04",
                "time": "19:00",
                "duration_minutes": 120,
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        another_customer = User.objects.create_user(
            username="duration_overlap_customer",
            email="duration_overlap_customer@test.local",
            password="test-pass-123",
        )
        another_customer.profile.role = "customer"
        another_customer.profile.save()
        login2 = self.client.post(
            "/api/v1/auth/login/",
            {"username": another_customer.username, "password": "test-pass-123"},
            format="json",
        )
        self.assertEqual(login2.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login2.data['access']}")

        conflict = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-04",
                "time": "20:00",
                "duration_minutes": 90,
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(conflict.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Нет доступных столов", conflict.data["error"]["message"])

        back_to_back = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-04",
                "time": "21:00",
                "duration_minutes": 90,
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(back_to_back.status_code, status.HTTP_201_CREATED)

    def test_combines_tables_when_no_single_table_fits(self):
        self._auth_as_customer()
        Table.objects.create(restaurant=self.restaurant, number="T1", seats=2, is_active=True)
        Table.objects.create(restaurant=self.restaurant, number="T2", seats=2, is_active=True)

        response = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-05",
                "time": "19:00",
                "guests": 3,
            },
            format="json",
        )
        # Allocation strategy supports combining multiple tables when needed.
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_idempotency_key_returns_existing_booking_on_repeat(self):
        self._auth_as_customer()
        Table.objects.create(restaurant=self.restaurant, number="T1", seats=4, is_active=True)

        payload = {
            "restaurant": self.restaurant.id,
            "date": "2030-01-06",
            "time": "19:00",
            "guests": 2,
        }
        first = self.client.post(
            "/api/v1/bookings/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="booking-key-1",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(
            "/api/v1/bookings/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="booking-key-1",
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["id"], second.data["id"])

        total = Booking.objects.filter(
            user=self.customer,
            restaurant=self.restaurant,
            date="2030-01-06",
            time="19:00",
        ).count()
        self.assertEqual(total, 1)

    def test_idempotency_key_rejects_different_payload(self):
        self._auth_as_customer()
        Table.objects.create(restaurant=self.restaurant, number="T1", seats=4, is_active=True)

        first = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-07",
                "time": "19:00",
                "guests": 2,
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY="booking-key-2",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-07",
                "time": "19:00",
                "guests": 3,
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY="booking-key-2",
        )
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.assertFalse(second.data.get("success", True))
