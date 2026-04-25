import pytest
from datetime import date, time, timedelta
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from bookings.models import Booking, WaitlistEntry
from bookings.services import BookingService, WaitlistService
from restaurants.models import Restaurant, Table



@pytest.fixture
def restaurant(db):
    owner = User.objects.create_user("owner_eng", "o@test.com", "pass")
    owner.profile.role = "owner"
    owner.profile.save()
    r = Restaurant.objects.create(
        name="Engine Test Restaurant",
        address="123 Test St",
        city="Almaty",
        owner=owner,
        is_verified=True,
        is_claimed=True,
        capacity=20,
    )
    owner.profile.restaurant = r
    owner.profile.save()
    return r


@pytest.fixture
def tables(restaurant):
    t2 = Table.objects.create(restaurant=restaurant, number="T2", seats=2, is_active=True)
    t4 = Table.objects.create(restaurant=restaurant, number="T4", seats=4, is_active=True)
    t6 = Table.objects.create(restaurant=restaurant, number="T6", seats=6, is_active=True)
    return {"t2": t2, "t4": t4, "t6": t6}


@pytest.fixture
def customer(db):
    u = User.objects.create_user("customer_eng", "c@test.com", "pass")
    u.profile.role = "customer"
    u.profile.save()
    return u


@pytest.fixture
def customer2(db):
    u = User.objects.create_user("customer_eng2", "c2@test.com", "pass")
    u.profile.role = "customer"
    u.profile.save()
    return u


@pytest.fixture
def future_date():
    return date.today() + timedelta(days=7)


def make_booking(restaurant, table, user, booking_date, booking_time, guests=2, duration=90, status='confirmed'):
    b = Booking.objects.create(
        restaurant=restaurant,
        table=table,
        user=user,
        date=booking_date,
        time=booking_time,
        guests=guests,
        duration_minutes=duration,
        status=status,
    )
    b.tables.set([table])
    return b



@pytest.mark.django_db
def test_find_best_tables_picks_smallest_sufficient(restaurant, tables, future_date):
    
    result = BookingService.find_best_tables(restaurant, future_date, time(18, 0), guests=3)
    assert len(result) == 1
    assert result[0].seats == 4


@pytest.mark.django_db
def test_find_best_tables_combines_when_no_single_fits(restaurant, tables, future_date):
    
    result = BookingService.find_best_tables(restaurant, future_date, time(18, 0), guests=7)
    total_seats = sum(t.seats for t in result)
    assert total_seats >= 7
    assert len(result) > 1


@pytest.mark.django_db
def test_find_best_tables_returns_empty_when_impossible(restaurant, tables, future_date):
    
    result = BookingService.find_best_tables(restaurant, future_date, time(18, 0), guests=15)
    assert result == []


@pytest.mark.django_db
def test_find_best_tables_query_count(restaurant, tables, future_date, django_assert_num_queries):
    with django_assert_num_queries(3):
        result = BookingService.find_best_tables(restaurant, future_date, time(18, 0), guests=3)
        assert len(result) == 1



@pytest.mark.django_db
def test_no_overlap_different_times(restaurant, tables, customer, future_date):
    
    make_booking(restaurant, tables["t4"], customer, future_date, time(12, 0), guests=3, duration=90)

    result = BookingService.find_best_tables(restaurant, future_date, time(14, 0), guests=3)
    assert len(result) == 1


@pytest.mark.django_db
def test_overlap_blocks_same_table(restaurant, tables, customer, future_date):
    
    make_booking(restaurant, tables["t4"], customer, future_date, time(18, 0), guests=3, duration=90)

    result = BookingService.find_best_tables(restaurant, future_date, time(18, 30), guests=3)
    assert all(t.id != tables["t4"].id for t in result)


@pytest.mark.django_db
def test_check_capacity_blocks_overbooking(db, restaurant, tables, future_date):
    
    restaurant.capacity = 10
    restaurant.save()

    u1 = User.objects.create_user("cap_u1", "u1@t.com", "pass")
    u2 = User.objects.create_user("cap_u2", "u2@t.com", "pass")
    make_booking(restaurant, tables["t6"], u1, future_date, time(18, 0), guests=6, duration=90)
    make_booking(restaurant, tables["t4"], u2, future_date, time(18, 0), guests=4, duration=90)

    ok, available = BookingService.check_capacity(restaurant, future_date, time(18, 0), guests=1)
    assert ok is False
    assert available == 0


