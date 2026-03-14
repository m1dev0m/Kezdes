from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from restaurants.models import Restaurant
from .models import MenuCategory, MenuItem, Order, OrderItem


class MenuCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuCategory
        fields = ["id", "restaurant", "name", "order", "is_active"]
        read_only_fields = ["restaurant"]


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = [
            "id",
            "restaurant",
            "category",
            "name",
            "description",
            "price",
            "image",
            "is_available",
            "is_active",
            "preparation_time",
            "created_at",
        ]
        read_only_fields = ["restaurant", "created_at"]

    def validate_category(self, value: MenuCategory | None):
        if value is None:
            return value
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return value
        owned = getattr(request.user, "owned_restaurant", None)
        if owned and value.restaurant_id != owned.id:
            raise serializers.ValidationError("Category must belong to your restaurant.")
        return value


class PublicMenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = [
            "id",
            "category",
            "name",
            "description",
            "price",
            "image",
            "is_available",
            "preparation_time",
            "created_at",
        ]


class PublicMenuCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuCategory
        fields = ["id", "name", "order"]


class OrderItemReadSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)
    menu_item_image = serializers.ImageField(source="menu_item.image", read_only=True)
    is_available = serializers.BooleanField(source="menu_item.is_available", read_only=True)
    is_active = serializers.BooleanField(source="menu_item.is_active", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "menu_item",
            "menu_item_name",
            "menu_item_image",
            "quantity",
            "price_snapshot",
            "is_available",
            "is_active",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "reservation",
            "user",
            "restaurant",
            "status",
            "payment_status",
            "total_amount",
            "created_at",
            "items",
        ]
        read_only_fields = [
            "reservation",
            "user",
            "status",
            "payment_status",
            "total_amount",
            "created_at",
        ]


class CreateDraftOrderSerializer(serializers.Serializer):
    restaurant_id = serializers.IntegerField()

    def validate_restaurant_id(self, value: int) -> int:
        if not Restaurant.objects.filter(id=value).exists():
            raise serializers.ValidationError("Restaurant not found.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        restaurant = Restaurant.objects.get(id=validated_data["restaurant_id"])
        order, _created = Order.objects.get_or_create(
            user=request.user,
            restaurant=restaurant,
            status=Order.Status.DRAFT,
            reservation__isnull=True,
            defaults={},
        )
        return order


class UpsertOrderItemSerializer(serializers.Serializer):
    menu_item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=0, max_value=1000)

    def validate_menu_item_id(self, value: int) -> int:
        try:
            mi = MenuItem.objects.select_related("restaurant").get(id=value)
        except MenuItem.DoesNotExist:
            raise serializers.ValidationError("Menu item not found.")
        if not mi.is_active:
            raise serializers.ValidationError("Item is inactive.")
        if not mi.is_available:
            raise serializers.ValidationError("Item is not available.")
        return value

    def save(self, **kwargs):
        request = self.context["request"]
        order: Order = self.context["order"]
        if order.user_id != request.user.id:
            raise serializers.ValidationError("Permission denied.")
        if not order.is_editable:
            raise serializers.ValidationError("Order is not editable.")

        mi = MenuItem.objects.select_related("restaurant").get(id=self.validated_data["menu_item_id"])
        if mi.restaurant_id != order.restaurant_id:
            raise serializers.ValidationError("Users cannot order items from another restaurant.")

        qty = self.validated_data["quantity"]
        with transaction.atomic():
            Order.objects.select_for_update().get(pk=order.pk)
            if qty == 0:
                OrderItem.objects.filter(order=order, menu_item=mi).delete()
            else:
                oi, _created = OrderItem.objects.update_or_create(
                    order=order,
                    menu_item=mi,
                    defaults={"quantity": qty, "price_snapshot": mi.price},
                )
                try:
                    oi.full_clean()
                except DjangoValidationError as e:
                    raise serializers.ValidationError(e.message_dict if hasattr(e, "message_dict") else str(e))

            order.recalc_total()
            order.save(update_fields=["total_amount"])
        return order


class ConfirmOrderSerializer(serializers.Serializer):
    payment_mode = serializers.ChoiceField(choices=[("pay_now", "pay_now"), ("pay_later", "pay_later")])

