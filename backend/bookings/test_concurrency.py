from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from django.contrib.auth.models import User
from django.db import connections, connection
from django.test import TransactionTestCase
import unittest
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from restaurants.models import Restaurant, Table


@unittest.skipUnless(
    connection.vendor == "postgresql",
    "Concurrency lock tests are PostgreSQL-specific.",
)
class ReservationConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner_concurrency",
            email="owner_concurrency@test.local",
            password="pwd-123",
        )
        self.owner.profile.role = "restaurant_admin"
        self.owner.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="Concurrency Restaurant",
            address="Concurrency street 1",
            latitude=43.2,
            longitude=76.9,
            owner=self.owner,
            is_claimed=True,
            is_verified=True,
            capacity=4,
        )
        Table.objects.create(
            restaurant=self.restaurant,
            number="T1",
            seats=4,
            is_active=True,
        )

    def _attempt_booking(self, user: User, barrier: Barrier, *, time_str: str = "19:00"):
        try:
            client = APIClient()
            client.force_authenticate(user=user)
            payload = {
                "restaurant": self.restaurant.id,
                "date": "2030-01-10",
                "time": time_str,
                "guests": 2,
            }
            barrier.wait()
            res = client.post("/api/v1/bookings/", payload, format="json")
            return res.status_code, res.data
        finally:
            connections.close_all()

    def test_parallel_double_booking_prevented(self):
                                                               
        import uuid
        suffix = uuid.uuid4().hex[:6]
        user_a = User.objects.create_user(username=f"user_a_{suffix}", password="pwd-123")
        user_b = User.objects.create_user(username=f"user_b_{suffix}", password="pwd-123")
        user_a.profile.role = "customer"
        user_b.profile.role = "customer"
        user_a.profile.save()
        user_b.profile.save()

        barrier = Barrier(2)
        with ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(self._attempt_booking, user_a, barrier)
            f2 = ex.submit(self._attempt_booking, user_b, barrier)
            outcomes = [f1.result(), f2.result()]

        success_count = sum(1 for code, _ in outcomes if code == status.HTTP_201_CREATED)
        self.assertEqual(success_count, 1, f"Unexpected outcomes: {outcomes}")

        active = Booking.objects.filter(
            restaurant=self.restaurant,
            date="2030-01-10",
            time="19:00",
            status__in=Booking.ACTIVE_STATUSES,
        ).count()
        self.assertEqual(active, 1)

    def test_stress_ten_parallel_requests_same_slot(self):
        users = []
        for idx in range(10):
            user = User.objects.create_user(username=f"stress_user_{idx}", password="pwd-123")
            user.profile.role = "customer"
            user.profile.save()
            users.append(user)

        barrier = Barrier(10)
        with ThreadPoolExecutor(max_workers=10) as ex:
            futures = [ex.submit(self._attempt_booking, user, barrier) for user in users]
            outcomes = [future.result() for future in futures]

        success_count = sum(1 for code, _ in outcomes if code == status.HTTP_201_CREATED)
        self.assertEqual(success_count, 1, f"Unexpected stress outcomes: {outcomes}")

        active = Booking.objects.filter(
            restaurant=self.restaurant,
            date="2030-01-10",
            time="19:00",
            status__in=Booking.ACTIVE_STATUSES,
        ).count()
        self.assertEqual(active, 1)

    def test_parallel_overlapping_time_ranges_prevented(self):
        import uuid
        suffix = uuid.uuid4().hex[:6]
        user_a = User.objects.create_user(username=f"user_ov_a_{suffix}", password="pwd-123")
        user_b = User.objects.create_user(username=f"user_ov_b_{suffix}", password="pwd-123")
        user_a.profile.role = "customer"
        user_b.profile.role = "customer"
        user_a.profile.save()
        user_b.profile.save()

        barrier = Barrier(2)
        with ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(self._attempt_booking, user_a, barrier, time_str="19:00")
            f2 = ex.submit(self._attempt_booking, user_b, barrier, time_str="19:30")
            outcomes = [f1.result(), f2.result()]

        success_count = sum(1 for code, _ in outcomes if code == status.HTTP_201_CREATED)
        self.assertEqual(success_count, 1, f"Unexpected outcomes: {outcomes}")

        active = Booking.objects.filter(
            restaurant=self.restaurant,
            date="2030-01-10",
            time__in=["19:00", "19:30"],
            status__in=Booking.ACTIVE_STATUSES,
        ).count()
        self.assertEqual(active, 1)
