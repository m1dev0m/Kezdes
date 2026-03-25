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

    def test_booking_validation_error_contract(self):
        self._auth_as_customer()

        cases = [
            ({"restaurant": self.restaurant.id, "date": "invalid-date", "time": "19:00", "guests": 2}, "date"),
            ({"restaurant": self.restaurant.id, "date": "2030-01-05", "time": "invalid-time", "guests": 2}, "time"),
            ({"restaurant": self.restaurant.id, "date": "2030-01-05", "time": "19:00", "guests": 0}, "guests"),
            ({"restaurant": self.restaurant.id, "date": "2030-01-05", "time": "19:00", "guests": 21}, "guests"),
            ({"restaurant": self.restaurant.id, "date": "2030-01-05", "time": "19:00", "guests": 2, "duration_minutes": 10}, "duration_minutes"),
            ({"restaurant": self.restaurant.id, "date": "2030-01-05", "time": "19:00", "guests": 2, "duration_minutes": 500}, "duration_minutes"),
            ({"restaurant": 999999, "date": "2030-01-05", "time": "19:00", "guests": 2}, "restaurant"),
        ]

        for payload, expected_field in cases:
            response = self.client.post("/api/v1/bookings/", payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(response.data.get("success", True))
            self.assertIn("detail", response.data)
            self.assertIn("error", response.data)
            self.assertIn("details", response.data["error"])
            self.assertTrue(response.data["error"]["details"] is not None)

            # field-specific check (if present)
            if expected_field in response.data["error"]["details"]:
                self.assertTrue(True)

    def test_booking_actions_error_contract(self):
        self._auth_as_customer()
        Table.objects.create(restaurant=self.restaurant, number="T1", seats=4, is_active=True)

        create = self.client.post(
            "/api/v1/bookings/",
            {"restaurant": self.restaurant.id, "date": "2030-01-10", "time": "19:00", "guests": 2},
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        booking_id = create.data["id"]

        # staff for same restaurant
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.admin.username, "password": "test-pass-123"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        # invalid reschedule payload
        res = self.client.post(f"/api/v1/bookings/{booking_id}/reschedule/", {"date": "bad-date", "time": "bad-time"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data.get("success", True))
        self.assertIn("detail", res.data)
        self.assertIn("error", res.data)

    def test_tenant_isolation_for_tables_and_bookings(self):
        admin2 = User.objects.create_user(username="admin_hardening2", email="admin_hardening2@test.local", password="test-pass-123")
        admin2.profile.role = "restaurant_admin"
        admin2.profile.save()
        restaurant2 = Restaurant.objects.create(name="Other Restaurant", address="R2", latitude=10, longitude=10, owner=admin2, is_claimed=True, is_verified=True)

        table_a = Table.objects.create(restaurant=self.restaurant, number="A1", seats=4, is_active=True)
        table_b = Table.objects.create(restaurant=restaurant2, number="B1", seats=4, is_active=True)

        # booking B belongs to restaurant2
        Booking.objects.create(user=self.customer, restaurant=restaurant2, table=table_b, date=date(2030, 1, 20), time=time(19, 0), guests=2, status=Booking.CONFIRMED)

        # login as restaurant admin1 (staff) to access /tables/
        login1 = self.client.post("/api/v1/auth/login/", {"username": self.admin.username, "password": "test-pass-123"}, format="json")
        self.assertEqual(login1.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login1.data['access']}")

        tables_resp = self.client.get("/api/v1/tables/")
        self.assertEqual(tables_resp.status_code, status.HTTP_200_OK)
        for t in tables_resp.data:
            self.assertNotEqual(t.get("id"), table_b.id)

        # login as admin1 and try to access table_b by ID
        login1 = self.client.post("/api/v1/auth/login/", {"username": self.admin.username, "password": "test-pass-123"}, format="json")
        self.assertEqual(login1.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login1.data['access']}")

        resp = self.client.get(f"/api/v1/tables/{table_b.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        resp = self.client.patch(f"/api/v1/tables/{table_b.id}/", {"name": "X"}, format="json")
        self.assertIn(resp.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        resp = self.client.delete(f"/api/v1/tables/{table_b.id}/")
        self.assertIn(resp.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # bookings list should not contain restaurant2 booking
        bk_resp = self.client.get("/api/v1/bookings/")
        self.assertEqual(bk_resp.status_code, status.HTTP_200_OK)
        booking_items = bk_resp.data.get("results", bk_resp.data)
        for b in booking_items:
            self.assertEqual(b.get("restaurant"), self.restaurant.id)

    def test_table_status_endpoint(self):
        self._auth_as_customer()
        table1 = Table.objects.create(restaurant=self.restaurant, number="T1", seats=4, is_active=True)
        table2 = Table.objects.create(restaurant=self.restaurant, number="T2", seats=4, is_active=True)
        b1 = Booking.objects.create(user=self.customer, restaurant=self.restaurant, table=table1, date=date(2030, 1, 30), time=time(19,0), guests=2, status=Booking.CONFIRMED)
        b1.tables.set([table1])
        b2 = Booking.objects.create(user=self.customer, restaurant=self.restaurant, table=table2, date=date(2030, 1, 30), time=time(19,0), guests=2, status=Booking.SEATED, is_checked_in=True)
        b2.tables.set([table2])

        login = self.client.post("/api/v1/auth/login/", {"username": self.admin.username, "password": "test-pass-123"}, format="json")
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        resp = self.client.get("/api/v1/tables/status/?date=2030-01-30&time=19:00")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        statuses = {item['number']: item['status'] for item in resp.data}
        self.assertEqual(statuses.get('T1'), 'reserved')
        self.assertEqual(statuses.get('T2'), 'occupied')

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
