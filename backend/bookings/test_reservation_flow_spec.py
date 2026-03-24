import pytest
from datetime import date, timedelta

from django.contrib.auth.models import User
from rest_framework.test import APIClient

from restaurants.models import Restaurant, Table


@pytest.fixture
def restaurant(db):
    owner = User.objects.create_user("owner_flow", "o_flow@test.com", "pass")
    owner.profile.role = "owner"
    owner.profile.save()
    r = Restaurant.objects.create(
        name="Flow Test Restaurant",
        address="123 Flow St",
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
    t4 = Table.objects.create(restaurant=restaurant, number="T4", seats=4, is_active=True)
    t6 = Table.objects.create(restaurant=restaurant, number="T6", seats=6, is_active=True)
    return {"t4": t4, "t6": t6}


@pytest.fixture
def future_date():
    return date.today() + timedelta(days=7)


def _make_customer(username: str):
    u = User.objects.create_user(username, f"{username}@test.com", "pass")
    u.profile.role = "customer"
    u.profile.save()
    return u


@pytest.mark.django_db
def test_api_flow_smallest_table_and_overlap_allocation(restaurant, tables, future_date):
    c1 = _make_customer("cust_flow_1")
    c2 = _make_customer("cust_flow_2")

    client1 = APIClient()
    client1.force_authenticate(user=c1)
    res1 = client1.post(
        "/api/v1/bookings/",
        {
            "restaurant": restaurant.id,
            "date": str(future_date),
            "time": "18:00",
            "guests": 3,
            "duration_minutes": 120,
        },
        format="json",
    )
    assert res1.status_code == 201, res1.data
    assert res1.data["table_id"] == tables["t4"].id

    client2 = APIClient()
    client2.force_authenticate(user=c2)
    res2 = client2.post(
        "/api/v1/bookings/",
        {
            "restaurant": restaurant.id,
            "date": str(future_date),
            "time": "19:00",
            "guests": 3,
            "duration_minutes": 120,
        },
        format="json",
    )
    assert res2.status_code == 201, res2.data
    assert res2.data["table_id"] == tables["t6"].id


@pytest.mark.django_db
def test_api_overlap_boundary_end_equals_start_is_allowed(restaurant, tables, future_date):
    c1 = _make_customer("cust_flow_boundary_1")
    c2 = _make_customer("cust_flow_boundary_2")

    client1 = APIClient()
    client1.force_authenticate(user=c1)
    res1 = client1.post(
        "/api/v1/bookings/",
        {
            "restaurant": restaurant.id,
            "date": str(future_date),
            "time": "18:00",
            "guests": 2,
            "duration_minutes": 90,
        },
        format="json",
    )
    assert res1.status_code == 201, res1.data

    client2 = APIClient()
    client2.force_authenticate(user=c2)
    res2 = client2.post(
        "/api/v1/bookings/",
        {
            "restaurant": restaurant.id,
            "date": str(future_date),
            "time": "19:30",
            "guests": 2,
            "duration_minutes": 90,
        },
        format="json",
    )
    assert res2.status_code == 201, res2.data
    assert res2.data["table_id"] == res1.data["table_id"]


@pytest.mark.django_db
def test_api_capacity_blocks_even_if_tables_exist(restaurant, tables, future_date):
    restaurant.capacity = 4
    restaurant.save(update_fields=["capacity"])

    c1 = _make_customer("cust_flow_cap_1")
    c2 = _make_customer("cust_flow_cap_2")

    client1 = APIClient()
    client1.force_authenticate(user=c1)
    res1 = client1.post(
        "/api/v1/bookings/",
        {
            "restaurant": restaurant.id,
            "date": str(future_date),
            "time": "18:00",
            "guests": 4,
            "duration_minutes": 120,
        },
        format="json",
    )
    assert res1.status_code == 201, res1.data

    client2 = APIClient()
    client2.force_authenticate(user=c2)
    res2 = client2.post(
        "/api/v1/bookings/",
        {
            "restaurant": restaurant.id,
            "date": str(future_date),
            "time": "18:00",
            "guests": 1,
            "duration_minutes": 120,
        },
        format="json",
    )
    assert res2.status_code == 400
