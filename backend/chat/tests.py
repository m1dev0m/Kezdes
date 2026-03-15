from datetime import time

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from bookings.models import Booking
from chat.models import Message
from restaurants.models import Restaurant


class ChatMessagesAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", "owner@test.local", "pass1234")
        self.customer = User.objects.create_user("customer", "customer@test.local", "pass1234")

        self.restaurant = Restaurant.objects.create(
            name="R1",
            address="Addr",
            city="City",
            latitude=43.238949,
            longitude=76.889709,
            is_verified=True,
            capacity=50,
            owner=self.owner,
            phone="+77001112233",
        )

        self.booking1 = Booking.objects.create(
            user=self.customer,
            restaurant=self.restaurant,
            date=timezone.localdate() + timezone.timedelta(days=1),
            time=time(19, 0),
            guests=2,
            status=Booking.PENDING,
        )
        self.booking2 = Booking.objects.create(
            user=self.customer,
            restaurant=self.restaurant,
            date=timezone.localdate() + timezone.timedelta(days=1),
            time=time(20, 0),
            guests=2,
            status=Booking.PENDING,
        )

    def test_list_filters_by_booking(self):
        Message.objects.create(booking=self.booking1, sender=self.customer, content="m1")
        Message.objects.create(booking=self.booking2, sender=self.customer, content="m2")

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f"/api/v1/chat/messages/?booking={self.booking1.id}")
        self.assertEqual(res.status_code, 200)

        data = res.data
        self.assertTrue(isinstance(data, list))
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["booking"], self.booking1.id)
        self.assertEqual(data[0]["content"], "m1")

    def test_list_ordering_is_stable(self):
        m1 = Message.objects.create(booking=self.booking1, sender=self.customer, content="first")
        m2 = Message.objects.create(booking=self.booking1, sender=self.customer, content="second")

        self.client.force_authenticate(user=self.customer)
        res = self.client.get(f"/api/v1/chat/messages/?booking={self.booking1.id}")
        self.assertEqual(res.status_code, 200)

        ids = [m["id"] for m in res.data]
        self.assertEqual(ids, [m1.id, m2.id])

    def test_create_requires_booking_or_restaurant(self):
        self.client.force_authenticate(user=self.customer)
        res = self.client.post("/api/v1/chat/messages/", {"content": "hi"}, format="json")
        self.assertEqual(res.status_code, 400)
