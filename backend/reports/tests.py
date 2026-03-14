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
