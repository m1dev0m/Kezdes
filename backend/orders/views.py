from __future__ import annotations

from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError as DRFValidationError

from restaurants.models import Restaurant
from .models import MenuCategory, MenuItem, Order
from .permissions import IsRestaurantAdmin
from .serializers import (
    MenuCategorySerializer,
    MenuItemSerializer,
    OrderSerializer,
    CreateDraftOrderSerializer,
    UpsertOrderItemSerializer,
    ConfirmOrderSerializer,
)


from core.viewsets import TenantModelViewSet

class AdminMenuCategoryViewSet(TenantModelViewSet):
    queryset = MenuCategory.objects.all()
    serializer_class = MenuCategorySerializer
    permission_classes = [IsRestaurantAdmin]

class AdminMenuItemViewSet(TenantModelViewSet):
    queryset = MenuItem.objects.all().select_related("category", "restaurant")
    serializer_class = MenuItemSerializer
    permission_classes = [IsRestaurantAdmin]



class OrderViewSet(viewsets.ModelViewSet):
    """
    Customer order API.
    - user can only access their own orders
    - order items can be upserted via set_item
    - confirmation is atomic and validates availability + updates price snapshots
    """

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Order.objects.none()
        if not self.request.user.is_authenticated:
            return Order.objects.none()
        return (
            Order.objects.filter(user=self.request.user)
            .select_related("restaurant", "reservation")
            .prefetch_related("items__menu_item")
            .order_by("-created_at")
        )

    def create(self, request, *args, **kwargs):
        serializer = CreateDraftOrderSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(self.get_serializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def set_item(self, request, pk=None):
        order = self.get_object()
        serializer = UpsertOrderItemSerializer(
            data=request.data,
            context={"request": request, "order": order},
        )
        serializer.is_valid(raise_exception=True)
        updated_order = serializer.save()
        return Response(self.get_serializer(updated_order).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        order = self.get_object()
        serializer = ConfirmOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_mode = serializer.validated_data["payment_mode"]
        payment_status = Order.PaymentStatus.PAID if payment_mode == "pay_now" else Order.PaymentStatus.UNPAID

        try:
            result = order.confirm_atomic(payment_status=payment_status)
        except DjangoValidationError as e:
            raise DRFValidationError(e.message_dict if hasattr(e, "message_dict") else {"detail": str(e)})

        data = self.get_serializer(Order.objects.get(pk=order.pk)).data
        data["price_changes"] = result["price_changes"]
        data["already_confirmed"] = result["already_confirmed"]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        with transaction.atomic():
            locked = Order.objects.select_for_update().get(pk=order.pk)
            locked.cancel()
        return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)
