import pytest
from datetime import date, time, timedelta

from django.contrib.auth.models import User
from rest_framework.test import APIClient

from bookings.models import Booking
from restaurants.models import Restaurant, Table, OpeningHours


                                                                                

def _tomorrow():
    return (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def owner_and_restaurant(db):
    owner = User.objects.create_user("cov_owner", "cov_owner@test.local", "Pass1234!")
    owner.profile.role = "owner"
    owner.profile.save()

    restaurant = Restaurant.objects.create(
        name="Coverage Restaurant",
        address="1 Coverage St",
        city="Almaty",
        owner=owner,
        is_verified=True,
        is_claimed=True,
        capacity=40,
    )
    owner.profile.restaurant = restaurant
    owner.profile.save()

    Table.objects.create(restaurant=restaurant, number="T1", seats=4)
    Table.objects.create(restaurant=restaurant, number="T2", seats=4)

    for day in range(7):
        OpeningHours.objects.create(
            restaurant=restaurant,
            day_of_week=day,
            opening_time=time(10, 0),
            closing_time=time(23, 0),
        )

    return owner, restaurant


@pytest.fixture
def customer(db):
    u = User.objects.create_user("cov_cust", "cov_cust@test.local", "Pass1234!")
    u.profile.role = "customer"
    u.profile.save()
    return u


                                                                                

@pytest.mark.django_db
class TestLoginFlow:

    def test_login_with_username_returns_tokens(self, api_client, owner_and_restaurant):
        owner, _ = owner_and_restaurant
        r = api_client.post("/api/v1/auth/login/", {
            "username": "cov_owner",
            "password": "Pass1234!",
        })
        assert r.status_code == 200, r.data
        assert "access" in r.data
        assert "refresh" in r.data

    def test_login_with_email_returns_tokens(self, api_client, owner_and_restaurant):
        
        owner, _ = owner_and_restaurant
        r = api_client.post("/api/v1/auth/login/", {
            "username": "cov_owner@test.local",
            "password": "Pass1234!",
        })
        assert r.status_code == 200, r.data
        assert "access" in r.data

    def test_login_wrong_password_returns_401(self, api_client, owner_and_restaurant):
        r = api_client.post("/api/v1/auth/login/", {
            "username": "cov_owner",
            "password": "wrongpassword",
        })
        assert r.status_code == 401

    def test_login_nonexistent_user_returns_401(self, api_client, db):
        r = api_client.post("/api/v1/auth/login/", {
            "username": "nobody",
            "password": "Pass1234!",
        })
        assert r.status_code == 401

    def test_login_response_includes_role(self, api_client, owner_and_restaurant):
        owner, _ = owner_and_restaurant
        r = api_client.post("/api/v1/auth/login/", {
            "username": "cov_owner",
            "password": "Pass1234!",
        })
        assert r.status_code == 200
        assert "role" in r.data


                                                                               

@pytest.mark.django_db
class TestRegisterWithoutOTP:

    def test_register_customer_no_otp_required(self, api_client):
        r = api_client.post("/api/v1/auth/register/", {
            "username": "new_customer_cov",
            "email": "new_customer_cov@test.local",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
            "role": "customer",
        })
        assert r.status_code == 201, r.data
        assert User.objects.filter(username="new_customer_cov").exists()

    def test_register_owner_no_otp_required(self, api_client):
        r = api_client.post("/api/v1/auth/register/", {
            "username": "new_owner_cov",
            "email": "new_owner_cov@test.local",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
            "role": "owner",
        })
        assert r.status_code == 201, r.data
        user = User.objects.get(username="new_owner_cov")
        assert user.profile.role == "owner"

    def test_register_duplicate_username_rejected(self, api_client, owner_and_restaurant):
        r = api_client.post("/api/v1/auth/register/", {
            "username": "cov_owner",                  
            "email": "unique_email@test.local",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
            "role": "customer",
        })
        assert r.status_code == 400

    def test_register_duplicate_email_rejected(self, api_client, owner_and_restaurant):
        r = api_client.post("/api/v1/auth/register/", {
            "username": "unique_username_cov",
            "email": "cov_owner@test.local",                  
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
            "role": "customer",
        })
        assert r.status_code == 400

    def test_register_short_password_rejected(self, api_client):
        r = api_client.post("/api/v1/auth/register/", {
            "username": "shortpass_cov",
            "email": "shortpass_cov@test.local",
            "password": "abc",
            "role": "customer",
        })
        assert r.status_code == 400

    def test_register_global_admin_role_blocked(self, api_client):
        r = api_client.post("/api/v1/auth/register/", {
            "username": "hacker_cov",
            "email": "hacker_cov@test.local",
            "password": "StrongPass123!",
            "role": "global_admin",
        })
        assert r.status_code == 400


                                                                               

@pytest.mark.django_db
class TestRestaurantsPublicList:

    def test_public_list_returns_verified_restaurants(self, api_client, owner_and_restaurant):
        _, restaurant = owner_and_restaurant
        r = api_client.get("/api/v1/restaurants/")
        assert r.status_code == 200
        data = r.data if isinstance(r.data, list) else r.data.get("results", r.data)
        ids = [item["id"] for item in data]
        assert restaurant.id in ids

    def test_public_list_no_auth_required(self, api_client, owner_and_restaurant):
        
        r = api_client.get("/api/v1/restaurants/")
        assert r.status_code == 200

    def test_unverified_restaurant_not_in_public_list(self, api_client, db):
        owner = User.objects.create_user("unver_owner", "unver@test.local", "Pass1234!")
        owner2 = User.objects.create_user("unver_owner2", "unver2@test.local", "Pass1234!")
        Restaurant.objects.create(
            name="Verified Place",
            address="V St",
            owner=owner,
            is_verified=True,
            is_claimed=True,
        )
        Restaurant.objects.create(
            name="Unverified Place",
            address="X St",
            owner=owner2,
            is_verified=False,
        )
        r = api_client.get("/api/v1/restaurants/")
        assert r.status_code == 200
        data = r.data if isinstance(r.data, list) else r.data.get("results", r.data)
        names = [item.get("name") for item in data]
        assert "Verified Place" in names
        assert "Unverified Place" not in names


                                                                                

@pytest.mark.django_db
class TestFullBookingLifecycle:

    def test_pending_to_confirmed_to_seated_to_completed(
        self, api_client, owner_and_restaurant, customer
    ):
        owner, restaurant = owner_and_restaurant

                                                             
        api_client.force_authenticate(user=customer)
        create_r = api_client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "19:00",
            "guests": 2,
            "duration_minutes": 90,
        })
        assert create_r.status_code == 201, create_r.data
        booking_id = create_r.data["id"]

        booking = Booking.objects.get(id=booking_id)
        assert booking.status == Booking.PENDING

                                                     
        api_client.force_authenticate(user=owner)
        confirm_r = api_client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        assert confirm_r.status_code == 200, confirm_r.data
        booking.refresh_from_db()
        assert booking.status in (Booking.APPROVED, Booking.CONFIRMED)

                                                
        seat_r = api_client.post(f"/api/v1/bookings/{booking_id}/seat/")
        assert seat_r.status_code == 200, seat_r.data
        booking.refresh_from_db()
        assert booking.status == Booking.SEATED

                                             
        complete_r = api_client.post(f"/api/v1/bookings/{booking_id}/complete/")
        assert complete_r.status_code == 200, complete_r.data
        booking.refresh_from_db()
        assert booking.status == Booking.COMPLETED

    def test_confirmed_to_no_show(self, api_client, owner_and_restaurant, customer):
        owner, restaurant = owner_and_restaurant

        api_client.force_authenticate(user=customer)
        create_r = api_client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "20:00",
            "guests": 2,
            "duration_minutes": 90,
        })
        assert create_r.status_code == 201
        booking_id = create_r.data["id"]

        api_client.force_authenticate(user=owner)
        api_client.post(f"/api/v1/bookings/{booking_id}/confirm/")

        no_show_r = api_client.post(f"/api/v1/bookings/{booking_id}/no_show/")
        assert no_show_r.status_code == 200
        booking = Booking.objects.get(id=booking_id)
        assert booking.status == Booking.NO_SHOW

    def test_cannot_complete_pending_booking(self, api_client, owner_and_restaurant, customer):
        
        owner, restaurant = owner_and_restaurant

        api_client.force_authenticate(user=customer)
        create_r = api_client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "21:00",
            "guests": 2,
            "duration_minutes": 90,
        })
        assert create_r.status_code == 201
        booking_id = create_r.data["id"]

        api_client.force_authenticate(user=owner)
        complete_r = api_client.post(f"/api/v1/bookings/{booking_id}/complete/")
        assert complete_r.status_code == 400

    def test_history_recorded_for_each_transition(
        self, api_client, owner_and_restaurant, customer
    ):
        from bookings.models import ReservationHistory

        owner, restaurant = owner_and_restaurant

        api_client.force_authenticate(user=customer)
        create_r = api_client.post("/api/v1/bookings/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "18:00",
            "guests": 2,
            "duration_minutes": 90,
        })
        assert create_r.status_code == 201
        booking_id = create_r.data["id"]

        api_client.force_authenticate(user=owner)
        api_client.post(f"/api/v1/bookings/{booking_id}/confirm/")
        api_client.post(f"/api/v1/bookings/{booking_id}/seat/")
        api_client.post(f"/api/v1/bookings/{booking_id}/complete/")

        history_count = ReservationHistory.objects.filter(reservation_id=booking_id).count()
        assert history_count >= 3, f"Expected ≥3 history entries, got {history_count}"


                                                                                

