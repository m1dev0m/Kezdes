from __future__ import annotations

from django.contrib.auth.models import User

from .models import Restaurant, RestaurantAuditLog


def log_restaurant_event(
    restaurant: Restaurant,
    *,
    event_type: str,
    summary: str,
    actor: User | None = None,
    target_type: str = "restaurant",
    target_id: str | int | None = None,
    payload: dict | None = None,
) -> RestaurantAuditLog:
    return RestaurantAuditLog.objects.create(
        restaurant=restaurant,
        actor=actor,
        event_type=event_type,
        target_type=target_type,
        target_id=str(target_id or ""),
        summary=summary,
        payload=payload or {},
    )
