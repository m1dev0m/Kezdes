import pytest
from datetime import date, time, timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework.test import APIClient

from bookings.models import Booking
from restaurants.models import Restaurant, Table, OpeningHours


                                                                                

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def setup(db):
    
    owner = User.objects.create_user("stab_owner", "o@t.com", "pass1234")
    owner.profile.role = "owner"
    owner.profile.save()

    restaurant = Restaurant.objects.create(
        name="Stability Restaurant",
        address="1 Test St",
        owner=owner,
        is_claimed=True,
        is_verified=True,
        capacity=40,
    )
    owner.profile.restaurant = restaurant
    owner.profile.save()

    t1 = Table.objects.create(restaurant=restaurant, number="T1", seats=4)
    t2 = Table.objects.create(restaurant=restaurant, number="T2", seats=4)

                                
    for day in range(7):
        OpeningHours.objects.create(
            restaurant=restaurant,
            day_of_week=day,
            opening_time=time(10, 0),
            closing_time=time(23, 0),
        )

    customer = User.objects.create_user("stab_cust", "c@t.com", "pass1234")
    customer.profile.role = "customer"
    customer.profile.save()

    return owner, restaurant, t1, t2, customer


def _tomorrow():
    return (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")


                                                                                

@pytest.mark.django_db
class TestRaceCondition:

    def test_lock_prevents_double_booking(self, setup):
        owner, restaurant, t1, t2, customer = setup
        tomorrow = _tomorrow()

                                                                    
        with patch("bookings.services.BookingService.acquire_booking_lock") as mock_lock:
                                               
            mock_lock.side_effect = [True, False]

            client1 = APIClient()
            client1.force_authenticate(user=customer)

            payload = {
                "restaurant": restaurant.id,
                "date": tomorrow,
                "time": "19:00",
                "guests": 2,
                "duration_minutes": 90,
            }

                                           
            mock_lock.return_value = True
            mock_lock.side_effect = None
            r1 = client1.post("/api/v1/bookings/", payload)
            assert r1.status_code == 201, r1.data

                                          
            customer2 = User.objects.create_user("stab_cust2", "c2@t.com", "pass1234")
            customer2.profile.role = "customer"
            customer2.profile.save()
            client2 = APIClient()
            client2.force_authenticate(user=customer2)

            mock_lock.return_value = False
            r2 = client2.post("/api/v1/bookings/", payload)
            assert r2.status_code in (400, 409), r2.data

    def test_capacity_blocks_overbooking(self, setup):
        
        owner, restaurant, t1, t2, customer = setup
                                               
        restaurant.capacity = 4
        restaurant.save()
        tomorrow = _tomorrow()

        c1 = APIClient()
        c1.force_authenticate(user=customer)
        r1 = c1.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": tomorrow,
            "time": "19:00",
            "guests": 4,
            "duration_minutes": 90,
        })
        assert r1.status_code == 201, r1.data

        customer2 = User.objects.create_user("cap_cust2", "cap2@t.com", "pass1234")
        customer2.profile.role = "customer"
        customer2.profile.save()
        c2 = APIClient()
        c2.force_authenticate(user=customer2)
        r2 = c2.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": tomorrow,
            "time": "19:00",
            "guests": 2,
            "duration_minutes": 90,
        })
        assert r2.status_code == 400
        assert "вместимост" in str(r2.data).lower() or "guests" in str(r2.data).lower()


                                                                               

