from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


class BookingConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time booking status updates.
    URL: ws/bookings/<restaurant_id>/
    
    Admin users join restaurant group. Regular users join personal group.
    """

    async def connect(self):
        self.restaurant_id = self.scope['url_route']['kwargs']['restaurant_id']
        user = self.scope.get('user', AnonymousUser())

        if user.is_anonymous:
            await self.close()
            return

        is_admin = await self.is_restaurant_admin(user, self.restaurant_id)

        self.groups_joined = []

        if is_admin:
            group = f'bookings_restaurant_{self.restaurant_id}'
            self.groups_joined.append(group)
        else:
            group = f'bookings_user_{user.id}'
            self.groups_joined.append(group)

        for g in self.groups_joined:
            await self.channel_layer.group_add(g, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        for g in getattr(self, 'groups_joined', []):
            await self.channel_layer.group_discard(g, self.channel_name)

    async def booking_update(self, event):
        """Receive booking update from group and send to WebSocket."""
        await self.send_json(event['data'])

    @database_sync_to_async
    def is_restaurant_admin(self, user, restaurant_id):
        from restaurants.models import Restaurant
        try:
            restaurant = Restaurant.objects.get(id=restaurant_id)
            return restaurant.owner == user
        except Restaurant.DoesNotExist:
            return False
