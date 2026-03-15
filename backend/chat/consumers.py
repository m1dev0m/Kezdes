import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.db.models import Q


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time chat between clients and restaurants.
    URL: ws/chat/<restaurant_id>/
    """

    async def connect(self):
        self.restaurant_id = self.scope['url_route']['kwargs']['restaurant_id']
        self.room_group_name = f'chat_{self.restaurant_id}'

        user = self.scope.get('user', AnonymousUser())
        if user.is_anonymous:
            await self.close()
            return

        if not await self.user_has_access(user, int(self.restaurant_id)):
            await self.close()
            return

        self.user = user

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive_json(self, content, **kwargs):
        message_content = content.get('message', '')
        if not message_content:
            return

        booking_id = content.get('booking_id')

        user = self.scope['user']

        if booking_id:
            booking_id = await self.validate_booking(user, int(self.restaurant_id), booking_id)

        msg = await self.save_message(user, self.restaurant_id, message_content, booking_id)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat.message',
                'message': {
                    'id': msg['id'],
                    'content': msg['content'],
                    'sender': msg['sender_id'],
                    'sender_name': msg['sender_name'],
                    'timestamp': msg['timestamp'],
                    'booking_id': msg.get('booking_id'),
                },
            }
        )

    async def chat_message(self, event):
        """Receive message from group and send to WebSocket."""
        await self.send_json(event['message'])

    @database_sync_to_async
    def user_has_access(self, user, restaurant_id):
        from restaurants.models import Restaurant
        from bookings.models import Booking

        try:
            restaurant = Restaurant.objects.get(id=restaurant_id)
        except Restaurant.DoesNotExist:
            return False

        if restaurant.owner_id == user.id:
            return True

        if hasattr(user, 'profile') and user.profile.restaurant_id == restaurant_id:
            return True

        return Booking.objects.filter(
            user=user,
            restaurant_id=restaurant_id,
            status__in=['pending', 'approved', 'completed']
        ).exists()

    @database_sync_to_async
    def validate_booking(self, user, restaurant_id, booking_id):
        from bookings.models import Booking
        exists = Booking.objects.filter(
            id=booking_id,
            restaurant_id=restaurant_id,
        ).filter(
            Q(user=user) | Q(restaurant__owner=user)
        ).exists()
        return booking_id if exists else None

    @database_sync_to_async
    def save_message(self, user, restaurant_id, content, booking_id=None):
        from .models import Message

        msg = Message.objects.create(
            sender=user,
            restaurant_id=restaurant_id,
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
        }
