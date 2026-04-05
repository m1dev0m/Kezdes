from datetime import time

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from bookings.models import Booking
from chat.models import Conversation, Message
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

    def test_start_direct_conversation_from_booking(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            "/api/v1/chat/conversations/start/",
            {"booking_id": self.booking1.id},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(Conversation.objects.filter(restaurant=self.restaurant, guest=self.customer).exists())

    def test_direct_messages_filter_by_conversation(self):
        conversation = Conversation.objects.create(restaurant=self.restaurant, guest=self.customer)
        other_guest = User.objects.create_user("other", "other@test.local", "pass1234")
        other_conversation = Conversation.objects.create(restaurant=self.restaurant, guest=other_guest)
        Message.objects.create(conversation=conversation, restaurant=self.restaurant, sender=self.customer, content="main")
        Message.objects.create(conversation=other_conversation, restaurant=self.restaurant, sender=other_guest, content="other")

        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f"/api/v1/chat/messages/?conversation={conversation.id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["content"], "main")

    def test_mark_read_scoped_to_guest_conversation(self):
        other_guest = User.objects.create_user("guest2", "guest2@test.local", "pass1234")
        conversation = Conversation.objects.create(restaurant=self.restaurant, guest=self.customer)
        other_conversation = Conversation.objects.create(restaurant=self.restaurant, guest=other_guest)

        msg1 = Message.objects.create(
            conversation=conversation,
            restaurant=self.restaurant,
            sender=self.owner,
            content="to main guest",
        )
        msg2 = Message.objects.create(
            conversation=other_conversation,
            restaurant=self.restaurant,
            sender=self.owner,
            content="to other guest",
        )

        self.client.force_authenticate(user=self.customer)
        res = self.client.post(
            "/api/v1/chat/messages/mark_read/",
            {"conversation": conversation.id},
            format="json",
        )
        self.assertEqual(res.status_code, 200)

        msg1.refresh_from_db()
        msg2.refresh_from_db()
        self.assertTrue(msg1.is_read)
        self.assertFalse(msg2.is_read)

    def test_guest_cannot_mark_read_by_restaurant(self):
        self.client.force_authenticate(user=self.customer)
        res = self.client.post(
            "/api/v1/chat/messages/mark_read/",
            {"restaurant": self.restaurant.id},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
