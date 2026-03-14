import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


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
    def save_message(self, user, restaurant_id, content, booking_id=None):
        from .models import Message
        from restaurants.models import Restaurant

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
