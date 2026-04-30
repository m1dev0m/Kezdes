"""
Regression checks for hardening batch (no production code changes).
"""
import datetime
import inspect
from unittest.mock import MagicMock

from django.contrib.auth.models import User
from django.test import RequestFactory, TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from core.models import Profile
from core.utils import get_user_profile
from restaurants.models import Restaurant, Table


def _tomorrow():
    return datetime.date.today() + datetime.timedelta(days=1)


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
)
class PhoneConsistencyRegressionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user("owner_phone", "owner_phone@test.local", "pass1234")
        self.customer = User.objects.create_user("customer_phone", "customer_phone@test.local", "pass1234")

        owner_profile = get_user_profile(self.owner)
        owner_profile.role = "owner"
        owner_profile.save(update_fields=["role"])

        customer_profile = get_user_profile(self.customer)
        customer_profile.role = "customer"
        customer_profile.phone = "+77005556677"
        customer_profile.save(update_fields=["role", "phone"])

        self.restaurant = Restaurant.objects.create(
            name="Phone Regression Rest",
            address="Phone street 1",
            city="Almaty",
            latitude=43.238949,
            longitude=76.889709,
            is_verified=True,
            capacity=60,
            owner=self.owner,
        )
        owner_profile.restaurant = self.restaurant
        owner_profile.save(update_fields=["restaurant"])

        self.table = Table.objects.create(
            restaurant=self.restaurant,
            number="P-1",
            seats=4,
            is_active=True,
        )

    def test_serializer_keeps_manual_phone(self):
        from bookings.serializers import BookingSerializer

        booking = Booking.objects.create(
            user=self.customer,
            restaurant=self.restaurant,
            table=self.table,
            date=_tomorrow(),
            time=datetime.time(19, 0),
            guests=2,
            status=Booking.PENDING,
            user_name="Manual Guest",
            user_phone="+77007778899",
        )
        data = BookingSerializer(booking).data
        self.assertEqual(data["user_phone"], "+77007778899")

    def test_serializer_falls_back_to_profile_phone_when_booking_phone_empty(self):
        from bookings.serializers import BookingSerializer

        booking = Booking.objects.create(
            user=self.customer,
            restaurant=self.restaurant,
            table=self.table,
            date=_tomorrow(),
            time=datetime.time(20, 0),
            guests=2,
            status=Booking.PENDING,
            user_name="Fallback Guest",
            user_phone="",
        )
        data = BookingSerializer(booking).data
        self.assertEqual(data["user_phone"], "+77005556677")

    def test_create_booking_uses_profile_phone_as_fallback(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.restaurant.id,
                "date": str(_tomorrow()),
                "time": "19:00",
                "guests": 2,
                "user_name": "Fallback API",
                "user_phone": "",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        booking = Booking.objects.get(id=response.data["id"])
        self.assertEqual(booking.user_phone, "+77005556677")
        self.assertEqual(response.data.get("user_phone"), "+77005556677")


class GuardedProfileLookupRegressionTests(TestCase):
    def test_get_user_profile_returns_none_when_profile_deleted(self):
        user = User.objects.create_user("no_profile", "no_profile@test.local", "pass1234")
        Profile.objects.filter(user=user).delete()
        self.assertIsNone(get_user_profile(user))

    def test_admin_booking_serializer_resolves_restaurant_with_authenticated_user(self):
        from bookings.serializers import AdminBookingSerializer

        admin = User.objects.create_user("admin_validate", "admin_validate@test.local", "pass1234")
        profile = get_user_profile(admin)
        profile.role = "owner"
        profile.save(update_fields=["role"])

        restaurant = Restaurant.objects.create(
            name="Validate Rest",
            address="Validate street",
            city="Almaty",
            latitude=43.2,
            longitude=76.9,
            owner=admin,
            is_verified=True,
        )
        profile.restaurant = restaurant
        profile.save(update_fields=["restaurant"])

        request = RequestFactory().post("/api/v1/bookings/create_manual/")
        request.user = admin

        serializer = AdminBookingSerializer(
            data={
                "user_name": "Test",
                "user_phone": "+77001234567",
                "date": str(_tomorrow()),
                "time": "18:00",
                "guests": 2,
            },
            context={"request": request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["restaurant"].id, restaurant.id)


class ChatSafetyRegressionTests(TestCase):
    def test_is_restaurant_staff_safe_without_profile_attribute(self):
        from chat.consumers import ChatConsumer

        consumer = ChatConsumer()
        user = MagicMock()
        user.id = 999

        # Should not raise even when _profile was never initialized on the object.
        result = consumer._is_restaurant_staff(user, restaurant_id=1, owner_id=888)
        self.assertFalse(result)

    def test_is_restaurant_staff_true_for_global_admin_profile(self):
        from chat.consumers import ChatConsumer

        consumer = ChatConsumer()
        consumer._profile = MagicMock(role="global_admin", restaurant_id=None)
        user = MagicMock()
        user.id = 777
        self.assertTrue(consumer._is_restaurant_staff(user, restaurant_id=3, owner_id=123))


class ExposureAndPaginationRegressionTests(TestCase):
    def test_staff_serializer_does_not_expose_email(self):
        from restaurants.serializers import StaffSerializer

        user = User.objects.create_user("staff_reg", "staff_reg@test.local", "pass1234")
        profile = get_user_profile(user)
        profile.role = "manager"
        profile.save(update_fields=["role"])

        data = StaffSerializer(user).data
        self.assertNotIn("email", data)
        self.assertEqual(data["role"], "manager")

    def test_restaurant_list_serializer_excludes_admin_subscription_fields(self):
        from restaurants.serializers import RestaurantListSerializer

        fields = set(RestaurantListSerializer.Meta.fields)
        hidden_fields = {
            "plan",
            "payment_status",
            "current_period_starts_at",
            "current_period_ends_at",
            "grace_until",
            "status",
            "source",
            "deposit_min_guests",
            "deposit_amount_per_guest",
            "turnover_default_min",
            "floor",
            "entrance",
            "extra_address_info",
            # Operational fields stripped in payload-slim pass
            "phone",
            "is_claimed",
        }
        self.assertTrue(fields.isdisjoint(hidden_fields), fields.intersection(hidden_fields))

    def test_pagination_caps_are_500(self):
        from core.viewsets import OptionalPaginationMixin
        from bookings.views import BookingViewSet

        optional_src = inspect.getsource(OptionalPaginationMixin.list)
        booking_src = inspect.getsource(BookingViewSet._apply_response_pagination)

        self.assertIn("[:500]", optional_src)
        self.assertNotIn("[:2000]", optional_src)
        self.assertIn("[:500]", booking_src)
        self.assertNotIn("[:2000]", booking_src)
