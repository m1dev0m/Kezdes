from django.test import TestCase
from django.utils import timezone
from datetime import timedelta, time
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


class DashboardAnalyticsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user("dash_owner", "dash_owner@test.com", "pass1234")
        self.owner.profile.role = "owner"
        self.owner.profile.save()

        from restaurants.models import Restaurant, Table
        self.restaurant = Restaurant.objects.create(
            name="Dash Restaurant",
            address="Dash Address",
            latitude=43.0,
            longitude=76.0,
            is_verified=True,
            owner=self.owner,
            capacity=20,
        )
        self.owner.profile.restaurant = self.restaurant
        self.owner.profile.save()

        self.table = Table.objects.create(restaurant=self.restaurant, number="1", seats=4, is_active=True)

        self.customer = User.objects.create_user("dash_customer", "dash_customer@test.com", "pass1234")
        self.customer.profile.role = "customer"
        self.customer.profile.save()

    def test_dashboard_requires_restaurant(self):
        user = User.objects.create_user("no_rest", "no_rest@test.com", "pass1234")
        user.profile.role = "owner"
        user.profile.save()
        self.client.force_authenticate(user=user)
        res = self.client.get("/api/v1/analytics/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_includes_new_fields(self):
        from bookings.models import Booking

        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)

        Booking.objects.create(
            user=self.customer,
            restaurant=self.restaurant,
            table=self.table,
            date=today,
            time=time(19, 0),
            guests=2,
            status=Booking.PENDING,
            duration_minutes=90,
        )

        Booking.objects.create(
            user=self.customer,
            restaurant=self.restaurant,
            table=self.table,
            date=tomorrow,
            time=time(20, 0),
            guests=2,
            status=Booking.PENDING,
            duration_minutes=90,
        )

        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/analytics/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.assertIn("bookings_tomorrow", res.data)
        self.assertIn("pending_bookings_today", res.data)
        self.assertIn("active_tables", res.data)
        self.assertIn("new_requests", res.data)

        self.assertEqual(res.data["bookings_tomorrow"], 1)
        self.assertEqual(res.data["pending_bookings_today"], 1)
        self.assertEqual(res.data["active_tables"], 1)
