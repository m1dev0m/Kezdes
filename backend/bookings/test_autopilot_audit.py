import pytest
from datetime import date, time
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from bookings.models import Booking
from restaurants.models import Restaurant, Table



@pytest.fixture
def owner(db):
    u = User.objects.create_user("audit_owner", "owner@test.com", "pass")
    u.profile.role = "owner"
    u.profile.save()
    return u


@pytest.fixture
def restaurant(db, owner):
    r = Restaurant.objects.create(
        name="Audit Restaurant",
        address="1 Audit St",
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
def restaurant2(db):
    
    owner2 = User.objects.create_user("audit_owner2", "owner2@test.com", "pass")
    owner2.profile.role = "owner"
    owner2.profile.save()
    r = Restaurant.objects.create(
        name="Other Restaurant",
        address="2 Other St",
        city="Almaty",
        owner=owner2,
        is_verified=True,
        is_claimed=True,
        capacity=10,
    )
    owner2.profile.restaurant = r
    owner2.profile.save()
    return r


@pytest.fixture
def table4(db, restaurant):
    return Table.objects.create(restaurant=restaurant, number="A1", seats=4, is_active=True)


@pytest.fixture
def table4b(db, restaurant):
    return Table.objects.create(restaurant=restaurant, number="A2", seats=4, is_active=True)


@pytest.fixture
def manager(db, restaurant):
    u = User.objects.create_user("audit_manager", "mgr@test.com", "pass")
    u.profile.role = "manager"
    u.profile.restaurant = restaurant
    u.profile.save()
    return u


@pytest.fixture
def host(db, restaurant):
    u = User.objects.create_user("audit_host", "host@test.com", "pass")
    u.profile.role = "host"
    u.profile.restaurant = restaurant
    u.profile.save()
    return u


@pytest.fixture
def guest_user(db):
    u = User.objects.create_user("audit_guest", "guest@test.com", "pass")
    return u


def make_booking(restaurant, table, guests=2, bdate=None, btime=None, status=Booking.PENDING):
    bdate = bdate or date(2030, 6, 15)
    btime = btime or time(18, 0)
    b = Booking.objects.create(
        restaurant=restaurant,
        table=table,
        guests=guests,
        date=bdate,
        time=btime,
        duration_minutes=90,
        status=status,
        user_name="Test Guest",
    )
    b.tables.set([table])
    return b



class TestOverlap:
    def test_booking_on_occupied_slot_returns_400(self, db, restaurant, table4, owner):
        
        make_booking(restaurant, table4, guests=2, status=Booking.APPROVED)

        client = APIClient()
        client.force_authenticate(user=owner)
        payload = {
            "restaurant": restaurant.id,
            "table": table4.id,
            "date": "2030-06-15",
            "time": "18:30",  # overlaps with 18:00–19:30
            "guests": 2,
            "duration_minutes": 90,
        }
        resp = client.post("/api/v1/bookings/", payload, format="json")
        assert resp.status_code == 400, resp.data

    def test_adjacent_booking_is_allowed(self, db, restaurant, table4, owner):
        
        make_booking(restaurant, table4, guests=2, btime=time(18, 0), status=Booking.APPROVED)

        client = APIClient()
        client.force_authenticate(user=owner)
        payload = {
            "restaurant": restaurant.id,
            "table": table4.id,
            "date": "2030-06-15",
            "time": "19:30",  # starts exactly when first ends
            "guests": 2,
            "duration_minutes": 90,
        }
        resp = client.post("/api/v1/bookings/", payload, format="json")
        assert resp.status_code in (200, 201), resp.data

    def test_different_table_same_time_is_allowed(self, db, restaurant, table4, table4b, owner):
        
        make_booking(restaurant, table4, guests=2, status=Booking.APPROVED)

        client = APIClient()
        client.force_authenticate(user=owner)
        payload = {
            "restaurant": restaurant.id,
            "table": table4b.id,
            "date": "2030-06-15",
            "time": "18:00",
            "guests": 2,
            "duration_minutes": 90,
        }
        resp = client.post("/api/v1/bookings/", payload, format="json")
        assert resp.status_code in (200, 201), resp.data



class TestCapacity:
    def test_over_capacity_returns_400(self, db, restaurant, table4, owner):
        
        client = APIClient()
        client.force_authenticate(user=owner)
        payload = {
            "restaurant": restaurant.id,
            "table": table4.id,
            "date": "2030-06-16",
            "time": "18:00",
            "guests": 10,  # table4 has 4 seats
            "duration_minutes": 90,
        }
        resp = client.post("/api/v1/bookings/", payload, format="json")
        assert resp.status_code == 400, resp.data

    def test_exact_capacity_is_allowed(self, db, restaurant, table4, owner):
        
        client = APIClient()
        client.force_authenticate(user=owner)
        payload = {
            "restaurant": restaurant.id,
            "table": table4.id,
            "date": "2030-06-17",
            "time": "18:00",
            "guests": 4,  # exactly 4 seats
            "duration_minutes": 90,
        }
        resp = client.post("/api/v1/bookings/", payload, format="json")
        assert resp.status_code in (200, 201), resp.data



class TestPermissions:
    def test_host_cannot_delete_restaurant(self, db, restaurant, host):
        
        client = APIClient()
        client.force_authenticate(user=host)
        resp = client.delete(f"/api/v1/restaurants/{restaurant.id}/")
        assert resp.status_code in (403, 405), resp.data

    def test_manager_cannot_see_other_restaurant_bookings(self, db, restaurant, restaurant2, manager, table4):
        
        other_table = Table.objects.create(
            restaurant=restaurant2, number="B1", seats=4, is_active=True
        )
        make_booking(restaurant2, other_table, guests=2, status=Booking.APPROVED)

        client = APIClient()
        client.force_authenticate(user=manager)
        resp = client.get("/api/v1/bookings/")
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data) if isinstance(resp.data, dict) else resp.data
        for b in results:
            assert b["restaurant"] == restaurant.id, "Manager sees another restaurant's booking"

    def test_owner_can_see_own_restaurant_bookings(self, db, restaurant, owner, table4):
        
        make_booking(restaurant, table4, guests=2, status=Booking.APPROVED)
        client = APIClient()
        client.force_authenticate(user=owner)
        resp = client.get("/api/v1/bookings/")
        assert resp.status_code == 200



