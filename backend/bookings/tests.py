"""
Comprehensive tests for the booking system.
Covers: model logic, service layer (table allocation, capacity),
        API endpoints (CRUD, status transitions), and edge cases.
"""
from datetime import date, time, timedelta, datetime
from decimal import Decimal

from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from unittest.mock import patch
from rest_framework.test import APIClient
from rest_framework import status

from .models import Booking, ReservationHistory, WaitlistEntry
from .services import BookingService, WaitlistService
from restaurants.models import Restaurant, Table, OpeningHours, Availability
from core.models import Profile


def _tomorrow():
    return date.today() + timedelta(days=1)


class BookingModelTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user("testuser", "test@test.com", "pass1234")
        self.restaurant = Restaurant.objects.create(
            name="Test Restaurant",
            address="Test Address",
            latitude=43.238949,
            longitude=76.889709,
            is_verified=True,
        )
        self.table = Table.objects.create(
            restaurant=self.restaurant,
            number="1",
            seats=4,
            is_active=True,
        )

    def test_start_end_datetime_auto_calculated(self):
        booking = Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table,
            date=_tomorrow(),
            time=time(19, 0),
            guests=2,
            duration_minutes=90,
        )
        self.assertIsNotNone(booking.start_datetime)
        self.assertIsNotNone(booking.end_datetime)
        diff = (booking.end_datetime - booking.start_datetime).total_seconds()
        self.assertEqual(diff, 90 * 60)

    def test_transition_to_valid(self):
        booking = Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table,
            date=_tomorrow(),
            time=time(19, 0),
            guests=2,
        )
        booking.transition_to(Booking.APPROVED, actor=self.user)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.APPROVED)

        history = ReservationHistory.objects.filter(reservation=booking)
        self.assertEqual(history.count(), 1)
        self.assertEqual(history.first().from_status, Booking.PENDING)
        self.assertEqual(history.first().to_status, Booking.APPROVED)

    def test_transition_to_invalid_raises(self):

        booking = Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table,
            date=_tomorrow(),
            time=time(19, 0),
            guests=2,
            status=Booking.COMPLETED,
        )
        with self.assertRaises(ValidationError):
            booking.transition_to(Booking.APPROVED)

    def test_expire_stale_bookings(self):

        old_booking = Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table,
            date=_tomorrow(),
            time=time(19, 0),
            guests=2,
            status=Booking.PENDING,
        )
        Booking.objects.filter(pk=old_booking.pk).update(
            created_at=timezone.now() - timedelta(minutes=60)
        )
        count = Booking.expire_stale_bookings(ttl_minutes=30)
        self.assertEqual(count, 1)
        old_booking.refresh_from_db()
        self.assertEqual(old_booking.status, Booking.EXPIRED)

    def test_is_active_property(self):
        booking = Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table,
            date=_tomorrow(),
            time=time(19, 0),
            guests=2,
            status=Booking.PENDING,
        )
        self.assertTrue(booking.is_active)
        booking.status = Booking.CANCELLED_BY_USER
        self.assertFalse(booking.is_active)

    def test_deleting_restaurant_with_bookings_does_not_recreate_availability(self):
        booking_date = _tomorrow()
        Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table,
            date=booking_date,
            time=time(19, 0),
            guests=2,
            status=Booking.PENDING,
        )

        restaurant_id = self.restaurant.id
        self.restaurant.delete()

        self.assertFalse(Restaurant.objects.filter(id=restaurant_id).exists())
        self.assertFalse(Availability.objects.filter(restaurant_id=restaurant_id).exists())