@pytest.mark.django_db
class TestIdempotency:

    def test_same_key_returns_same_booking(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=customer)
        tomorrow = _tomorrow()

        payload = {
            "restaurant": restaurant.id,
            "date": tomorrow,
            "time": "18:00",
            "guests": 2,
            "duration_minutes": 90,
        }
        key = "idem-test-key-abc123"

        r1 = client.post("/api/v1/bookings/", payload, HTTP_IDEMPOTENCY_KEY=key)
        assert r1.status_code == 201, r1.data
        booking_id = r1.data["id"]

                                                                                 
        r2 = client.post("/api/v1/bookings/", payload, HTTP_IDEMPOTENCY_KEY=key)
        assert r2.status_code in (200, 201)
        assert r2.data["id"] == booking_id

                                       
        assert Booking.objects.filter(
            user=customer, restaurant=restaurant, date=tomorrow, time="18:00:00"
        ).count() == 1

    def test_different_keys_create_different_bookings(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=customer)
        tomorrow = _tomorrow()

        r1 = client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": tomorrow,
            "time": "14:00",
            "guests": 2,
            "duration_minutes": 90,
        }, HTTP_IDEMPOTENCY_KEY="key-A")
        assert r1.status_code == 201

                                                 
        day_after = (date.today() + timedelta(days=2)).strftime("%Y-%m-%d")
        r2 = client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": day_after,
            "time": "14:00",
            "guests": 2,
            "duration_minutes": 90,
        }, HTTP_IDEMPOTENCY_KEY="key-B")
        assert r2.status_code == 201
        assert r1.data["id"] != r2.data["id"]


                                                                                

@pytest.mark.django_db
class TestIntegrityRollback:

    def test_unique_constraint_prevents_duplicate_slot(self, setup):
        owner, restaurant, t1, t2, customer = setup
        tomorrow = _tomorrow()

        Booking.objects.create(
            user=customer,
            restaurant=restaurant,
            date=tomorrow,
            time=time(20, 0),
            guests=2,
            duration_minutes=90,
            status=Booking.CONFIRMED,
        )

        client = APIClient()
        client.force_authenticate(user=customer)
        r = client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": tomorrow,
            "time": "20:00",
            "guests": 2,
            "duration_minutes": 90,
        })
                                                           
        assert r.status_code in (400, 409), r.data

    def test_db_check_constraint_guests_min(self, setup):
        
        owner, restaurant, t1, t2, customer = setup
        with pytest.raises((IntegrityError, Exception)):
            Booking.objects.create(
                user=customer,
                restaurant=restaurant,
                date=date.today() + timedelta(days=1),
                time=time(19, 0),
                guests=0,                              
                duration_minutes=90,
                status=Booking.PENDING,
            )

    def test_db_check_constraint_guests_max(self, setup):
        
        owner, restaurant, t1, t2, customer = setup
        with pytest.raises((IntegrityError, Exception)):
            Booking.objects.create(
                user=customer,
                restaurant=restaurant,
                date=date.today() + timedelta(days=1),
                time=time(19, 0),
                guests=21,                               
                duration_minutes=90,
                status=Booking.PENDING,
            )

    def test_db_check_constraint_duration_min(self, setup):
        
        owner, restaurant, t1, t2, customer = setup
        with pytest.raises((IntegrityError, Exception)):
            Booking.objects.create(
                user=customer,
                restaurant=restaurant,
                date=date.today() + timedelta(days=1),
                time=time(19, 0),
                guests=2,
                duration_minutes=10,                                 
                status=Booking.PENDING,
            )

    def test_db_check_constraint_duration_max(self, setup):
        
        owner, restaurant, t1, t2, customer = setup
        with pytest.raises((IntegrityError, Exception)):
            Booking.objects.create(
                user=customer,
                restaurant=restaurant,
                date=date.today() + timedelta(days=1),
                time=time(19, 0),
                guests=2,
                duration_minutes=481,                                  
                status=Booking.PENDING,
            )


                                                                               