class TestBookingFlow:
    def test_full_flow_pending_to_completed(self, db, restaurant, table4, owner):
                client = APIClient()
        client.force_authenticate(user=owner)

        payload = {
            "restaurant": restaurant.id,
            "table": table4.id,
            "date": "2030-06-20",
            "time": "19:00",
            "guests": 2,
            "duration_minutes": 90,
        }
        resp = client.post("/api/v1/bookings/", payload, format="json")
        assert resp.status_code in (200, 201), resp.data
        booking_id = resp.data["id"]
        assert resp.data["status"] == Booking.PENDING

        resp = client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        assert resp.status_code == 200, resp.data
        assert resp.data["status"] == "confirmed"

        resp = client.post(f"/api/v1/bookings/{booking_id}/seat/")
        assert resp.status_code == 200, resp.data
        assert resp.data["status"] == "seated"

        resp = client.post(f"/api/v1/bookings/{booking_id}/complete/")
        assert resp.status_code == 200, resp.data
        assert resp.data["status"] == Booking.COMPLETED

    def test_cannot_skip_to_completed_from_pending(self, db, restaurant, table4, owner):
                booking = make_booking(restaurant, table4, guests=2, status=Booking.PENDING)
        client = APIClient()
        client.force_authenticate(user=owner)
        resp = client.post(f"/api/v1/bookings/{booking.id}/complete/")
        assert resp.status_code == 400, resp.data
