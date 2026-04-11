"""
Tests for Table CRUD module.

Covers:
  - create / read / update / delete
  - capacity validation (1-20)
  - restaurant ownership enforcement
  - cross-restaurant access prevention
  - duplicate name rejection
  - delete protection when active bookings exist
"""
import pytest
from datetime import date, time, timedelta
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from bookings.models import Booking
from restaurants.models import Restaurant, Table
from core.models import Profile


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def owner(db):
    u = User.objects.create_user("table_owner", "to@test.com", "pass123")
    u.profile.role = "owner"
    u.profile.save()
    return u


@pytest.fixture
def restaurant(owner):
    r = Restaurant.objects.create(
        name="Table Test Resto",
        address="1 St",
        city="Almaty",
        owner=owner,
        is_verified=True,
        is_claimed=True,
    )
    owner.profile.restaurant = r
    owner.profile.save()
    return r


@pytest.fixture
def other_owner(db):
    u = User.objects.create_user("other_owner", "oo@test.com", "pass123")
    u.profile.role = "owner"
    u.profile.save()
    return u


@pytest.fixture
def other_restaurant(other_owner):
    r = Restaurant.objects.create(
        name="Other Resto",
        address="2 St",
        city="Almaty",
        owner=other_owner,
        is_verified=True,
        is_claimed=True,
    )
    other_owner.profile.restaurant = r
    other_owner.profile.save()
    return r


@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def manager(db, restaurant):
    u = User.objects.create_user("table_manager", "tm@test.com", "pass123")
    u.profile.role = "manager"
    u.profile.restaurant = restaurant
    u.profile.save()
    return u


@pytest.fixture
def host(db, restaurant):
    u = User.objects.create_user("table_host", "th@test.com", "pass123")
    u.profile.role = "host"
    u.profile.restaurant = restaurant
    u.profile.save()
    return u


@pytest.fixture
def future_date():
    return date.today() + timedelta(days=7)


# ══════════════════════════════════════════════════════════════════════════════
# 1. CREATE
# ══════════════════════════════════════════════════════════════════════════════

class TestTableCreate:

    @pytest.mark.django_db
    def test_create_table_success(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"name": "1", "capacity": 4})
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "1"
        assert resp.data["capacity"] == 4
        assert resp.data["status"] == "free"

    @pytest.mark.django_db
    def test_create_table_with_type(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {
            "name": "VIP-1", "capacity": 8, "table_type": "circle"
        })
        assert resp.status_code == status.HTTP_201_CREATED

    @pytest.mark.django_db
    def test_create_table_missing_name(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"capacity": 4})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in resp.data.get("errors", {})

    @pytest.mark.django_db
    def test_create_table_missing_capacity(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"name": "1"})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "capacity" in resp.data.get("errors", {})

    @pytest.mark.django_db
    def test_create_table_capacity_0_rejected(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"name": "1", "capacity": 0})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_create_table_capacity_negative_rejected(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"name": "1", "capacity": -1})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_create_table_capacity_21_rejected(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"name": "1", "capacity": 21})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_create_table_capacity_20_accepted(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"name": "1", "capacity": 20})
        assert resp.status_code == status.HTTP_201_CREATED

    @pytest.mark.django_db
    def test_create_table_capacity_1_accepted(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"name": "1", "capacity": 1})
        assert resp.status_code == status.HTTP_201_CREATED

    @pytest.mark.django_db
    def test_create_duplicate_name_rejected(self, client, owner, restaurant):
        Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"name": "1", "capacity": 2})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in resp.data.get("errors", {})

    @pytest.mark.django_db
    def test_create_blank_name_rejected(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"name": "   ", "capacity": 4})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_create_unauthenticated_fails(self, client, restaurant):
        resp = client.post("/api/v1/tables/", {"name": "1", "capacity": 4})
        assert resp.status_code in (401, 403)

    @pytest.mark.django_db
    def test_create_no_restaurant_fails(self, client, db):
        """User without a restaurant cannot create tables."""
        user = User.objects.create_user("loner", "l@test.com", "pass123")
        user.profile.role = "owner"
        user.profile.save()
        client.force_authenticate(user=user)
        resp = client.post("/api/v1/tables/", {"name": "1", "capacity": 4})
        assert resp.status_code in (403, 400)

    @pytest.mark.django_db
    def test_free_plan_table_limit_enforced(self, client, owner, restaurant):
        for index in range(10):
            Table.objects.create(restaurant=restaurant, number=f"T{index + 1}", seats=4)
        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/", {"name": "T11", "capacity": 4}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Лимит тарифа" in str(resp.data)


