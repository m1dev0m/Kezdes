from types import SimpleNamespace
from unittest.mock import AsyncMock
from datetime import date, time, timedelta

import pytest
from asgiref.sync import async_to_sync
from django.contrib.auth.models import User

from bookings.consumers import BookingConsumer
from bookings.models import Booking
from restaurants.models import Restaurant


@pytest.fixture
def owner(db):
    user = User.objects.create_user("ws_owner", "owner@test.com", "pass123")
    user.profile.role = "owner"
    user.profile.save()
    return user


@pytest.fixture
def other_owner(db):
    user = User.objects.create_user("ws_other_owner", "other@test.com", "pass123")
    user.profile.role = "owner"
    user.profile.save()
    return user


@pytest.fixture
def viewer(db):
    user = User.objects.create_user("ws_viewer", "viewer@test.com", "pass123")
    user.profile.role = "customer"
    user.profile.save()
    return user


@pytest.fixture
def future_date():
    return date.today() + timedelta(days=7)


@pytest.fixture
def restaurant(owner):
    restaurant = Restaurant.objects.create(
        name="WS Resto",
        address="1 Street",
        city="Almaty",
        owner=owner,
        is_verified=True,
        is_claimed=True,
    )
    owner.profile.restaurant = restaurant
    owner.profile.save()
    return restaurant


@pytest.fixture
def other_restaurant(other_owner):
    restaurant = Restaurant.objects.create(
        name="Other WS Resto",
        address="2 Street",
        city="Almaty",
        owner=other_owner,
        is_verified=True,
        is_claimed=True,
    )
    other_owner.profile.restaurant = restaurant
    other_owner.profile.save()
    return restaurant


@pytest.mark.django_db(transaction=True)
def test_booking_consumer_joins_restaurant_group_for_accessible_booking(owner, restaurant, future_date):
    booking = Booking.objects.create(
        restaurant=restaurant,
        user=owner,
        date=future_date,
        time=time(19, 0),
        guests=2,
        status=Booking.CONFIRMED,
    )

    consumer = BookingConsumer()
    consumer.scope = {"url_route": {"kwargs": {"id": str(booking.id)}}, "user": owner}
    consumer.channel_name = "test-channel"
    consumer.channel_layer = SimpleNamespace(
        group_add=AsyncMock(),
        group_discard=AsyncMock(),
    )
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()

    async_to_sync(consumer.connect)()

    assert consumer.restaurant_id == str(restaurant.id)
    assert consumer.groups_joined == [f"bookings_restaurant_{restaurant.id}"]
    assert consumer.accept.await_count == 1
    consumer.channel_layer.group_add.assert_awaited_once_with(f"bookings_restaurant_{restaurant.id}", "test-channel")


@pytest.mark.django_db(transaction=True)
def test_booking_consumer_returns_none_for_inaccessible_booking(viewer, owner, restaurant, future_date):
    booking = Booking.objects.create(
        restaurant=restaurant,
        user=owner,
        date=future_date,
        time=time(19, 0),
        guests=2,
        status=Booking.CONFIRMED,
    )

    consumer = BookingConsumer()
    result = async_to_sync(consumer.get_restaurant_id_from_booking_if_accessible)(viewer, booking.id)

    assert result is None
