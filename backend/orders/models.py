from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Q, F

from restaurants.models import Restaurant


class MenuCategory(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="menu_categories")
    name = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["restaurant", "is_active", "order"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "name"],
                condition=Q(is_active=True),
                name="uniq_active_category_name_per_restaurant",
            )
        ]

    def __str__(self) -> str:
        return f"{self.restaurant_id}:{self.name}"


class MenuItem(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="menu_items")
    category = models.ForeignKey(
        MenuCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="items",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to="menu_items/", blank=True, null=True)
    is_available = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    preparation_time = models.PositiveIntegerField(default=0, help_text="Preparation time in minutes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "created_at"]),
            models.Index(fields=["restaurant", "is_active", "is_available"]),
            models.Index(fields=["category"]),
        ]

    def clean(self) -> None:
        if self.category and self.category.restaurant_id != self.restaurant_id:
            raise ValidationError({"category": "Category must belong to the same restaurant."})

    def __str__(self) -> str:
        return f"{self.restaurant_id}:{self.name}"


class Order(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"

    class PaymentStatus(models.TextChoices):
        UNPAID = "UNPAID", "Unpaid"
        PAID = "PAID", "Paid"

    reservation = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="orders")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    payment_status = models.CharField(max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["restaurant", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["reservation"],
                condition=Q(reservation__isnull=False),
                name="uniq_order_per_reservation",
            ),
            models.UniqueConstraint(
                fields=["user", "restaurant"],
                condition=Q(status="DRAFT", reservation__isnull=True),
                name="uniq_draft_order_per_user_restaurant",
            ),
        ]

    def __str__(self) -> str:
        return f"Order {self.id} ({self.status})"

    @property
    def is_editable(self) -> bool:
        return self.status == self.Status.DRAFT and self.reservation_id is None

    def recalc_total(self) -> Decimal:
        total = self.items.aggregate(
            total=models.Sum(F("quantity") * F("price_snapshot"), output_field=models.DecimalField(max_digits=12, decimal_places=2))
        )["total"] or Decimal("0.00")
        self.total_amount = total
        return total

    def cancel(self) -> None:
        if self.status == self.Status.CANCELLED:
            return
        self.status = self.Status.CANCELLED
        self.save(update_fields=["status"])

    def confirm_atomic(self, *, payment_status: str | None = None) -> dict:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=self.pk)
            if order.status == Order.Status.CANCELLED:
                raise ValidationError("Order is cancelled.")
            if order.status == Order.Status.CONFIRMED:
                return {"already_confirmed": True, "price_changes": []}
            if order.status != Order.Status.DRAFT:
                raise ValidationError("Order cannot be confirmed.")

            order_items = list(
                OrderItem.objects.select_for_update()
                .select_related("menu_item")
                .filter(order=order)
            )
            if not order_items:
                raise ValidationError("Order is empty.")

            invalid = []
            price_changes = []
            for oi in order_items:
                mi = oi.menu_item
                if mi.restaurant_id != order.restaurant_id:
                    invalid.append({"menu_item_id": mi.id, "reason": "cross_restaurant"})
                    continue
                if not mi.is_active:
                    invalid.append({"menu_item_id": mi.id, "reason": "inactive"})
                    continue
                if not mi.is_available:
                    invalid.append({"menu_item_id": mi.id, "reason": "unavailable"})
                    continue
                if oi.quantity <= 0:
                    invalid.append({"menu_item_id": mi.id, "reason": "invalid_quantity"})
                    continue

                if oi.price_snapshot != mi.price:
                    price_changes.append(
                        {
                            "menu_item_id": mi.id,
                            "old_price": str(oi.price_snapshot),
                            "new_price": str(mi.price),
                        }
                    )
                    oi.price_snapshot = mi.price
                    oi.save(update_fields=["price_snapshot"])

            if invalid:
                raise ValidationError({"items": invalid})

            order.recalc_total()
            order.status = Order.Status.CONFIRMED
            if payment_status:
                order.payment_status = payment_status
            order.save(update_fields=["total_amount", "status", "payment_status"])
            return {"already_confirmed": False, "price_changes": price_changes}


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveIntegerField(default=1)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["order", "menu_item"], name="uniq_menu_item_per_order"),
        ]

    def clean(self) -> None:
        if self.menu_item.restaurant_id != self.order.restaurant_id:
            raise ValidationError("Users cannot order items from another restaurant.")
        if not self.menu_item.is_active or not self.menu_item.is_available:
            raise ValidationError("Inactive/unavailable items cannot be added to order.")

    def __str__(self) -> str:
        return f"{self.order_id}:{self.menu_item_id} x{self.quantity}"