# ══════════════════════════════════════════════════════════════════════════════
# 2. READ (LIST / RETRIEVE)
# ══════════════════════════════════════════════════════════════════════════════

class TestTableRead:

    @pytest.mark.django_db
    def test_list_own_tables(self, client, owner, restaurant):
        Table.objects.create(restaurant=restaurant, number="1", seats=4)
        Table.objects.create(restaurant=restaurant, number="2", seats=2)
        client.force_authenticate(user=owner)
        resp = client.get("/api/v1/tables/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        assert len(data) == 2

    @pytest.mark.django_db
    def test_list_empty(self, client, owner, restaurant):
        client.force_authenticate(user=owner)
        resp = client.get("/api/v1/tables/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        assert len(data) == 0

    @pytest.mark.django_db
    def test_retrieve_own_table(self, client, owner, restaurant):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.get(f"/api/v1/tables/{t.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "1"

    @pytest.mark.django_db
    def test_retrieve_other_restaurant_table_404(
        self, client, owner, restaurant, other_restaurant
    ):
        t = Table.objects.create(restaurant=other_restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.get(f"/api/v1/tables/{t.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_list_filter_active_only(self, client, owner, restaurant):
        Table.objects.create(restaurant=restaurant, number="1", seats=4, is_active=True)
        Table.objects.create(restaurant=restaurant, number="2", seats=2, is_active=False)
        client.force_authenticate(user=owner)
        resp = client.get("/api/v1/tables/?active=true")
        data = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        assert len(data) == 1
        assert data[0]["name"] == "1"

    @pytest.mark.django_db
    def test_list_with_missing_profile_returns_forbidden_not_500(self, client, owner, restaurant):
        Table.objects.create(restaurant=restaurant, number="1", seats=4)
        Profile.objects.filter(user=owner).delete()
        client.force_authenticate(user=owner)
        resp = client.get("/api/v1/tables/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ══════════════════════════════════════════════════════════════════════════════
# 3. UPDATE
# ══════════════════════════════════════════════════════════════════════════════

class TestTableUpdate:

    @pytest.mark.django_db
    def test_update_capacity(self, client, owner, restaurant):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.patch(f"/api/v1/tables/{t.id}/", {"capacity": 6})
        assert resp.status_code == status.HTTP_200_OK
        t.refresh_from_db()
        assert t.seats == 6

    @pytest.mark.django_db
    def test_update_name(self, client, owner, restaurant):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.patch(f"/api/v1/tables/{t.id}/", {"name": "VIP"})
        assert resp.status_code == status.HTTP_200_OK
        t.refresh_from_db()
        assert t.number == "VIP"

    @pytest.mark.django_db
    def test_update_deactivate(self, client, owner, restaurant):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.patch(f"/api/v1/tables/{t.id}/", {"is_active": False})
        assert resp.status_code == status.HTTP_200_OK
        t.refresh_from_db()
        assert t.is_active is False

    @pytest.mark.django_db
    def test_update_layout_fields(self, client, owner, restaurant):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.patch(
            f"/api/v1/tables/{t.id}/",
            {"x": 180, "y": 120, "width": 96, "height": 72, "rotation": 15},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        t.refresh_from_db()
        assert t.x == 180
        assert t.y == 120
        assert t.width == 96
        assert t.height == 72
        assert t.rotation == 15

    @pytest.mark.django_db
    def test_update_capacity_out_of_range_rejected(self, client, owner, restaurant):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.patch(f"/api/v1/tables/{t.id}/", {"capacity": 25})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_update_other_restaurant_table_404(
        self, client, owner, restaurant, other_restaurant
    ):
        t = Table.objects.create(restaurant=other_restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.patch(f"/api/v1/tables/{t.id}/", {"capacity": 6})
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_update_duplicate_name_rejected(self, client, owner, restaurant):
        Table.objects.create(restaurant=restaurant, number="1", seats=4)
        t2 = Table.objects.create(restaurant=restaurant, number="2", seats=2)
        client.force_authenticate(user=owner)
        resp = client.patch(f"/api/v1/tables/{t2.id}/", {"name": "1"})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ══════════════════════════════════════════════════════════════════════════════
# 4. DELETE
# ══════════════════════════════════════════════════════════════════════════════

class TestTableDelete:

    @pytest.mark.django_db
    def test_delete_own_table(self, client, owner, restaurant):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.delete(f"/api/v1/tables/{t.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not Table.objects.filter(id=t.id).exists()

    @pytest.mark.django_db
    def test_delete_other_restaurant_table_404(
        self, client, owner, restaurant, other_restaurant
    ):
        t = Table.objects.create(restaurant=other_restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.delete(f"/api/v1/tables/{t.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        assert Table.objects.filter(id=t.id).exists()

    @pytest.mark.django_db
    def test_delete_table_with_active_booking_blocked(
        self, client, owner, restaurant, future_date
    ):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        customer = User.objects.create_user("cust", "c@test.com", "pass")
        Booking.objects.create(
            restaurant=restaurant, table=t, user=customer,
            date=future_date, time=time(19, 0), guests=2,
            status=Booking.CONFIRMED,
        )
        client.force_authenticate(user=owner)
        resp = client.delete(f"/api/v1/tables/{t.id}/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert Table.objects.filter(id=t.id).exists()

    @pytest.mark.django_db
    def test_delete_table_with_cancelled_booking_allowed(
        self, client, owner, restaurant, future_date
    ):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        customer = User.objects.create_user("cust2", "c2@test.com", "pass")
        Booking.objects.create(
            restaurant=restaurant, table=t, user=customer,
            date=future_date, time=time(19, 0), guests=2,
            status=Booking.CANCELLED_BY_USER,
        )
        client.force_authenticate(user=owner)
        resp = client.delete(f"/api/v1/tables/{t.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT


class TestTableBulkDelete:

    @pytest.mark.django_db
    def test_clear_all_deletes_only_tables_without_active_bookings(
        self, client, owner, restaurant, other_restaurant, future_date
    ):
        active = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        removable = Table.objects.create(restaurant=restaurant, number="2", seats=2)
        removable_two = Table.objects.create(restaurant=restaurant, number="3", seats=6)
        foreign_table = Table.objects.create(restaurant=other_restaurant, number="9", seats=4)

        customer = User.objects.create_user("bulk_cust", "bulk@test.com", "pass")
        booking = Booking.objects.create(
            restaurant=restaurant,
            date=future_date,
            time=time(19, 0),
            guests=2,
            status=Booking.CONFIRMED,
            user=customer,
        )
        booking.tables.set([active])

        client.force_authenticate(user=owner)
        resp = client.post("/api/v1/tables/clear-all/", format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["deleted_count"] == 2
        assert resp.data["blocked_count"] == 1
        assert resp.data["blocked_tables"][0]["id"] == active.id
        assert not Table.objects.filter(id=removable.id).exists()
        assert not Table.objects.filter(id=removable_two.id).exists()
        assert Table.objects.filter(id=active.id).exists()
        assert Table.objects.filter(id=foreign_table.id).exists()

    @pytest.mark.django_db
    def test_clear_all_forbidden_for_manager(self, client, manager, restaurant):
        Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=manager)
        resp = client.post("/api/v1/tables/clear-all/", format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ══════════════════════════════════════════════════════════════════════════════
# 5. TENANT ISOLATION
# ══════════════════════════════════════════════════════════════════════════════

class TestTenantIsolation:

    @pytest.mark.django_db
    def test_list_does_not_leak_other_restaurant_tables(
        self, client, owner, restaurant, other_restaurant
    ):
        Table.objects.create(restaurant=restaurant, number="1", seats=4)
        Table.objects.create(restaurant=other_restaurant, number="2", seats=2)
        client.force_authenticate(user=owner)
        resp = client.get("/api/v1/tables/")
        data = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        assert len(data) == 1
        assert data[0]["name"] == "1"

    @pytest.mark.django_db
    def test_cannot_update_other_restaurant_table(
        self, client, owner, restaurant, other_restaurant
    ):
        t = Table.objects.create(restaurant=other_restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.patch(f"/api/v1/tables/{t.id}/", {"capacity": 8})
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        t.refresh_from_db()
        assert t.seats == 4

    @pytest.mark.django_db
    def test_cannot_delete_other_restaurant_table(
        self, client, owner, restaurant, other_restaurant
    ):
        t = Table.objects.create(restaurant=other_restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.delete(f"/api/v1/tables/{t.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        assert Table.objects.filter(id=t.id).exists()


# ══════════════════════════════════════════════════════════════════════════════
# 5b. ROLE PERMISSIONS
# ══════════════════════════════════════════════════════════════════════════════

class TestTableRolePermissions:

    @pytest.mark.django_db
    def test_host_can_view_tables_and_status(self, client, host, restaurant, future_date):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=host)

        resp = client.get("/api/v1/tables/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        assert len(data) == 1
        assert data[0]["id"] == t.id

        resp = client.get(f"/api/v1/tables/status/?date={future_date}&time=19:00")
        assert resp.status_code == status.HTTP_200_OK

    @pytest.mark.django_db
    def test_host_cannot_create_update_or_delete(self, client, host, restaurant):
        existing = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=host)

        resp = client.post("/api/v1/tables/", {"name": "2", "capacity": 2})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        resp = client.patch(f"/api/v1/tables/{existing.id}/", {"capacity": 6})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        resp = client.delete(f"/api/v1/tables/{existing.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_manager_can_create_and_update_but_cannot_delete(self, client, manager, restaurant):
        client.force_authenticate(user=manager)

        resp = client.post("/api/v1/tables/", {"name": "M1", "capacity": 4})
        assert resp.status_code == status.HTTP_201_CREATED
        table_id = resp.data["id"]

        resp = client.patch(f"/api/v1/tables/{table_id}/", {"capacity": 6})
        assert resp.status_code == status.HTTP_200_OK

        resp = client.delete(f"/api/v1/tables/{table_id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ══════════════════════════════════════════════════════════════════════════════
# 6. TABLE STATUS ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

class TestTableStatus:

    @pytest.mark.django_db
    def test_status_endpoint_free_tables(self, client, owner, restaurant, future_date):
        Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.get(
            f"/api/v1/tables/status/?date={future_date}&time=19:00"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]["status"] == "free"

    @pytest.mark.django_db
    def test_status_endpoint_shows_reserved(
        self, client, owner, restaurant, future_date
    ):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        customer = User.objects.create_user("scust", "sc@test.com", "pass")
        b = Booking.objects.create(
            restaurant=restaurant, table=t, user=customer,
            date=future_date, time=time(19, 0), guests=2,
            status=Booking.CONFIRMED,
        )
        b.tables.set([t])

        client.force_authenticate(user=owner)
        resp = client.get(
            f"/api/v1/tables/status/?date={future_date}&time=19:00"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data[0]["status"] == "reserved"

    @pytest.mark.django_db
    def test_status_endpoint_shows_occupied(
        self, client, owner, restaurant, future_date
    ):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        customer = User.objects.create_user("ocust", "oc@test.com", "pass")
        b = Booking.objects.create(
            restaurant=restaurant, table=t, user=customer,
            date=future_date, time=time(19, 0), guests=2,
            status=Booking.SEATED, is_checked_in=True,
        )
        b.tables.set([t])

        client.force_authenticate(user=owner)
        resp = client.get(
            f"/api/v1/tables/status/?date={future_date}&time=19:00"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data[0]["status"] == "occupied"


# ══════════════════════════════════════════════════════════════════════════════
# 7. UPDATE STATUS ACTION
# ══════════════════════════════════════════════════════════════════════════════

class TestUpdateTableStatus:

    @pytest.mark.django_db
    def test_owner_can_set_table_status(self, client, owner, restaurant):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.patch(f"/api/v1/tables/{t.id}/update_status/", {"status": "cleaning"})
        assert resp.status_code == status.HTTP_200_OK
        t.refresh_from_db()
        assert t.status == "cleaning"

    @pytest.mark.django_db
    def test_invalid_status_rejected(self, client, owner, restaurant):
        t = Table.objects.create(restaurant=restaurant, number="1", seats=4)
        client.force_authenticate(user=owner)
        resp = client.patch(f"/api/v1/tables/{t.id}/update_status/", {"status": "invalid"})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
