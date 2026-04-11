from datetime import date, time

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from bookings.models import Booking
from crm.models import Customer, CustomerNote
from restaurants.models import Restaurant, Table


class ReportsExcelViewsTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="reports_owner",
            password="reports-pass-123",
            email="reports_owner@test.local",
        )
        self.owner.profile.role = "restaurant_admin"
        self.owner.profile.save()
        self.host = User.objects.create_user(
            username="reports_host",
            password="reports-pass-123",
            email="reports_host@test.local",
        )

        self.restaurant = Restaurant.objects.create(
            name="Reports Restaurant",
            address="Reports street 1",
            latitude=43.2,
            longitude=76.9,
            owner=self.owner,
            is_claimed=True,
            is_verified=True,
            average_price=10000,
        )
        self.host.profile.role = "host"
        self.host.profile.restaurant = self.restaurant
        self.host.profile.save()
        self.table = Table.objects.create(
            restaurant=self.restaurant,
            number="R-1",
            seats=4,
            is_active=True,
        )

        self.customer_user = User.objects.create_user(
            username="reports_customer",
            password="reports-pass-123",
            email="reports_customer@test.local",
        )
        self.customer_user.profile.role = "customer"
        self.customer_user.profile.phone = "+77010000000"
        self.customer_user.profile.save()

        self.booking = Booking.objects.create(
            user=self.customer_user,
            restaurant=self.restaurant,
            table=self.table,
            date=date(2030, 1, 1),
            time=time(19, 0),
            guests=2,
            status=Booking.COMPLETED,
        )

        self.customer = Customer.objects.create(
            restaurant=self.restaurant,
            name="Customer One",
            phone="+77010000000",
            email="customer.one@test.local",
            visits_count=3,
            total_spent=30000,
        )
        CustomerNote.objects.create(customer=self.customer, author=self.owner, content="VIP guest")

        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.owner.username, "password": "reports-pass-123"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_bookings_excel_report_uses_current_booking_fields(self):
        response = self.client.get("/api/v1/reports/bookings/excel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            response["Content-Type"],
        )

    def test_reports_require_restaurant_scope(self):
        outsider = User.objects.create_user(
            username="reports_outsider",
            password="reports-pass-123",
            email="reports_outsider@test.local",
        )
        outsider.profile.role = "customer"
        outsider.profile.save(update_fields=["role"])

        self.client.credentials()
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": outsider.username, "password": "reports-pass-123"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        for endpoint in (
            "/api/v1/reports/bookings/excel/",
            "/api/v1/reports/customers/excel/",
            "/api/v1/reports/analytics/excel/",
        ):
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bookings_excel_report_handles_missing_guest_profile(self):
        self.customer_user.profile.delete()
        response = self.client.get("/api/v1/reports/bookings/excel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            response["Content-Type"],
        )

    def test_customers_excel_report_uses_internal_notes(self):
        response = self.client.get("/api/v1/reports/customers/excel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            response["Content-Type"],
        )

    def test_analytics_excel_report_owner_access(self):
        response = self.client.get("/api/v1/reports/analytics/excel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            response["Content-Type"],
        )

    def test_host_can_access_bookings_and_analytics_but_not_customers_export(self):
        self.client.credentials()
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.host.username, "password": "reports-pass-123"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        bookings_response = self.client.get("/api/v1/reports/bookings/excel/")
        analytics_response = self.client.get("/api/v1/reports/analytics/excel/")
        customers_response = self.client.get("/api/v1/reports/customers/excel/")

        self.assertEqual(bookings_response.status_code, status.HTTP_200_OK)
        self.assertEqual(analytics_response.status_code, status.HTTP_200_OK)
        self.assertEqual(customers_response.status_code, status.HTTP_403_FORBIDDEN)
