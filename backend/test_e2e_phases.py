import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Profile
from restaurants.models import Restaurant, Table
from bookings.models import Booking
from crm.models import Customer


def get_token(client, username, password):
    r = client.post("/api/v1/auth/login/", {"username": username, "password": password})
    if r.status_code != 200:
        return None
    return r.json().get("access")


class Phase3FrontendAPI(TestCase):
    

    def setUp(self):
        self.client = APIClient()
        self.user_customer = User.objects.create_user("cust", "c@t.com", "pass")
        Profile.objects.filter(user=self.user_customer).update(role="customer")
        self.owner = User.objects.create_user("owner1", "o@t.com", "pass")
        Profile.objects.filter(user=self.owner).update(role="owner")
        self.rest = Restaurant.objects.create(
            name="Test Rest", address="A", city="City",
            owner=self.owner, is_claimed=True, is_verified=True,
        )
        Table.objects.create(restaurant=self.rest, number="1", seats=4, is_active=True)

    def test_login_returns_access_and_role(self):
        r = self.client.post("/api/v1/auth/login/", {"username": "owner1", "password": "pass"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.json())
        self.assertIn("role", r.json())
        self.assertEqual(r.json()["role"], "owner")

    def test_me_returns_restaurant_flags(self):
        token = get_token(self.client, "owner1", "pass")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        r2 = self.client.get("/api/v1/auth/me/")
        self.assertEqual(r2.status_code, 200)
        data = r2.json()
        self.assertIn("restaurant_verified", data)
        self.assertIn("restaurant_setup_required", data)

    def test_restaurant_list_public(self):
        r = self.client.get("/api/v1/restaurants/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        lst = data if isinstance(data, list) else data.get("results", [])
        names = [x["name"] for x in lst]
        self.assertIn("Test Rest", names)

    def test_restaurant_me_owner(self):
        token = get_token(self.client, "owner1", "pass")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        r2 = self.client.get("/api/v1/restaurants/me/")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["name"], "Test Rest")

    def test_available_slots(self):
        r = self.client.get(
            "/api/v1/bookings/available_slots/",
            {"restaurant_id": self.rest.id, "date": "2030-01-15", "guests": 2},
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("slots", r.json())

    def test_favorites_empty(self):
        token = get_token(self.client, "owner1", "pass")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        r = self.client.get("/api/v1/restaurants/favorites/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])


class Phase4BookingAPI(TestCase):
    

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user("own", "o@t.com", "pass")
        Profile.objects.filter(user=self.owner).update(role="owner")
        self.cust = User.objects.create_user("cust", "c@t.com", "pass")
        Profile.objects.filter(user=self.cust).update(role="customer")
        self.rest = Restaurant.objects.create(
            name="R", address="A", city="C", owner=self.owner,
            is_claimed=True, is_verified=True,
        )
        Table.objects.create(restaurant=self.rest, number="T1", seats=4, is_active=True)

    def test_create_booking_customer(self):
        token = get_token(self.client, "cust", "pass")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        r = self.client.post(
            "/api/v1/bookings/",
            {
                "restaurant": self.rest.id,
                "date": "2030-01-20",
                "time": "19:00",
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertIn(r.json()["status"], ("pending", "confirmed"))

    def test_my_restaurant_bookings_owner(self):
        Booking.objects.create(
            restaurant=self.rest, user=self.cust, date="2030-01-20", time="19:00",
            guests=2, duration_minutes=90, status=Booking.PENDING,
        )
        token = get_token(self.client, "own", "pass")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        r = self.client.get("/api/v1/bookings/my_restaurant/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        lst = data if isinstance(data, list) else data.get("results", [])
        self.assertGreaterEqual(len(lst), 1)


class Phase6CRMAPI(TestCase):
    

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user("own", "o@t.com", "pass")
        self.rest = Restaurant.objects.create(
            name="R", address="A", city="C", owner=self.owner,
            is_claimed=True, is_verified=True,
        )
        Profile.objects.filter(user=self.owner).update(role="owner", restaurant=self.rest)
        self.customer = Customer.objects.create(
            restaurant=self.rest, name="John", phone="+77771234567",
        )

    def test_crm_customers_list(self):
        token = get_token(self.client, "own", "pass")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        r = self.client.get("/api/v1/crm/customers/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        lst = data if isinstance(data, list) else data.get("results", [])
        self.assertGreaterEqual(len(lst), 1)

    def test_crm_customer_detail_and_bookings(self):
        token = get_token(self.client, "own", "pass")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        r = self.client.get(f"/api/v1/crm/customers/{self.customer.id}/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("full_name", r.json())
        r2 = self.client.get(f"/api/v1/crm/customers/{self.customer.id}/bookings/")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json(), [])

    def test_crm_customer_patch_notes(self):
        token = get_token(self.client, "own", "pass")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        r = self.client.patch(
            f"/api/v1/crm/customers/{self.customer.id}/",
            {"notes": "Test note"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        r2 = self.client.get(f"/api/v1/crm/customers/{self.customer.id}/")
        self.assertEqual(r2.json().get("notes"), "Test note")


class Phase8DatabaseValidation(TestCase):
    

    def test_required_tables_exist(self):
        from django.db import connection
        with connection.cursor() as c:
            if connection.vendor == "sqlite":
                c.execute("SELECT name FROM sqlite_master WHERE type='table'")
            else:
                c.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
            names = {row[0] for row in c.fetchall()}
        if connection.vendor == "sqlite":
            for t in ["auth_user", "core_profile", "restaurants_restaurant", "restaurants_table", "bookings_booking", "crm_customer"]:
                self.assertIn(t, names, f"Table {t} should exist")
        else:
            for t in ["auth_user", "bookings_booking", "crm_customer", "restaurants_restaurant", "restaurants_table"]:
                self.assertIn(t, names, f"Table {t} should exist")


class Phase10LoadSimulation(TestCase):
    

    def setUp(self):
        self.client = APIClient()

    def test_multiple_restaurants_and_bookings(self):
        owners = []
        restaurants = []
        for i in range(3):
            u = User.objects.create_user(f"owner{i}", f"o{i}@t.com", "pass")
            Profile.objects.filter(user=u).update(role="owner")
            owners.append(u)
            r = Restaurant.objects.create(
                name=f"Restaurant {i}", address="A", city="City",
                owner=u, is_claimed=True, is_verified=True,
            )
            Table.objects.create(restaurant=r, number="1", seats=4, is_active=True)
            Table.objects.create(restaurant=r, number="2", seats=2, is_active=True)
            restaurants.append(r)
        cust = User.objects.create_user("cust", "c@t.com", "pass")
        Profile.objects.filter(user=cust).update(role="customer")
        token = get_token(self.client, "cust", "pass")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        for i, rest in enumerate(restaurants):
            r = self.client.post(
                "/api/v1/bookings/",
                {"restaurant": rest.id, "date": "2030-02-01", "time": f"{18 + i * 2}:00", "guests": 2},
                format="json",
            )
            self.assertEqual(r.status_code, 201, f"Booking for restaurant {i} should succeed")
        self.assertEqual(Booking.objects.count(), 3)
        for owner in owners:
            token = get_token(self.client, owner.username, "pass")
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
            r = self.client.get("/api/v1/bookings/my_restaurant/")
            self.assertEqual(r.status_code, 200)
            data = r.json()
            lst = data if isinstance(data, list) else data.get("results", [])
            self.assertEqual(len(lst), 1, "Each owner should see 1 booking")