class BookingServiceTests(TestCase):
    """Tests for BookingService service layer."""

    def setUp(self):
        self.user = User.objects.create_user("testuser", "test@test.com", "pass1234")
        self.restaurant = Restaurant.objects.create(
            name="Test Restaurant",
            address="Test Address",
            latitude=43.238949,
            longitude=76.889709,
            is_verified=True,
            capacity=20,
        )
        self.table_small = Table.objects.create(
            restaurant=self.restaurant, number="1", seats=2, is_active=True,
        )
        self.table_medium = Table.objects.create(
            restaurant=self.restaurant, number="2", seats=4, is_active=True,
        )
        self.table_large = Table.objects.create(
            restaurant=self.restaurant, number="3", seats=8, is_active=True,
        )

    def test_find_best_tables_single_table(self):
        """Should select the smallest suitable table."""
        tables = BookingService.find_best_tables(
            self.restaurant, _tomorrow(), time(19, 0), guests=3
        )
        self.assertEqual(len(tables), 1)
        self.assertEqual(tables[0].id, self.table_medium.id)

    def test_find_best_tables_preferred(self):
        """Should return the preferred table if available and large enough."""
        tables = BookingService.find_best_tables(
            self.restaurant, _tomorrow(), time(19, 0), guests=2,
            preferred_table_id=self.table_large.id
        )
        self.assertEqual(len(tables), 1)
        self.assertEqual(tables[0].id, self.table_large.id)

    def test_find_best_tables_preferred_too_small(self):
        """Should return [] if the preferred table can't fit the guests."""
        tables = BookingService.find_best_tables(
            self.restaurant, _tomorrow(), time(19, 0), guests=3,
            preferred_table_id=self.table_small.id
        )
        self.assertEqual(tables, [])

    def test_find_best_tables_combines_for_large_party(self):
        """Should combine tables if no single table fits the party."""
        tables = BookingService.find_best_tables(
            self.restaurant, _tomorrow(), time(19, 0), guests=10
        )
        # 8 + 4 = 12 >= 10 — should combine the large and medium tables
        self.assertGreater(len(tables), 1)
        total_seats = sum(t.seats for t in tables)
        self.assertGreaterEqual(total_seats, 10)

    def test_find_best_tables_occupied_excluded(self):
        """Occupied tables should be excluded from allocation."""
        Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table_medium,
            date=_tomorrow(),
            time=time(19, 0),
            guests=3,
            duration_minutes=90,
            status=Booking.APPROVED,
        )
        tables = BookingService.find_best_tables(
            self.restaurant, _tomorrow(), time(19, 0), guests=3
        )
        # table_medium is occupied, should get table_large instead
        self.assertEqual(len(tables), 1)
        self.assertEqual(tables[0].id, self.table_large.id)

    def test_check_capacity_within_limit(self):
        ok, _ = BookingService.check_capacity(
            self.restaurant, _tomorrow(), time(19, 0), guests=5
        )
        self.assertTrue(ok)

    def test_check_capacity_exceeds_limit(self):
        # Fill up capacity
        Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table_large,
            date=_tomorrow(),
            time=time(19, 0),
            guests=18,
            duration_minutes=90,
            status=Booking.APPROVED,
        )
        ok, remaining = BookingService.check_capacity(
            self.restaurant, _tomorrow(), time(19, 0), guests=5
        )
        self.assertFalse(ok)
        self.assertEqual(remaining, 2)

    def test_confirm_booking_service(self):
        booking = Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table_small,
            date=_tomorrow(),
            time=time(19, 0),
            guests=2,
            status=Booking.PENDING,
        )
        result, error = BookingService.confirm_booking(booking.id, actor=self.user)
        self.assertIsNone(error)
        self.assertEqual(result.status, Booking.APPROVED)

    def test_reject_booking_service(self):
        booking = Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table_small,
            date=_tomorrow(),
            time=time(19, 0),
            guests=2,
            status=Booking.PENDING,
        )
        result, error = BookingService.reject_booking(booking.id, actor=self.user)
        self.assertIsNone(error)
        self.assertEqual(result.status, Booking.REJECTED)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
)
class BookingAPITests(TestCase):
    """Tests for the Booking REST API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user("owner", "owner@test.com", "pass1234")
        self.customer = User.objects.create_user("customer", "customer@test.com", "pass1234")

        # Set up profiles
        self.owner.profile.role = "owner"
        self.owner.profile.save()
        self.customer.profile.role = "customer"
        self.customer.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="API Test Restaurant",
            address="API Test Address",
            latitude=43.238949,
            longitude=76.889709,
            is_verified=True,
            owner=self.owner,
            capacity=50,
        )
        self.owner.profile.restaurant = self.restaurant
        self.owner.profile.save()

        self.table = Table.objects.create(
            restaurant=self.restaurant, number="A1", seats=4, is_active=True,
        )

    def _create_booking(self, user=None, **overrides):
        """Helper to create a booking via the API."""
        user = user or self.customer
        self.client.force_authenticate(user=user)
        data = {
            "restaurant": self.restaurant.id,
            "date": str(_tomorrow()),
            "time": "19:00",
            "guests": 2,
            "user_name": "Test Guest",
            "user_phone": "+77001112233",
        }
        data.update(overrides)
        return self.client.post("/api/v1/bookings/", data, format="json")

    def test_create_booking_success(self):
        res = self._create_booking()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", res.data)
        self.assertEqual(Booking.objects.count(), 1)

    def test_create_booking_past_date_fails(self):
        yesterday = date.today() - timedelta(days=1)
        res = self._create_booking(date=str(yesterday))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_booking(self):
        """Owner confirms a pending booking."""
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        confirm_res = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        booking = Booking.objects.get(id=booking_id)
        self.assertEqual(booking.status, Booking.APPROVED)

    def test_reject_booking(self):
        """Owner rejects a pending booking."""
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        reject_res = self.client.post(f"/api/v1/bookings/{booking_id}/reject/")
        self.assertEqual(reject_res.status_code, status.HTTP_200_OK)

        booking = Booking.objects.get(id=booking_id)
        self.assertEqual(booking.status, Booking.REJECTED)

    def test_cancel_booking_by_user(self):
        """Customer cancels their own booking."""
        res = self._create_booking()
        booking_id = res.data["id"]

        # First confirm it
        self.client.force_authenticate(user=self.owner)
        self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")

        # Customer cancels
        self.client.force_authenticate(user=self.customer)
        cancel_res = self.client.delete(f"/api/v1/bookings/{booking_id}/")
        self.assertEqual(cancel_res.status_code, status.HTTP_204_NO_CONTENT)

        booking = Booking.objects.get(id=booking_id)
        self.assertEqual(booking.status, Booking.CANCELLED_BY_USER)

    def test_public_booking_lookup_and_cancel_by_token(self):
        """Public token should allow lookup and self-service cancellation without auth."""
        res = self._create_booking()
        booking_id = res.data["id"]
        booking = Booking.objects.get(id=booking_id)

        self.client.force_authenticate(user=None)
        lookup_res = self.client.get(f"/api/v1/bookings/public/{booking.public_token}/")
        self.assertEqual(lookup_res.status_code, status.HTTP_200_OK)
        self.assertEqual(lookup_res.data["public_token"], booking.public_token)
        self.assertEqual(lookup_res.data["restaurant_name"], self.restaurant.name)
        self.assertIn("rebook_payload", lookup_res.data)
        self.assertEqual(lookup_res.data["rebook_payload"]["restaurant_id"], self.restaurant.id)
        self.assertFalse(lookup_res.data["can_review"])

        cancel_res = self.client.delete(f"/api/v1/bookings/public/{booking.public_token}/")
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.CANCELLED_BY_USER)

    def test_completed_booking_exposes_review_and_rebook_context(self):
        """Completed bookings must expose review eligibility and repeat-booking payload."""
        res = self._create_booking()
        booking_id = res.data["id"]
        booking = Booking.objects.get(id=booking_id)
        booking.status = Booking.COMPLETED
        booking.save(update_fields=["status"])

        self.client.force_authenticate(user=self.customer)
        detail = self.client.get(f"/api/v1/bookings/{booking_id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertTrue(detail.data["can_review"])
        self.assertIn("rebook_payload", detail.data)
        self.assertEqual(detail.data["rebook_payload"]["booking_id"], booking_id)
        self.assertEqual(detail.data["rebook_payload"]["restaurant_id"], self.restaurant.id)
        self.assertEqual(detail.data["rebook_payload"]["guests"], 2)

        public_detail = self.client.get(f"/api/v1/bookings/public/{booking.public_token}/")
        self.assertEqual(public_detail.status_code, status.HTTP_200_OK)
        self.assertTrue(public_detail.data["can_review"])
        self.assertEqual(public_detail.data["rebook_payload"]["booking_id"], booking_id)

    def test_my_restaurant_does_not_crash_when_customer_profile_missing(self):
        """Serializer should handle missing booking.user.profile safely."""
        res = self._create_booking()
        booking_id = res.data["id"]
        booking = Booking.objects.get(id=booking_id)
        booking.status = Booking.COMPLETED
        booking.save(update_fields=["status"])

        Profile.objects.filter(user=self.customer).delete()

        self.client.force_authenticate(user=self.owner)
        detail = self.client.get(f"/api/v1/bookings/{booking_id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["id"], booking_id)
        self.assertIn("rebook_payload", detail.data)

    def test_double_confirm_fails(self):
        """Confirming an already confirmed booking should fail."""
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")

        # Try to confirm again
        second = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_my_restaurant_endpoint(self):
        """Owner can see their restaurant's bookings."""
        self._create_booking()

        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/bookings/my_restaurant/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data if isinstance(res.data, list) else res.data.get("results", [])
        self.assertEqual(len(data), 1)

    def test_my_restaurant_limit(self):
        """my_restaurant supports limit param (used by Dashboard)."""
        # Create multiple bookings
        self._create_booking(time="18:00")
        self._create_booking(time="19:00")
        self._create_booking(time="20:00")

        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/bookings/my_restaurant/?limit=2")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data if isinstance(res.data, list) else res.data.get("results", [])
        self.assertEqual(len(data), 2)

    def test_my_restaurant_filters_by_date_and_time(self):
        """my_restaurant supports date + time_from/time_to filters."""
        target_date = str(_tomorrow())

        # Create two bookings on same date, different times
        r1 = self._create_booking(date=target_date, time="18:00")
        r2 = self._create_booking(date=target_date, time="21:00")
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(
            "/api/v1/bookings/my_restaurant/?date=" + target_date + "&time_from=20:00"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data if isinstance(res.data, list) else res.data.get("results", [])
        ids = {row["id"] for row in data}
        self.assertIn(r2.data["id"], ids)
        self.assertNotIn(r1.data["id"], ids)

    def test_reschedule_booking(self):
        """Owner can reschedule an active booking and the booking is reallocated."""
        res = self._create_booking(time="19:00")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        booking_id = res.data["id"]

        # Confirm first so it's in active flow from restaurant perspective
        self.client.force_authenticate(user=self.owner)
        confirm_res = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        # Reschedule to a new time
        reschedule_res = self.client.post(
            f"/api/v1/bookings/{booking_id}/reschedule/",
            {"date": str(_tomorrow()), "time": "20:00", "duration_minutes": 90},
            format="json",
        )
        self.assertEqual(reschedule_res.status_code, status.HTTP_200_OK)

        booking = Booking.objects.get(id=booking_id)
        self.assertEqual(booking.time, time(20, 0))
        self.assertTrue(booking.table_id)

    def test_check_in_booking(self):
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        confirm_res = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        check_in_res = self.client.post(f"/api/v1/bookings/{booking_id}/check_in/")
        self.assertEqual(check_in_res.status_code, status.HTTP_200_OK)

        booking = Booking.objects.get(id=booking_id)
        self.assertTrue(booking.is_checked_in)
        self.assertIsNotNone(booking.check_in_time)

    def test_cancel_by_restaurant(self):
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        confirm_res = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        cancel_res = self.client.post(f"/api/v1/bookings/{booking_id}/cancel_by_restaurant/")
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        booking = Booking.objects.get(id=booking_id)
        self.assertEqual(booking.status, Booking.CANCELLED_BY_RESTAURANT)

    def test_complete_booking(self):
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        confirm_res = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        with patch("crm.services.CRMService.record_visit") as record_visit:
            complete_res = self.client.post(f"/api/v1/bookings/{booking_id}/complete/")
            self.assertEqual(complete_res.status_code, status.HTTP_200_OK)
            self.assertTrue(record_visit.called)

        booking = Booking.objects.get(id=booking_id)
        self.assertEqual(booking.status, Booking.COMPLETED)

    def test_no_show_booking(self):
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        confirm_res = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        no_show_res = self.client.post(f"/api/v1/bookings/{booking_id}/no_show/")
        self.assertEqual(no_show_res.status_code, status.HTTP_200_OK)

        booking = Booking.objects.get(id=booking_id)
        self.assertEqual(booking.status, Booking.NO_SHOW)

    def test_reassign_table_booking(self):
        res = self._create_booking()
        booking_id = res.data["id"]

        replacement_table = Table.objects.create(
            restaurant=self.restaurant,
            number="B2",
            seats=4,
            is_active=True,
        )

        self.client.force_authenticate(user=self.owner)
        confirm_res = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        reassign_res = self.client.post(
            f"/api/v1/bookings/{booking_id}/reassign_table/",
            {"table_id": replacement_table.id},
            format="json",
        )
        self.assertEqual(reassign_res.status_code, status.HTTP_200_OK)

        booking = Booking.objects.get(id=booking_id)
        self.assertEqual(booking.table_id, replacement_table.id)
        self.assertEqual(list(booking.tables.values_list("id", flat=True)), [replacement_table.id])

    def test_smart_tables_returns_suggestions(self):
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        smart_res = self.client.get(f"/api/v1/bookings/{booking_id}/smart_tables/")
        self.assertEqual(smart_res.status_code, status.HTTP_200_OK)
        self.assertIn("suggested_tables", smart_res.data)
        self.assertIn("turnover_minutes", smart_res.data)

    def test_list_filters_by_time_and_table(self):
        """List endpoint supports filtering by time range and table."""
        # Create base table and an extra table so that we can
        # have bookings on different physical tables.
        res1 = self._create_booking(time="18:00")
        res2 = self._create_booking(time="21:00")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        b1 = Booking.objects.get(id=res1.data["id"])
        b2 = Booking.objects.get(id=res2.data["id"])

        # Force the second booking onto a different table so that
        # filtering by table_id can distinguish between them.
        second_table = Table.objects.create(
            restaurant=self.restaurant, number="A2", seats=4, is_active=True,
        )
        b2.table = second_table
        b2.save(update_fields=["table"])
        # Ensure M2M legacy relation also points to the second table only
        b2.tables.set([second_table])

        self.client.force_authenticate(user=self.owner)

        # Filter time range that should include only the later booking
        resp = self.client.get("/api/v1/bookings/", {"date": str(_tomorrow()), "time_from": "20:00"})
        data = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        ids = {row["id"] for row in data}
        self.assertIn(b2.id, ids)
        self.assertNotIn(b1.id, ids)

        # Filter by table_id
        resp2 = self.client.get("/api/v1/bookings/", {"table_id": b1.table_id})
        data2 = resp2.data if isinstance(resp2.data, list) else resp2.data.get("results", [])
        ids2 = {row["id"] for row in data2}
        self.assertIn(b1.id, ids2)
        self.assertNotIn(b2.id, ids2)

    def test_unauthenticated_can_create(self):
        """Unauthenticated users can create public bookings."""
        self.client.force_authenticate(user=None)
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant.id,
            "date": str(_tomorrow()),
            "time": "19:00",
            "guests": 2,
            "user_name": "Guest",
            "user_phone": "+77000000000",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_staff_can_create_walk_in_waitlist_entry(self):
        """Restaurant staff should be able to create an anonymous walk-in waitlist entry through the existing waitlist endpoint."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            "/api/v1/bookings/waitlist/",
            {
                "restaurant": self.restaurant.id,
                "date": str(_tomorrow()),
                "time": "18:30",
                "guests": 2,
                "guest_name": "Walk-in Guest",
                "guest_phone": "+77001112233",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        entry = WaitlistEntry.objects.get(id=response.data["id"])
        self.assertEqual(entry.restaurant_id, self.restaurant.id)
        self.assertIsNone(entry.user_id)
        self.assertEqual(entry.guest_name, "Walk-in Guest")
        self.assertEqual(entry.guest_phone, "+77001112233")

    def test_waitlist_convert_returns_redirect_context(self):
        """Converting a waitlist entry should return enough context for the frontend to redirect to the created booking."""
        self.client.force_authenticate(user=self.owner)
        create_res = self.client.post(
            "/api/v1/bookings/waitlist/",
            {
                "restaurant": self.restaurant.id,
                "date": str(_tomorrow()),
                "time": "18:45",
                "guests": 2,
                "guest_name": "Walk-in Guest",
                "guest_phone": "+77003334455",
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)

        entry_id = create_res.data["id"]
        convert_res = self.client.post(f"/api/v1/bookings/waitlist/{entry_id}/convert-to-reservation/")
        self.assertEqual(convert_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(convert_res.data["id"], convert_res.data["booking_id"])
        self.assertEqual(convert_res.data["waitlist_id"], entry_id)
        self.assertEqual(convert_res.data["redirect_to"], f"/app/bookings?id={convert_res.data['booking_id']}")
        self.assertIn("public_token", convert_res.data)

        booking = Booking.objects.get(id=convert_res.data["booking_id"])
        self.assertEqual(convert_res.data["public_token"], booking.public_token)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
)
class OnboardingFlowTests(TestCase):
    """Tests for the restaurant owner onboarding flow."""

    def setUp(self):
        self.client = APIClient()

    def test_register_owner_creates_request(self):
        """Registering as 'owner' with a restaurant_name should create a RestaurantRequest."""
        from restaurants.models import RestaurantRequest

        res = self.client.post("/api/v1/auth/register/", {
            "username": "newowner",
            "email": "newowner@test.com",
            "password": "StrongPass123",
            "password2": "StrongPass123",
            "role": "owner",
            "restaurant_name": "New Bistro",
            "phone": "+77771112233",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username="newowner")
        req = RestaurantRequest.objects.filter(owner=user).first()
        self.assertIsNotNone(req)
        self.assertEqual(req.name, "New Bistro")
        self.assertEqual(req.status, "pending")

    def test_approve_request_creates_restaurant(self):
        """Approving a RestaurantRequest should create a Restaurant and link it to the user."""
        from restaurants.models import RestaurantRequest, Restaurant
        from restaurants.services import RestaurantService

        user = User.objects.create_user("reqowner", "reqowner@test.com", "pass1234")
        user.profile.role = "owner"
        user.profile.save()

        req = RestaurantRequest.objects.create(
            owner=user,
            name="Approval Test",
            city="Almaty",
            phone="+77001234567",
            email="reqowner@test.com",
            admin_username="reqowner",
            status="pending",
        )

        result, error = RestaurantService.approve_request(req.id)
        self.assertIsNone(error)
        self.assertIsNotNone(result)

        restaurant = result["restaurant"]
        self.assertEqual(restaurant.name, "Approval Test")
        self.assertTrue(restaurant.is_verified)

        user.refresh_from_db()
        self.assertEqual(user.profile.restaurant, restaurant)

    def test_approve_already_approved_fails(self):
        """Approving a non-pending request should fail."""
        from restaurants.models import RestaurantRequest
        from restaurants.services import RestaurantService

        user = User.objects.create_user("reqowner2", "req2@test.com", "pass1234")
        req = RestaurantRequest.objects.create(
            owner=user,
            name="Already Approved",
            city="Almaty",
            phone="+77001234567",
            email="req2@test.com",
            status="confirmed",
        )

        result, error = RestaurantService.approve_request(req.id)
        self.assertIsNone(result)
        self.assertIn("already", error)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
)
class BookingSerializerContractTests(TestCase):
    """
    Tests that verify the API response contract matches what the frontend expects.
    Specifically: status field values, user_name/user_phone, table_number.
    """

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user("owner_sc", "owner_sc@test.com", "pass1234")
        self.customer = User.objects.create_user("customer_sc", "customer_sc@test.com", "pass1234")
        self.owner.profile.role = "owner"
        self.owner.profile.save()
        self.customer.profile.role = "customer"
        self.customer.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="Contract Test Restaurant",
            address="Test Address",
            latitude=43.0,
            longitude=76.0,
            is_verified=True,
            owner=self.owner,
            capacity=50,
        )
        self.owner.profile.restaurant = self.restaurant
        self.owner.profile.save()

        self.table = Table.objects.create(
            restaurant=self.restaurant, number="T1", seats=4, is_active=True,
        )

    def _create_booking(self, user=None, **overrides):
        user = user or self.customer
        self.client.force_authenticate(user=user)
        data = {
            "restaurant": self.restaurant.id,
            "date": str(_tomorrow()),
            "time": "19:00",
            "guests": 2,
            "user_name": "Test Guest",
            "user_phone": "+77001112233",
        }
        data.update(overrides)
        return self.client.post("/api/v1/bookings/", data, format="json")

    def test_cancelled_by_user_status_not_collapsed(self):
        """cancelled_by_user must be returned as-is, not collapsed to 'cancelled'."""
        res = self._create_booking()
        booking_id = res.data["id"]

        # Confirm then cancel by user
        self.client.force_authenticate(user=self.owner)
        self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")

        self.client.force_authenticate(user=self.customer)
        self.client.delete(f"/api/v1/bookings/{booking_id}/")

        # Fetch via my_restaurant
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/bookings/my_restaurant/")
        data = res.data if isinstance(res.data, list) else res.data.get("results", [])
        booking_data = next(b for b in data if b["id"] == booking_id)
        self.assertEqual(booking_data["status"], "cancelled_by_user")

    def test_cancelled_by_restaurant_status_not_collapsed(self):
        """cancelled_by_restaurant must be returned as-is, not collapsed to 'cancelled'."""
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.client.post(f"/api/v1/bookings/{booking_id}/cancel_by_restaurant/")

        res = self.client.get("/api/v1/bookings/my_restaurant/")
        data = res.data if isinstance(res.data, list) else res.data.get("results", [])
        booking_data = next(b for b in data if b["id"] == booking_id)
        self.assertEqual(booking_data["status"], "cancelled_by_restaurant")

    def test_confirmed_status_serialized_as_confirmed(self):
        """Confirmed booking must return status='confirmed'."""
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        confirm_res = self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        self.assertEqual(confirm_res.data["status"], "confirmed")

    def test_table_number_in_response(self):
        """Booking response must include table_number field."""
        res = self._create_booking()
        self.assertIn("table_number", res.data)

    def test_user_name_and_phone_in_response(self):
        """Booking response must include user_name and user_phone."""
        res = self._create_booking()
        self.assertIn("user_name", res.data)
        self.assertIn("user_phone", res.data)

    def test_normalize_statuses_approved_alias(self):
        """?status=approved filter must return confirmed bookings."""
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        self.client.post(f"/api/v1/bookings/{booking_id}/confirm/")

        res = self.client.get("/api/v1/bookings/my_restaurant/?status=approved")
        data = res.data if isinstance(res.data, list) else res.data.get("results", [])
        ids = {b["id"] for b in data}
        self.assertIn(booking_id, ids)

    def test_my_restaurant_returns_correct_shape(self):
        """my_restaurant must return bookings with all required frontend fields."""
        res = self._create_booking()
        booking_id = res.data["id"]

        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/bookings/my_restaurant/")
        data = res.data if isinstance(res.data, list) else res.data.get("results", [])
        self.assertGreater(len(data), 0)
        booking = data[0]
        for field in ("id", "user_name", "user_phone", "status", "date", "time", "guests", "table_number"):
            self.assertIn(field, booking, f"Missing field: {field}")


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
)
class BookingContractReliabilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user("owner_rel", "owner_rel@test.com", "pass1234")
        self.owner.profile.role = "owner"
        self.owner.profile.save()

        self.customer = User.objects.create_user("customer_rel", "customer_rel@test.com", "pass1234")
        self.customer.profile.role = "customer"
        self.customer.profile.save()

        self.restaurant = Restaurant.objects.create(
            name="Reliability Restaurant",
            address="Ops Street 10",
            latitude=43.24,
            longitude=76.92,
            owner=self.owner,
            is_claimed=True,
            is_verified=True,
            capacity=40,
        )
        self.owner.profile.restaurant = self.restaurant
        self.owner.profile.save()

        Table.objects.create(restaurant=self.restaurant, number="R1", seats=4, is_active=True)

    def test_create_manual_allows_walkin_without_guest_contact(self):
        """Walk-in bookings without user_name/user_phone are allowed (anonymous walk-ins)."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            "/api/v1/bookings/create_manual/",
            {
                "restaurant": self.restaurant.id,
                "date": str(_tomorrow()),
                "time": "18:30",
                "guests": 2,
                # no user_name/user_phone — valid for anonymous walk-in
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_available_slots_returns_stable_shape(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(
            "/api/v1/bookings/available_slots/",
            {
                "restaurant_id": self.restaurant.id,
                "date": str(_tomorrow()),
                "guests": 2,
                "duration_minutes": 90,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("slots", response.data)
        self.assertIn("available_slots", response.data)
        self.assertIn("unavailable_slots", response.data)
        self.assertIn("meta", response.data)
        self.assertEqual(response.data["slots"], response.data["available_slots"])
        self.assertEqual(response.data["meta"]["restaurant_id"], self.restaurant.id)
        self.assertEqual(response.data["meta"]["guests"], 2)