@pytest.mark.django_db
class TestTableStatus:

    def test_valid_date_time_returns_200(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.get("/api/v1/tables/status/", {
            "date": _tomorrow(),
            "time": "19:00",
        })
        assert r.status_code == 200
        assert isinstance(r.data, list)
        assert len(r.data) == 2             

    def test_no_params_uses_now(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.get("/api/v1/tables/status/")
        assert r.status_code == 200

    def test_invalid_date_returns_400(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.get("/api/v1/tables/status/", {
            "date": "not-a-date",
            "time": "19:00",
        })
        assert r.status_code == 400

    def test_invalid_time_returns_400(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.get("/api/v1/tables/status/", {
            "date": _tomorrow(),
            "time": "99:99",
        })
        assert r.status_code == 400

    def test_booked_table_shows_reserved(self, setup):
        owner, restaurant, t1, t2, customer = setup
        tomorrow = date.today() + timedelta(days=1)
        Booking.objects.create(
            user=customer,
            restaurant=restaurant,
            table=t1,
            date=tomorrow,
            time=time(19, 0),
            guests=2,
            duration_minutes=90,
            status=Booking.CONFIRMED,
        )
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.get("/api/v1/tables/status/", {
            "date": tomorrow.strftime("%Y-%m-%d"),
            "time": "19:30",
        })
        assert r.status_code == 200
        statuses = {row["id"]: row["status"] for row in r.data}
        assert statuses[t1.id] == "reserved"
        assert statuses[t2.id] == "free"

    def test_seated_booking_shows_occupied(self, setup):
        owner, restaurant, t1, t2, customer = setup
        tomorrow = date.today() + timedelta(days=1)
        b = Booking.objects.create(
            user=customer,
            restaurant=restaurant,
            table=t1,
            date=tomorrow,
            time=time(19, 0),
            guests=2,
            duration_minutes=90,
            status=Booking.SEATED,
            is_checked_in=True,
        )
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.get("/api/v1/tables/status/", {
            "date": tomorrow.strftime("%Y-%m-%d"),
            "time": "19:30",
        })
        assert r.status_code == 200
        statuses = {row["id"]: row["status"] for row in r.data}
        assert statuses[t1.id] == "occupied"


                                                                               

@pytest.mark.django_db
class TestAvailableSlots:

    def test_slots_within_hours_returned(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=customer)
        r = client.get("/api/v1/bookings/available_slots/", {
            "restaurant_id": restaurant.id,
            "date": _tomorrow(),
            "guests": 2,
        })
        assert r.status_code == 200
        slots = r.data.get("slots", [])
        assert len(slots) > 0
                                                
        for slot in slots:
            h = int(slot[:2])
            assert 10 <= h < 23, f"Slot {slot} outside operating hours"

    def test_closed_day_returns_empty(self, setup):
        owner, restaurant, t1, t2, customer = setup
                                 
        tomorrow_weekday = (date.today() + timedelta(days=1)).weekday()
        OpeningHours.objects.filter(
            restaurant=restaurant, day_of_week=tomorrow_weekday
        ).update(is_closed=True)

        client = APIClient()
        client.force_authenticate(user=customer)
        r = client.get("/api/v1/bookings/available_slots/", {
            "restaurant_id": restaurant.id,
            "date": _tomorrow(),
            "guests": 2,
        })
        assert r.status_code == 200
        slots = r.data.get("slots", [])
        assert slots == [], f"Expected no slots on closed day, got {slots}"

    def test_missing_restaurant_returns_400(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=customer)
        r = client.get("/api/v1/bookings/available_slots/", {
            "date": _tomorrow(),
            "guests": 2,
        })
        assert r.status_code in (400, 404)

    def test_past_date_returns_empty_or_400(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=customer)
        yesterday = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")
        r = client.get("/api/v1/bookings/available_slots/", {
            "restaurant_id": restaurant.id,
            "date": yesterday,
            "guests": 2,
        })
                                                                     
                                                       
        assert r.status_code != 500


                                                                               

@pytest.mark.django_db
class TestPagination:

    def _create_bookings(self, owner, restaurant, customer, n=5):
        bookings = []
        for i in range(n):
            day = date.today() + timedelta(days=i + 1)
            b = Booking.objects.create(
                user=customer,
                restaurant=restaurant,
                date=day,
                time=time(19, 0),
                guests=2,
                duration_minutes=90,
                status=Booking.CONFIRMED,
            )
            bookings.append(b)
        return bookings

    def test_no_pagination_returns_all(self, setup):
        owner, restaurant, t1, t2, customer = setup
        self._create_bookings(owner, restaurant, customer, 5)
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.get("/api/v1/bookings/my_restaurant/")
        assert r.status_code == 200
                                                            
        data = r.data.get("results", r.data) if isinstance(r.data, dict) else r.data
        assert len(data) >= 5

    def test_page_size_limits_results(self, setup):
        owner, restaurant, t1, t2, customer = setup
        self._create_bookings(owner, restaurant, customer, 5)
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.get("/api/v1/bookings/my_restaurant/", {"page": 1, "page_size": 2})
        assert r.status_code == 200
        if isinstance(r.data, dict) and "results" in r.data:
            assert len(r.data["results"]) <= 2
            assert "count" in r.data

    def test_page_2_returns_next_batch(self, setup):
        owner, restaurant, t1, t2, customer = setup
        self._create_bookings(owner, restaurant, customer, 5)
        client = APIClient()
        client.force_authenticate(user=owner)
        r1 = client.get("/api/v1/bookings/my_restaurant/", {"page": 1, "page_size": 2})
        r2 = client.get("/api/v1/bookings/my_restaurant/", {"page": 2, "page_size": 2})
        assert r1.status_code == 200
        assert r2.status_code == 200
        if isinstance(r1.data, dict) and "results" in r1.data:
            ids1 = {b["id"] for b in r1.data["results"]}
            ids2 = {b["id"] for b in r2.data["results"]}
            assert ids1.isdisjoint(ids2), "Pages must not overlap"

    def test_invalid_page_returns_404_or_empty(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.get("/api/v1/bookings/my_restaurant/", {"page": 9999, "page_size": 10})
        assert r.status_code in (200, 404)
        if r.status_code == 200 and isinstance(r.data, dict) and "results" in r.data:
            assert r.data["results"] == []


                                                                               

@pytest.mark.django_db
class TestAPIConstraints:

    def test_guests_0_rejected_by_api(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=customer)
        r = client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "19:00",
            "guests": 0,
            "duration_minutes": 90,
        })
        assert r.status_code == 400

    def test_guests_21_rejected_by_api(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=customer)
        r = client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "19:00",
            "guests": 21,
            "duration_minutes": 90,
        })
        assert r.status_code == 400

    def test_duration_10_rejected_by_api(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=customer)
        r = client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "19:00",
            "guests": 2,
            "duration_minutes": 10,
        })
        assert r.status_code == 400

    def test_duration_481_rejected_by_api(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=customer)
        r = client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "19:00",
            "guests": 2,
            "duration_minutes": 481,
        })
        assert r.status_code == 400

    def test_past_date_rejected(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=customer)
        yesterday = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")
        r = client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": yesterday,
            "time": "19:00",
            "guests": 2,
            "duration_minutes": 90,
        })
        assert r.status_code == 400


                                                                                

@pytest.mark.django_db
class TestTableConstraints:

    def test_table_seats_0_rejected(self, setup):
        owner, restaurant, t1, t2, customer = setup
        with pytest.raises(Exception):
            Table.objects.create(
                restaurant=restaurant,
                number="BAD",
                seats=0,                       
            )

    def test_table_seats_21_rejected(self, setup):
        owner, restaurant, t1, t2, customer = setup
        with pytest.raises(Exception):
            Table.objects.create(
                restaurant=restaurant,
                number="BIG",
                seats=21,                        
            )

    def test_table_api_rejects_capacity_0(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.post("/api/v1/tables/", {"name": "X", "capacity": 0})
        assert r.status_code == 400

    def test_table_api_rejects_capacity_21(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.post("/api/v1/tables/", {"name": "X", "capacity": 21})
        assert r.status_code == 400

    def test_table_api_creates_valid(self, setup):
        owner, restaurant, t1, t2, customer = setup
        client = APIClient()
        client.force_authenticate(user=owner)
        r = client.post("/api/v1/tables/", {"name": "VIP-1", "capacity": 6})
        assert r.status_code == 201
        assert r.data["capacity"] == 6
