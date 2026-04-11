import asyncio
from datetime import time
from contextlib import suppress
from unittest.mock import Mock, patch

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase, override_settings
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from bookings.models import Booking
from config.asgi import application
from chat.models import Conversation, Message
from restaurants.models import Restaurant
from core.models import Profile


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

    def test_staff_cannot_bulk_mark_read_by_restaurant(self):
        other_guest = User.objects.create_user("guest3", "guest3@test.local", "pass1234")
        conversation = Conversation.objects.create(restaurant=self.restaurant, guest=self.customer)
        other_conversation = Conversation.objects.create(restaurant=self.restaurant, guest=other_guest)

        msg1 = Message.objects.create(
            conversation=conversation,
            restaurant=self.restaurant,
            sender=self.customer,
            content="hello owner from guest one",
        )
        msg2 = Message.objects.create(
            conversation=other_conversation,
            restaurant=self.restaurant,
            sender=other_guest,
            content="hello owner from guest two",
        )

        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            "/api/v1/chat/messages/mark_read/",
            {"restaurant": self.restaurant.id},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

        msg1.refresh_from_db()
        msg2.refresh_from_db()
        self.assertFalse(msg1.is_read)
        self.assertFalse(msg2.is_read)

    def test_mark_read_with_missing_profile_does_not_500(self):
        Profile.objects.filter(user=self.owner).delete()
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            "/api/v1/chat/messages/mark_read/",
            {"restaurant": self.restaurant.id},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_rest_create_broadcasts_realtime_message(self):
        mock_layer = Mock()
        self.client.force_authenticate(user=self.customer)

        with patch("chat.views.get_channel_layer", return_value=mock_layer), patch("chat.views.async_to_sync") as mock_async_to_sync:
            mock_group_send = mock_async_to_sync.return_value
            res = self.client.post(
                "/api/v1/chat/messages/",
                {"booking": self.booking1.id, "content": "live hello"},
                format="json",
            )

        self.assertEqual(res.status_code, 201)
        self.assertEqual(mock_async_to_sync.call_count, 2)
        self.assertEqual(mock_group_send.call_count, 2)
        calls = mock_group_send.call_args_list
        first_args = calls[0].args
        second_args = calls[1].args
        self.assertEqual(first_args[0], f"chat_restaurant_{self.restaurant.id}")
        self.assertEqual(second_args[0], f"chat_user_{self.customer.id}")
        self.assertEqual(first_args[1]["type"], "chat.message")
        self.assertEqual(first_args[1]["message"]["content"], "live hello")
        self.assertEqual(first_args[1]["message"]["restaurant_id"], self.restaurant.id)
        self.assertEqual(first_args[1]["message"]["conversation_id"], second_args[1]["message"]["conversation_id"])


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
)
class ChatRealtimeIsolationTests(TransactionTestCase):
    def setUp(self):
        self.owner = User.objects.create_user("ws_owner", "ws_owner@test.local", "pass1234")
        self.guest = User.objects.create_user("ws_guest", "ws_guest@test.local", "pass1234")
        self.other_guest = User.objects.create_user("ws_other_guest", "ws_other_guest@test.local", "pass1234")

        self.restaurant = Restaurant.objects.create(
            name="WS Restaurant",
            address="Addr",
            city="City",
            latitude=43.238949,
            longitude=76.889709,
            is_verified=True,
            capacity=50,
            owner=self.owner,
            phone="+77001112233",
        )

        booking_date = timezone.localdate() + timezone.timedelta(days=1)
        self.guest_booking = Booking.objects.create(
            user=self.guest,
            restaurant=self.restaurant,
            date=booking_date,
            time=time(19, 0),
            guests=2,
            status=Booking.CONFIRMED,
        )
        self.other_guest_booking = Booking.objects.create(
            user=self.other_guest,
            restaurant=self.restaurant,
            date=booking_date,
            time=time(20, 0),
            guests=2,
            status=Booking.CONFIRMED,
        )

    def _communicator(self, user):
        token = str(AccessToken.for_user(user))
        return WebsocketCommunicator(application, f"/ws/chat/{self.restaurant.id}/?token={token}")

    def test_guest_websocket_receives_only_own_thread(self):
        async def scenario():
            owner_socket = self._communicator(self.owner)
            guest_socket = self._communicator(self.guest)
            other_guest_socket = self._communicator(self.other_guest)

            owner_connected, _ = await owner_socket.connect()
            guest_connected, _ = await guest_socket.connect()
            other_guest_connected, _ = await other_guest_socket.connect()

            self.assertTrue(owner_connected)
            self.assertTrue(guest_connected)
            self.assertTrue(other_guest_connected)

            await owner_socket.send_json_to({"message": "hello guest one", "booking_id": self.guest_booking.id})

            owner_payload = await owner_socket.receive_json_from(timeout=1)
            guest_payload = await guest_socket.receive_json_from(timeout=1)

            self.assertEqual(owner_payload["content"], "hello guest one")
            self.assertEqual(guest_payload["content"], "hello guest one")
            self.assertEqual(guest_payload["booking_id"], self.guest_booking.id)

            with self.assertRaises(asyncio.TimeoutError):
                await other_guest_socket.receive_json_from(timeout=0.2)

            with suppress(BaseException):
                await owner_socket.disconnect()
            with suppress(BaseException):
                await guest_socket.disconnect()
            with suppress(BaseException):
                await other_guest_socket.disconnect()

        async_to_sync(scenario)()

    def test_staff_can_send_direct_conversation_over_websocket(self):
        conversation = Conversation.objects.create(restaurant=self.restaurant, guest=self.guest)

        async def scenario():
            owner_socket = self._communicator(self.owner)
            guest_socket = self._communicator(self.guest)

            owner_connected, _ = await owner_socket.connect()
            guest_connected, _ = await guest_socket.connect()

            self.assertTrue(owner_connected)
            self.assertTrue(guest_connected)

            await owner_socket.send_json_to({"message": "direct ping", "conversation_id": conversation.id})

            guest_payload = await guest_socket.receive_json_from(timeout=1)
            self.assertEqual(guest_payload["content"], "direct ping")
            self.assertEqual(guest_payload["conversation_id"], conversation.id)
            self.assertEqual(guest_payload["restaurant_id"], self.restaurant.id)

            with suppress(BaseException):
                await owner_socket.disconnect()
            with suppress(BaseException):
                await guest_socket.disconnect()

        async_to_sync(scenario)()

    def test_guest_without_profile_can_connect_and_send_with_booking_access(self):
        Profile.objects.filter(user=self.guest).delete()

        async def scenario():
            guest_socket = self._communicator(self.guest)
            connected, _ = await guest_socket.connect()
            self.assertTrue(connected)

            await guest_socket.send_json_to({"message": "guest ping", "booking_id": self.guest_booking.id})
            guest_payload = await guest_socket.receive_json_from(timeout=1)
            self.assertEqual(guest_payload["content"], "guest ping")
            self.assertEqual(guest_payload["booking_id"], self.guest_booking.id)

            with suppress(BaseException):
                await guest_socket.disconnect()

        async_to_sync(scenario)()