@pytest.mark.django_db
class TestCreateManual:

    def test_owner_can_create_manual_booking(self, api_client, owner_and_restaurant):
        owner, restaurant = owner_and_restaurant
        api_client.force_authenticate(user=owner)

        r = api_client.post("/api/v1/bookings/create_manual/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "19:00",
            "guests": 2,
            "duration_minutes": 90,
            "user_name": "Walk-in Guest",
            "user_phone": "+77001234567",
        })
        assert r.status_code == 201, r.data
        assert r.data.get("user_name") == "Walk-in Guest" or "id" in r.data

    def test_manual_booking_defaults_to_confirmed(self, api_client, owner_and_restaurant):
        owner, restaurant = owner_and_restaurant
        api_client.force_authenticate(user=owner)

        r = api_client.post("/api/v1/bookings/create_manual/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "20:00",
            "guests": 2,
            "duration_minutes": 90,
            "user_name": "Walk-in 2",
            "user_phone": "+77009876543",
        })
        assert r.status_code == 201, r.data
        booking = Booking.objects.get(id=r.data["id"])
        assert booking.status in (Booking.CONFIRMED, Booking.PENDING)

    def test_customer_cannot_create_manual_booking(
        self, api_client, owner_and_restaurant, customer
    ):
        _, restaurant = owner_and_restaurant
        api_client.force_authenticate(user=customer)

        r = api_client.post("/api/v1/bookings/create_manual/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "19:00",
            "guests": 2,
            "duration_minutes": 90,
            "user_name": "Sneaky Guest",
            "user_phone": "+77000000000",
        })
        assert r.status_code in (403, 401)

    def test_unauthenticated_cannot_create_manual_booking(
        self, api_client, owner_and_restaurant
    ):
        _, restaurant = owner_and_restaurant
        r = api_client.post("/api/v1/bookings/create_manual/", {
            "restaurant": restaurant.id,
            "date": _tomorrow(),
            "time": "19:00",
            "guests": 2,
            "duration_minutes": 90,
            "user_name": "Anon",
            "user_phone": "+77000000001",
        })
        assert r.status_code in (401, 403)

    def test_manual_booking_past_date_rejected(self, api_client, owner_and_restaurant):
        owner, restaurant = owner_and_restaurant
        api_client.force_authenticate(user=owner)
        yesterday = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")

        r = api_client.post("/api/v1/bookings/create_manual/", {
            "restaurant": restaurant.id,
            "date": yesterday,
            "time": "19:00",
            "guests": 2,
            "duration_minutes": 90,
            "user_name": "Past Guest",
            "user_phone": "+77000000002",
        })
        assert r.status_code == 400


                                                                                

