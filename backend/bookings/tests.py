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
from rest_framework.test import APIClient
from rest_framework import status

from .models import Booking, ReservationHistory, WaitlistEntry
from .services import BookingService, WaitlistService
from restaurants.models import Restaurant, Table, OpeningHours


def _tomorrow():
    return date.today() + timedelta(days=1)


class BookingModelTests(TestCase):
    """Tests for Booking model logic."""

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
        """save() should auto-calculate start_datetime and end_datetime."""
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
        """Valid transition: PENDING → APPROVED."""
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

        # History should be created
        history = ReservationHistory.objects.filter(reservation=booking)
        self.assertEqual(history.count(), 1)
        self.assertEqual(history.first().from_status, Booking.PENDING)
        self.assertEqual(history.first().to_status, Booking.APPROVED)

    def test_transition_to_invalid_raises(self):
        """Invalid transition: COMPLETED → APPROVED should raise."""
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
        """Bookings older than TTL should be expired."""
        old_booking = Booking.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            table=self.table,
            date=_tomorrow(),
            time=time(19, 0),
            guests=2,
            status=Booking.PENDING,
        )
        # Manually backdate
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

    def test_unauthenticated_cannot_create(self):
        """Unauthenticated users cannot create bookings."""
        self.client.force_authenticate(user=None)
        res = self.client.post("/api/v1/bookings/", {
            "restaurant": self.restaurant.id,
            "date": str(_tomorrow()),
            "time": "19:00",
            "guests": 2,
        }, format="json")
        self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


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
            status="approved",
        )

        result, error = RestaurantService.approve_request(req.id)
        self.assertIsNone(result)
        self.assertIn("already", error)
