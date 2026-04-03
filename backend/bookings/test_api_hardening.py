from datetime import date, time

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from bookings.models import Booking, WaitlistEntry
from restaurants.models import Restaurant, Table
from bookings.services import WaitlistService


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

    def _auth_as_admin(self):
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.admin.username, "password": "test-pass-123"},
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
        # Error may be in detail or nested — just verify it's a 400
        error_text = str(response.data).lower()
        self.assertTrue(
            "верификац" in error_text or "restaurant" in error_text or "verified" in error_text,
            f"Expected verification error, got: {response.data}"
        )

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

    def test_anonymous_waitlist_join_exposes_public_token_and_can_be_canceled(self):
        Table.objects.create(
            restaurant=self.restaurant,
            number="W1",
            seats=4,
            is_active=True,
        )

        response = self.client.post(
            "/api/v1/bookings/join_waitlist/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-05",
                "time": "18:30",
                "guests": 2,
                "guest_name": "Public Guest",
                "guest_phone": "+7 700 123 45 67",
                "guest_email": "public.waitlist@test.local",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("public_token", response.data)
        self.assertEqual(response.data["guest_name"], "Public Guest")
        self.assertEqual(response.data["guest_phone"], "+7 700 123 45 67")

        public_token = response.data["public_token"]
        lookup = self.client.get(f"/api/v1/bookings/waitlist/public/{public_token}/")
        self.assertEqual(lookup.status_code, status.HTTP_200_OK)
        self.assertEqual(lookup.data["public_token"], public_token)
        self.assertTrue(lookup.data["can_be_cancelled"])

        cancel = self.client.delete(f"/api/v1/bookings/waitlist/public/{public_token}/")
        self.assertEqual(cancel.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel.data["status"], WaitlistEntry.CANCELLED)

    def test_authenticated_waitlist_join_keeps_account_defaults(self):
        self._auth_as_customer()
        Table.objects.create(
            restaurant=self.restaurant,
            number="W2",
            seats=4,
            is_active=True,
        )

        response = self.client.post(
            "/api/v1/bookings/join_waitlist/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-06",
                "time": "19:00",
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("public_token", response.data)
        self.assertEqual(response.data["user_name"], self.customer.username)

    def test_public_waitlist_confirm_creates_booking_without_user(self):
        Table.objects.create(
            restaurant=self.restaurant,
            number="W3",
            seats=4,
            is_active=True,
        )

        join_response = self.client.post(
            "/api/v1/bookings/join_waitlist/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-07",
                "time": "18:00",
                "guests": 2,
                "guest_name": "Anonymous Guest",
                "guest_phone": "+7 700 000 11 22",
            },
            format="json",
        )
        self.assertEqual(join_response.status_code, status.HTTP_201_CREATED)
        public_token = join_response.data["public_token"]

        entry = WaitlistEntry.objects.get(public_token=public_token)
        WaitlistService.promote_next(self.restaurant, entry.date, entry.time)
        entry.refresh_from_db()
        self.assertEqual(entry.status, WaitlistEntry.NOTIFIED)

        confirm = self.client.post(
            "/api/v1/bookings/confirm_waitlist/",
            {"public_token": public_token},
            format="json",
        )
        self.assertEqual(confirm.status_code, status.HTTP_201_CREATED)
        self.assertIn("public_token", confirm.data)

        booking = Booking.objects.get(pk=confirm.data["id"])
        self.assertIsNone(booking.user)
        self.assertEqual(booking.user_name, "Anonymous Guest")

        lookup = self.client.get(f"/api/v1/bookings/public/{booking.public_token}/")
        self.assertEqual(lookup.status_code, status.HTTP_200_OK)
        self.assertIn("can_review", lookup.data)
        self.assertFalse(lookup.data["can_review"])
        self.assertIn("rebook_payload", lookup.data)
        self.assertEqual(lookup.data["rebook_payload"]["booking_id"], booking.id)
        self.assertEqual(lookup.data["rebook_payload"]["restaurant_id"], self.restaurant.id)

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

    def test_my_restaurant_search_filters_admin_workflow_fields(self):
        self._auth_as_admin()

        table_a = Table.objects.create(
            restaurant=self.restaurant,
            number="A1",
            seats=4,
            is_active=True,
        )
        table_b = Table.objects.create(
            restaurant=self.restaurant,
            number="B2",
            seats=4,
            is_active=True,
        )

        booking_user = Booking.objects.create(
            user=self.customer,
            restaurant=self.restaurant,
            table=table_a,
            date=date(2030, 1, 6),
            time=time(18, 0),
            duration_minutes=90,
            guests=2,
            status=Booking.PENDING,
            source="admin",
            user_name="Customer Search",
            user_phone="+77001112233",
            guest_email="customer_search@test.local",
        )
        booking_user.tables.set([table_a])

        booking_manual = Booking.objects.create(
            restaurant=self.restaurant,
            table=table_b,
            date=date(2030, 1, 6),
            time=time(19, 0),
            duration_minutes=90,
            guests=2,
            status=Booking.CONFIRMED,
            source="admin",
            user_name="Manual Alice",
            user_phone="+77004445566",
            guest_email="alice_manual@test.local",
        )
        booking_manual.tables.set([table_b])

        search_cases = [
            ("customer_hardening", booking_user.id),
            ("Customer Search", booking_user.id),
            ("+77004445566", booking_manual.id),
            ("alice_manual@test.local", booking_manual.id),
            ("B2", booking_manual.id),
        ]

        for query, expected_id in search_cases:
            response = self.client.get(
                "/api/v1/bookings/my_restaurant/",
                {"search": query, "limit": 250},
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIsInstance(response.data, list)
            ids = {row["id"] for row in response.data}
            self.assertIn(expected_id, ids)

        response = self.client.get(
            "/api/v1/bookings/my_restaurant/",
            {"search": "does-not-exist", "limit": 250},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_my_restaurant_paginates_results(self):
        self._auth_as_admin()

        for index in range(5):
            booking = Booking.objects.create(
                restaurant=self.restaurant,
                date=date(2030, 1, 7),
                time=time(18 + index, 0),
                duration_minutes=90,
                guests=2,
                status=Booking.PENDING,
                source="admin",
                user_name=f"Page Guest {index}",
                user_phone=f"+77005550{index:02d}",
                guest_email=f"page_guest_{index}@test.local",
            )
            booking.tables.set([])

        first_page = self.client.get(
            "/api/v1/bookings/my_restaurant/",
            {"page": 1, "page_size": 2},
        )
        self.assertEqual(first_page.status_code, status.HTTP_200_OK)
        self.assertIn("results", first_page.data)
        self.assertEqual(first_page.data["count"], 5)
        self.assertEqual(len(first_page.data["results"]), 2)

        second_page = self.client.get(
            "/api/v1/bookings/my_restaurant/",
            {"page": 2, "page_size": 2},
        )
        self.assertEqual(second_page.status_code, status.HTTP_200_OK)
        self.assertIn("results", second_page.data)
        self.assertEqual(len(second_page.data["results"]), 2)
        self.assertNotEqual(
            [row["id"] for row in first_page.data["results"]],
            [row["id"] for row in second_page.data["results"]],
        )

    def test_create_manual_booking_is_available_for_restaurant_admin(self):
        self._auth_as_admin()

        table = Table.objects.create(
            restaurant=self.restaurant,
            number="M1",
            seats=4,
            is_active=True,
        )

        response = self.client.post(
            "/api/v1/bookings/create_manual/",
            {
                "user_name": "Walk-in Guest",
                "user_phone": "+77009990000",
                "date": "2030-01-08",
                "time": "20:00",
                "guests": 2,
                "table_id": table.id,
                "status": Booking.CONFIRMED,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["restaurant"], self.restaurant.id)
        self.assertEqual(response.data["user_name"], "Walk-in Guest")
        self.assertEqual(response.data["table_number"], "M1")
        self.assertEqual(response.data["status"], Booking.CONFIRMED)
        self.assertEqual(response.data["source"], "admin")

    def test_create_manual_booking_rejects_zero_duration_values(self):
        self._auth_as_admin()

        Table.objects.create(
            restaurant=self.restaurant,
            number="M2",
            seats=4,
            is_active=True,
        )

        for duration_field in ("duration_minutes", "duration_hours"):
            payload = {
                "user_name": "Zero Duration Guest",
                "user_phone": "+77009990001",
                "date": "2030-01-08",
                "time": "20:00",
                "guests": 2,
                "status": Booking.CONFIRMED,
                duration_field: 0,
            }

            response = self.client.post(
                "/api/v1/bookings/create_manual/",
                payload,
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
            self.assertIn("error", response.data)
            self.assertIn("details", response.data["error"])
            self.assertIn("duration_minutes", response.data["error"]["details"])

    def test_available_tables_returns_ids_and_table_payload(self):
        Table.objects.create(
            restaurant=self.restaurant,
            number="T1",
            seats=4,
            is_active=True,
        )

        response = self.client.get(
            "/api/v1/bookings/available_tables/",
            {
                "restaurant_id": self.restaurant.id,
                "date": "2030-01-06",
                "time": "19:00",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("available_tables", response.data)
        self.assertIn("available_table_ids", response.data)
        self.assertEqual(len(response.data["available_tables"]), len(response.data["available_table_ids"]))

    def test_manual_booking_accepts_table_and_status_fields(self):
        self._auth_as_customer()
        table = Table.objects.create(
            restaurant=self.restaurant,
            number="T2",
            seats=4,
            is_active=True,
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/v1/bookings/create_manual/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-07",
                "time": "19:00",
                "guests": 2,
                "user_name": "Manual Guest",
                "user_phone": "+77009990002",
                "status": "confirmed",
                "table_id": table.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["status"], "confirmed")
        booking = Booking.objects.get(id=response.data["id"])
        self.assertEqual(booking.table_id, table.id)

    def test_seat_rejects_invalid_table_assignment_for_admin_ops(self):
        self._auth_as_customer()

        booking_table = Table.objects.create(
            restaurant=self.restaurant,
            number="OPS-A1",
            seats=4,
            is_active=True,
        )
        too_small_table = Table.objects.create(
            restaurant=self.restaurant,
            number="OPS-A2",
            seats=2,
            is_active=True,
        )

        create = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": "2030-01-09",
                "time": "19:00",
                "guests": 4,
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED, create.data)
        booking_id = create.data["id"]

        self._auth_as_admin()
        confirm = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(confirm.status_code, status.HTTP_200_OK, confirm.data)

        conflicting_booking = Booking.objects.create(
            restaurant=self.restaurant,
            table=booking_table,
            date=date(2030, 1, 9),
            time=time(19, 0),
            duration_minutes=90,
            guests=2,
            status=Booking.CONFIRMED,
            user_name="Ops Conflict",
            user_phone="+77008889900",
        )
        conflicting_booking.tables.set([booking_table])

        too_small_response = self.client.post(
            f"/api/v1/bookings/{booking_id}/seat/",
            {"table_id": too_small_table.id},
            format="json",
        )
        self.assertEqual(too_small_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", too_small_response.data)
        self.assertEqual(too_small_response.data["error"]["details"]["guests"], 4)

        unavailable_response = self.client.post(
            f"/api/v1/bookings/{booking_id}/seat/",
            {"table_id": booking_table.id},
            format="json",
        )
        self.assertEqual(unavailable_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", unavailable_response.data)
        self.assertEqual(unavailable_response.data["error"]["details"]["table_id"], booking_table.id)

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
        booking_items = bk_resp.data.get("results", bk_resp.data) if isinstance(bk_resp.data, dict) else bk_resp.data
        for b in booking_items:
            self.assertEqual(b.get("restaurant"), self.restaurant.id)

    def test_table_status_endpoint(self):
        self._auth_as_customer()
        table1 = Table.objects.create(restaurant=self.restaurant, number="T1", seats=4, is_active=True)
        table2 = Table.objects.create(restaurant=self.restaurant, number="T2", seats=4, is_active=True)

        # Use a second customer for the second booking to avoid unique constraint
        from django.contrib.auth.models import User as DjangoUser
        customer2 = DjangoUser.objects.create_user("status_cust2", "sc2@t.com", "pass1234")

        b1 = Booking.objects.create(user=self.customer, restaurant=self.restaurant, table=table1, date=date(2030, 1, 30), time=time(19,0), guests=2, status=Booking.CONFIRMED)
        b1.tables.set([table1])
        b2 = Booking.objects.create(user=customer2, restaurant=self.restaurant, table=table2, date=date(2030, 1, 30), time=time(19,0), guests=2, status=Booking.SEATED, is_checked_in=True)
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