@pytest.mark.django_db
def test_find_best_tables_blocks_when_all_tables_occupied(db, restaurant, tables, future_date):
        u1 = User.objects.create_user("occ_u1", "occ1@t.com", "pass")
    u2 = User.objects.create_user("occ_u2", "occ2@t.com", "pass")
    u3 = User.objects.create_user("occ_u3", "occ3@t.com", "pass")
    make_booking(restaurant, tables["t6"], u1, future_date, time(18, 0), guests=6, duration=90)
    make_booking(restaurant, tables["t4"], u2, future_date, time(18, 0), guests=4, duration=90)
    make_booking(restaurant, tables["t2"], u3, future_date, time(18, 0), guests=2, duration=90)

    result = BookingService.find_best_tables(restaurant, future_date, time(18, 0), guests=1)
    assert result == []



@pytest.mark.django_db
def test_valid_status_transition_pending_to_approved(restaurant, tables, customer, future_date):
    b = make_booking(restaurant, tables["t2"], customer, future_date, time(18, 0), guests=1, status=Booking.PENDING)
    b.transition_to(Booking.APPROVED)
    b.refresh_from_db()
    assert b.status == Booking.APPROVED


@pytest.mark.django_db
def test_invalid_status_transition_raises(restaurant, tables, customer, future_date):
    from django.core.exceptions import ValidationError
    b = make_booking(restaurant, tables["t2"], customer, future_date, time(18, 0), guests=1, status=Booking.COMPLETED)
    with pytest.raises(ValidationError):
        b.transition_to(Booking.APPROVED)


@pytest.mark.django_db
def test_terminal_status_cannot_transition(restaurant, tables, customer, future_date):
    from django.core.exceptions import ValidationError
    for terminal in [Booking.REJECTED, Booking.CANCELLED_BY_USER, Booking.EXPIRED]:
        b = make_booking(restaurant, tables["t2"], customer, future_date, time(18, 0), guests=1, status=terminal)
        with pytest.raises(ValidationError):
            b.transition_to(Booking.APPROVED)



@pytest.mark.django_db
def test_waitlist_promote_skips_when_still_full(db, restaurant, tables, customer2, future_date):
    
    restaurant.capacity = 12
    restaurant.save()

    u1 = User.objects.create_user("wl_u1", "wl1@t.com", "pass")
    u2 = User.objects.create_user("wl_u2", "wl2@t.com", "pass")
    u3 = User.objects.create_user("wl_u3", "wl3@t.com", "pass")
    make_booking(restaurant, tables["t6"], u1, future_date, time(18, 0), guests=6, duration=90)
    make_booking(restaurant, tables["t4"], u2, future_date, time(18, 0), guests=4, duration=90)
    make_booking(restaurant, tables["t2"], u3, future_date, time(18, 0), guests=2, duration=90)

    WaitlistEntry.objects.create(
        user=customer2,
        restaurant=restaurant,
        date=future_date,
        time=time(18, 0),
        guests=2,
        status=WaitlistEntry.WAITING,
    )

    result = WaitlistService.promote_next(restaurant, future_date, time(18, 0))
    assert result is None  # capacity still full, should not promote


@pytest.mark.django_db
def test_waitlist_promote_notifies_when_slot_opens(restaurant, tables, customer, customer2, future_date):
    
    WaitlistEntry.objects.create(
        user=customer2,
        restaurant=restaurant,
        date=future_date,
        time=time(18, 0),
        guests=2,
        status=WaitlistEntry.WAITING,
    )

    result = WaitlistService.promote_next(restaurant, future_date, time(18, 0))
    assert result is not None
    assert result.status == WaitlistEntry.NOTIFIED



@pytest.mark.django_db
def test_reassign_table_to_same_table_works(restaurant, tables, customer, customer2, future_date):
    
    client = APIClient()
    owner = restaurant.owner
    client.force_authenticate(user=owner)

    booking = make_booking(restaurant, tables["t4"], customer, future_date, time(18, 0), guests=3, status=Booking.APPROVED)

    response = client.post(
        f"/api/v1/bookings/{booking.id}/reassign_table/",
        {"table_id": tables["t4"].id},
        format="json",
    )
    assert response.status_code == 200



@pytest.mark.django_db
def test_duration_too_long_rejected(restaurant, customer, future_date):
    
    client = APIClient()
    client.force_authenticate(user=customer)

    response = client.post(
        "/api/v1/bookings/",
        {
            "restaurant": restaurant.id,
            "date": str(future_date),
            "time": "18:00",
            "guests": 2,
            "duration_minutes": 600,
        },
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_duration_too_short_rejected(restaurant, customer, future_date):
    
    client = APIClient()
    client.force_authenticate(user=customer)

    response = client.post(
        "/api/v1/bookings/",
        {
            "restaurant": restaurant.id,
            "date": str(future_date),
            "time": "18:00",
            "guests": 2,
            "duration_minutes": 10,
        },
        format="json",
    )
    assert response.status_code == 400
