import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class BookingConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time booking status updates.
    URL: ws/bookings/<id>/

    Backwards compatible behavior:
    - If <id> matches a Booking the user has access to, it is treated as booking_id
      and the restaurant_id is derived from that booking.
    - Otherwise <id> is treated as restaurant_id.

    Admin/staff users join restaurant group. Regular users join personal group.
    """

    async def connect(self):
        kwargs = (self.scope.get('url_route') or {}).get('kwargs') or {}
        raw_id = kwargs.get('id') or kwargs.get('restaurant_id') or kwargs.get('booking_id')
        self.restaurant_id = None

        try:
            raw_id_int = int(raw_id)
        except (TypeError, ValueError):
            await self.close()
            return

        user = self.scope.get('user', AnonymousUser())

        if user.is_anonymous:
            await self.close()
            return

        try:
            booking_restaurant_id = await self.get_restaurant_id_from_booking_if_accessible(user, raw_id_int)
            resolved_restaurant_id = booking_restaurant_id if booking_restaurant_id is not None else raw_id_int
            self.restaurant_id = str(resolved_restaurant_id)

            is_admin = await self.is_restaurant_admin_or_staff(user, self.restaurant_id)

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
        except Exception:
            logger.exception("Booking websocket connection failed for raw id %s", raw_id)
            await self.close()

    async def disconnect(self, close_code):
        for g in getattr(self, 'groups_joined', []):
            await self.channel_layer.group_discard(g, self.channel_name)

    async def booking_update(self, event):
        """Receive booking update from group and send to WebSocket."""
        payload = event.get('data')
        if payload is None and 'booking' in event:
            payload = event.get('booking')

        if payload is None:
            return

        await self.send_json({
            'type': 'booking_update',
            'booking': payload,
        })

    @database_sync_to_async
    def is_restaurant_admin_or_staff(self, user, restaurant_id):
        return self.is_restaurant_admin_or_staff_sync(user, restaurant_id)

    @database_sync_to_async
    def get_restaurant_id_from_booking_if_accessible(self, user, booking_id):
        from bookings.models import Booking

        booking = (
            Booking.objects.select_related('restaurant', 'user')
            .filter(pk=booking_id)
            .first()
        )
        if booking is None:
            return None

        if booking.user_id == getattr(user, 'id', None):
            return booking.restaurant_id

        if self.is_restaurant_admin_or_staff_sync(user, booking.restaurant_id):
            return booking.restaurant_id

        return None

    def is_restaurant_admin_or_staff_sync(self, user, restaurant_id):
        from restaurants.models import Restaurant

        try:
            restaurant = Restaurant.objects.select_related('owner').get(id=restaurant_id)
        except Restaurant.DoesNotExist:
            return False

        if restaurant.owner == user:
            return True

        profile = getattr(user, 'profile', None)
        if profile is None:
            return False
        if getattr(profile, 'role', None) == 'global_admin':
            return True
        if profile.restaurant_id == int(restaurant_id):
            return profile.role in ('owner', 'manager', 'host')
        return False