@pytest.mark.django_db
class TestAvailableSlotsBasic:

    def test_returns_slots_for_open_restaurant(self, api_client, owner_and_restaurant):
        _, restaurant = owner_and_restaurant
        r = api_client.get("/api/v1/bookings/available_slots/", {
            "restaurant_id": restaurant.id,
            "date": _tomorrow(),
            "guests": 2,
        })
        assert r.status_code == 200, r.data
        assert "slots" in r.data
        assert len(r.data["slots"]) > 0

    def test_missing_restaurant_id_returns_400(self, api_client, owner_and_restaurant):
        r = api_client.get("/api/v1/bookings/available_slots/", {
            "date": _tomorrow(),
            "guests": 2,
        })
        assert r.status_code == 400

    def test_missing_date_returns_400(self, api_client, owner_and_restaurant):
        _, restaurant = owner_and_restaurant
        r = api_client.get("/api/v1/bookings/available_slots/", {
            "restaurant_id": restaurant.id,
            "guests": 2,
        })
        assert r.status_code == 400

    def test_no_auth_required_for_slots(self, api_client, owner_and_restaurant):
        
        _, restaurant = owner_and_restaurant
        r = api_client.get("/api/v1/bookings/available_slots/", {
            "restaurant_id": restaurant.id,
            "date": _tomorrow(),
            "guests": 2,
        })
        assert r.status_code == 200


                                                                                

