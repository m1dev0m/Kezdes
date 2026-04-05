import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient

from restaurants.models import Restaurant, RestaurantAuditLog


pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def restaurant_owner():
    user = User.objects.create_user("flags_owner", "flags-owner@example.com", "pass123")
    user.profile.role = "owner"
    user.profile.save()
    return user


@pytest.fixture
def global_admin():
    user = User.objects.create_user("flags_admin", "flags-admin@example.com", "pass123")
    user.profile.role = "global_admin"
    user.profile.save()
    return user


@pytest.fixture
def restaurant(restaurant_owner):
    restaurant = Restaurant.objects.create(
        name="Feature Flags Resto",
        address="1 Flag Street",
        city="Almaty",
        owner=restaurant_owner,
        is_verified=True,
        is_claimed=True,
        plan=Restaurant.PLAN_PLUS,
        payment_status=Restaurant.PAYMENT_ACTIVE,
        feature_flags={"table_map": False, "beta_waitlist": True},
    )
    restaurant_owner.profile.restaurant = restaurant
    restaurant_owner.profile.save()
    return restaurant


def test_global_admin_can_read_feature_flags(client, global_admin, restaurant):
    client.force_authenticate(user=global_admin)

    response = client.get(f"/api/v1/restaurants/{restaurant.id}/feature-flags/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["id"] == restaurant.id
    assert response.data["name"] == restaurant.name
    assert response.data["plan"] == Restaurant.PLAN_PLUS
    assert response.data["payment_status"] == Restaurant.PAYMENT_ACTIVE
    assert response.data["feature_flags"] == {"table_map": False, "beta_waitlist": True}
    assert {"key": "beta_waitlist", "enabled": True} in response.data["managed_features"]
    assert "table_map" not in response.data["effective_features"]


def test_global_admin_can_update_feature_flags(client, global_admin, restaurant):
    client.force_authenticate(user=global_admin)

    response = client.patch(
        f"/api/v1/restaurants/{restaurant.id}/feature-flags/",
        {"feature_flags": {"table_map": True, "custom_waitlist": False}},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["feature_flags"] == {"table_map": True, "custom_waitlist": False}
    restaurant.refresh_from_db()
    assert restaurant.feature_flags == {"table_map": True, "custom_waitlist": False}
    assert restaurant.has_feature("table_map") is True
    assert restaurant.has_feature("custom_waitlist") is False
    assert RestaurantAuditLog.objects.filter(
        restaurant=restaurant,
        event_type="feature_flags_updated",
    ).exists()


def test_non_global_admin_cannot_access_feature_flags(client, restaurant_owner, restaurant):
    client.force_authenticate(user=restaurant_owner)

    response = client.get(f"/api/v1/restaurants/{restaurant.id}/feature-flags/")

    assert response.status_code == status.HTTP_403_FORBIDDEN

    response = client.patch(
        f"/api/v1/restaurants/{restaurant.id}/feature-flags/",
        {"feature_flags": {"table_map": True}},
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_invalid_feature_flags_payload_is_rejected(client, global_admin, restaurant):
    client.force_authenticate(user=global_admin)

    response = client.patch(
        f"/api/v1/restaurants/{restaurant.id}/feature-flags/",
        {"feature_flags": {"table_map": "yes"}},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["success"] is False
    assert "feature_flags" in response.data["errors"]
