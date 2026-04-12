from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from restaurants.models import Restaurant
from bookings.models import Booking
from .models import MenuCategory, MenuItem, Order, OrderItem
from core.models import Profile


class OrderFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="u1", password="pass12345")
        self.client.force_authenticate(self.user)

        self.staff = User.objects.create_user(username="staff1", password="pass12345")

        self.r1 = Restaurant.objects.create(
            name="R1",
            address="Addr",
            latitude=Decimal("43.238900"),
            longitude=Decimal("76.889700"),
            capacity=100,
        )
        self.r2 = Restaurant.objects.create(
            name="R2",
            address="Addr2",
            latitude=Decimal("43.238901"),
            longitude=Decimal("76.889701"),
            capacity=100,
        )
        self.r1.owner = self.staff
        self.r1.plan = Restaurant.PLAN_PLUS
        self.r1.feature_flags = {"orders_basic": True, "menu_basic": True}
        self.r1.save(update_fields=["owner", "plan", "feature_flags"])
        self.staff.profile.role = "owner"
        self.staff.profile.save(update_fields=["role"])

        self.cat = MenuCategory.objects.create(restaurant=self.r1, name="Main", order=1, is_active=True)
        self.item1 = MenuItem.objects.create(
            restaurant=self.r1,
            category=self.cat,
            name="Steak",
            price=Decimal("1000.00"),
            is_active=True,
            is_available=True,
            preparation_time=10,
        )
        self.item_other_restaurant = MenuItem.objects.create(
            restaurant=self.r2,
            name="Other",
            price=Decimal("500.00"),
            is_active=True,
            is_available=True,
        )
        self.inactive_item = MenuItem.objects.create(
            restaurant=self.r1,
            name="Inactive",
            price=Decimal("100.00"),
            is_active=False,
            is_available=True,
        )

    def test_cannot_add_inactive_item(self):
        res = self.client.post("/api/v1/orders/", {"restaurant_id": self.r1.id}, format="json")
        self.assertEqual(res.status_code, 201)
        order_id = res.data["id"]

        res2 = self.client.post(f"/api/v1/orders/{order_id}/set_item/", {"menu_item_id": self.inactive_item.id, "quantity": 1}, format="json")
        self.assertEqual(res2.status_code, 400)

    def test_cannot_add_cross_restaurant_item(self):
        res = self.client.post("/api/v1/orders/", {"restaurant_id": self.r1.id}, format="json")
        self.assertEqual(res.status_code, 201)
        order_id = res.data["id"]

        res2 = self.client.post(f"/api/v1/orders/{order_id}/set_item/", {"menu_item_id": self.item_other_restaurant.id, "quantity": 1}, format="json")
        self.assertEqual(res2.status_code, 400)

    def test_confirm_updates_price_snapshot(self):
        res = self.client.post("/api/v1/orders/", {"restaurant_id": self.r1.id}, format="json")
        self.assertEqual(res.status_code, 201)
        order_id = res.data["id"]

        res2 = self.client.post(f"/api/v1/orders/{order_id}/set_item/", {"menu_item_id": self.item1.id, "quantity": 2}, format="json")
        self.assertEqual(res2.status_code, 200)

        self.item1.price = Decimal("1200.00")
        self.item1.save(update_fields=["price"])

        res3 = self.client.post(f"/api/v1/orders/{order_id}/confirm/", {"payment_mode": "pay_later"}, format="json")
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.data["status"], "CONFIRMED")
        self.assertTrue(len(res3.data.get("price_changes") or []) >= 1)

        oi = OrderItem.objects.get(order_id=order_id, menu_item_id=self.item1.id)
        self.assertEqual(oi.price_snapshot, Decimal("1200.00"))

    def test_booking_cancel_autocancels_order(self):
        order = Order.objects.create(user=self.user, restaurant=self.r1, status=Order.Status.CONFIRMED)
        OrderItem.objects.create(order=order, menu_item=self.item1, quantity=1, price_snapshot=self.item1.price)

        booking = Booking.objects.create(
            user=self.user,
            restaurant=self.r1,
            date="2030-01-01",
            time="19:00",
            guests=2,
            status=Booking.APPROVED,
        )
        order.reservation = booking
        order.save(update_fields=["reservation"])

        booking.transition_to(Booking.CANCELLED_BY_USER)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)

    def test_customer_cannot_access_my_restaurant_orders(self):
        res = self.client.get("/api/v1/orders/my_restaurant/")
        self.assertEqual(res.status_code, 403)

    def test_owner_can_access_my_restaurant_orders(self):
        owner_client = APIClient()
        owner_client.force_authenticate(self.staff)
        Order.objects.create(user=self.user, restaurant=self.r1, status=Order.Status.DRAFT)
        res = owner_client.get("/api/v1/orders/my_restaurant/")
        self.assertEqual(res.status_code, 200)
        payload = res.data.get("results", res.data)
        self.assertEqual(len(payload), 1)

    def test_owner_can_access_admin_menu_items(self):
        owner_client = APIClient()
        owner_client.force_authenticate(self.staff)

        res = owner_client.get("/api/v1/orders/admin/items/")

        self.assertEqual(res.status_code, 200)

    def test_admin_menu_items_rejects_missing_profile_instead_of_500(self):
        broken_user = User.objects.create_user(username="broken_owner", password="pass12345")
        broken_user.profile.delete()

        broken_client = APIClient()
        broken_client.force_authenticate(broken_user)

        res = broken_client.get("/api/v1/orders/admin/items/")

        self.assertEqual(res.status_code, 403)