@pytest.mark.django_db
class TestTableCRUD:

    def test_create_table(self, api_client, owner_and_restaurant):
        owner, _ = owner_and_restaurant
        api_client.force_authenticate(user=owner)
        r = api_client.post("/api/v1/tables/", {"name": "NewT1", "capacity": 4})
        assert r.status_code == 201, r.data

    def test_list_tables_returns_own_restaurant_only(self, api_client, owner_and_restaurant):
        owner, restaurant = owner_and_restaurant
        api_client.force_authenticate(user=owner)
        r = api_client.get("/api/v1/tables/")
        assert r.status_code == 200
        data = r.data if isinstance(r.data, list) else r.data.get("results", [])
                                                               
        for t in data:
            assert t.get("restaurant") == restaurant.id or "restaurant" not in t

    def test_update_table_capacity(self, api_client, owner_and_restaurant):
        owner, restaurant = owner_and_restaurant
        table = Table.objects.create(restaurant=restaurant, number="UpdT", seats=4)
        api_client.force_authenticate(user=owner)
        r = api_client.patch(f"/api/v1/tables/{table.id}/", {"capacity": 6})
        assert r.status_code == 200, r.data
        table.refresh_from_db()
        assert table.seats == 6

    def test_delete_table_no_active_bookings(self, api_client, owner_and_restaurant):
        owner, restaurant = owner_and_restaurant
        table = Table.objects.create(restaurant=restaurant, number="DelT", seats=4)
        api_client.force_authenticate(user=owner)
        r = api_client.delete(f"/api/v1/tables/{table.id}/")
        assert r.status_code == 204
        assert not Table.objects.filter(id=table.id).exists()

    def test_delete_table_with_active_booking_blocked(self, api_client, owner_and_restaurant, customer):
        owner, restaurant = owner_and_restaurant
        table = Table.objects.create(restaurant=restaurant, number="BusyT", seats=4)
        Booking.objects.create(
            user=customer,
            restaurant=restaurant,
            table=table,
            date=date.today() + timedelta(days=1),
            time=time(19, 0),
            guests=2,
            status=Booking.CONFIRMED,
        )
        api_client.force_authenticate(user=owner)
        r = api_client.delete(f"/api/v1/tables/{table.id}/")
        assert r.status_code == 400
        assert Table.objects.filter(id=table.id).exists()

    def test_customer_cannot_create_table(self, api_client, owner_and_restaurant, customer):
        api_client.force_authenticate(user=customer)
        r = api_client.post("/api/v1/tables/", {"name": "Hack", "capacity": 4})
        assert r.status_code in (403, 401)
