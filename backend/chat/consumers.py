from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
import logging


logger = logging.getLogger(__name__)


class ChatConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.last_msg_time = 0
        self.restaurant_id = int(self.scope['url_route']['kwargs']['restaurant_id'])
        self._access_cache = {"restaurant_id": self.restaurant_id}
        self._validated_bookings = {}
        self._validated_conversations = {}
        self._owner_id = None
        self._is_staff = False
        self._profile = None

        user = self.scope.get('user', AnonymousUser())
        if user.is_anonymous:
            await self.close()
            return

        if not await self.user_has_access(user, self.restaurant_id):
            await self.close()
            return

        self._owner_id = self._access_cache.get("owner_id")
        self._is_staff = self._access_cache.get("is_staff", False)

        self.user = user
        self.groups_joined = []

        # Use cached staff flag from user_has_access; no extra DB call
        if self._is_staff:
            self.groups_joined.append(f'chat_restaurant_{self.restaurant_id}')
        else:
            self.groups_joined.append(f'chat_user_{user.id}')

        for group_name in self.groups_joined:
            await self.channel_layer.group_add(group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        for group_name in getattr(self, 'groups_joined', []):
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        import time
        from django.core.cache import cache

        user = self.scope['user']
        user_id = user.id if user.is_authenticated else self.channel_name
        cache_key = f"ws_ratelimit:{user_id}"

                                                                           
        capacity = 10
        refill_rate = 5
        now = time.time()

        try:
            bucket = await cache.aget(cache_key)
            if bucket is None:
                tokens = capacity - 1
                await cache.aset(cache_key, (tokens, now), timeout=60)
            else:
                tokens, last_update = bucket
                elapsed = now - last_update
                tokens = min(capacity, tokens + elapsed * refill_rate)
                if tokens < 1:
                    await self.send_json({'type': 'error', 'message': 'Rate limit exceeded. Please slow down.'})
                    return
                tokens -= 1
                await cache.aset(cache_key, (tokens, now), timeout=60)
        except Exception as exc:
            logger.warning("Chat rate limit cache unavailable for restaurant %s: %s", self.restaurant_id, exc)

        message_content = content.get('message', '')
        if not message_content:
            return

        booking_id = self._coerce_int(content.get('booking_id'))
        conversation_id = self._coerce_int(content.get('conversation_id'))

        if booking_id:
            booking_id = await self.validate_booking(user, self.restaurant_id, booking_id)
        if conversation_id:
            conversation_id = await self.validate_conversation(user, self.restaurant_id, conversation_id)

        booking_obj = self._validated_bookings.get(booking_id) if booking_id else None
        conversation_obj = self._validated_conversations.get(conversation_id) if conversation_id else None

        msg = await self.save_message(
            user,
            self.restaurant_id,
            message_content,
            booking_id=booking_id,
            conversation_id=conversation_id,
            booking_obj=booking_obj,
            conversation_obj=conversation_obj,
        )

        payload = {
            'type': 'chat.message',
            'message': {
                'id': msg['id'],
                'content': msg['content'],
                'sender': msg['sender_id'],
                'sender_name': msg['sender_name'],
                'timestamp': msg['timestamp'],
                'booking_id': msg.get('booking_id'),
                'conversation_id': msg.get('conversation_id'),
                'restaurant_id': msg.get('restaurant_id'),
            },
        }
        await self.channel_layer.group_send(f'chat_restaurant_{self.restaurant_id}', payload)
        await self.channel_layer.group_send(f'chat_user_{msg["guest_id"]}', payload)

    async def chat_message(self, event):
        
        await self.send_json(event['message'])

    @database_sync_to_async
    def user_has_access(self, user, restaurant_id):
        from restaurants.models import Restaurant
        from bookings.models import Booking
        from .models import Conversation
        from core.utils import get_user_profile

        restaurant = Restaurant.objects.only("id", "owner_id").filter(id=restaurant_id).first()
        if restaurant is None:
            return False

        self._profile = get_user_profile(user)
        is_staff = self._is_restaurant_staff(user, restaurant_id, restaurant.owner_id)
        self._access_cache = {
            "restaurant_id": restaurant_id,
            "owner_id": restaurant.owner_id,
            "is_staff": is_staff,
        }
        if is_staff:
            return True

        if Conversation.objects.filter(restaurant_id=restaurant_id, guest_id=user.id).exists():
            return True

        return Booking.objects.filter(
            user=user,
            restaurant_id=restaurant_id,
            status__in=['pending', 'approved', 'confirmed', 'seated', 'completed']
        ).exists()

    @database_sync_to_async
    def is_restaurant_staff(self, user, restaurant_id):
        cache = getattr(self, "_access_cache", {})
        if cache.get("restaurant_id") == restaurant_id and "is_staff" in cache:
            return bool(cache.get("is_staff"))

        owner_id = self._get_owner_id_for_restaurant(restaurant_id)
        is_staff = self._is_restaurant_staff(user, restaurant_id, owner_id)
        self._access_cache = {
            "restaurant_id": restaurant_id,
            "owner_id": owner_id,
            "is_staff": is_staff,
        }
        return is_staff

    @database_sync_to_async
    def validate_booking(self, user, restaurant_id, booking_id):
        from bookings.models import Booking
        owner_id = self._get_owner_id_for_restaurant(restaurant_id)
        booking = Booking.objects.filter(
            id=booking_id,
            restaurant_id=restaurant_id,
        ).only("id", "user_id").first()
        if booking is None:
            return None

        exists = booking.user_id == user.id or self._is_restaurant_staff(
            user,
            restaurant_id,
            owner_id,
        )
        if exists:
            self._validated_bookings[booking_id] = booking
        return booking_id if exists else None

    @database_sync_to_async
    def validate_conversation(self, user, restaurant_id, conversation_id):
        from .models import Conversation

        conversation = Conversation.objects.filter(id=conversation_id, restaurant_id=restaurant_id).first()
        if conversation is None:
            return None

        owner_id = self._get_owner_id_for_restaurant(restaurant_id)
        if conversation.guest_id == user.id or self._is_restaurant_staff(user, restaurant_id, owner_id):
            self._validated_conversations[conversation_id] = conversation
            return conversation_id
        return None

    def _get_owner_id_for_restaurant(self, restaurant_id):
        if self._owner_id is not None:
            return self._owner_id
        return self._access_cache.get("owner_id")

    def _is_restaurant_staff(self, user, restaurant_id, owner_id=None):
        if not user:
            return False
        if owner_id == user.id:
            return True

        profile = getattr(self, "_profile", None)
        if profile is None:
            return False
        if getattr(profile, "role", None) == "global_admin":
            return True
        return getattr(profile, "restaurant_id", None) == restaurant_id

    @staticmethod
    def _coerce_int(value):
        if value in (None, ""):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @database_sync_to_async
    def save_message(self, user, restaurant_id, content, booking_id=None, conversation_id=None, booking_obj=None, conversation_obj=None):
        from .models import Conversation, Message
        from bookings.models import Booking

        guest_id = user.id
        conv = conversation_obj
        if conv is not None:
            guest_id = conv.guest_id

        if conv is None and conversation_id:
            conv = Conversation.objects.filter(id=conversation_id, restaurant_id=restaurant_id).first()
            if conv:
                guest_id = conv.guest_id

        if conv is None and booking_id:
            b = booking_obj or Booking.objects.filter(id=booking_id, restaurant_id=restaurant_id).only('id', 'user_id').first()
            if b and b.user_id:
                guest_id = b.user_id

        if conv is None:
            conv, _ = Conversation.objects.get_or_create(restaurant_id=restaurant_id, guest_id=guest_id)

        msg = Message.objects.create(
            sender=user,
            restaurant_id=restaurant_id,
            conversation=conv,
            content=content,
            booking_id=booking_id,
        )
        return {
            'id': msg.id,
            'content': msg.content,
            'sender_id': msg.sender_id,
            'sender_name': user.username,
            'timestamp': msg.timestamp.isoformat(),
            'booking_id': msg.booking_id,
            'conversation_id': msg.conversation_id,
            'restaurant_id': msg.restaurant_id,
            'guest_id': guest_id,
        }
