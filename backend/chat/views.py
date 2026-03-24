from rest_framework import viewsets, permissions, decorators, response
from django.db.models import Q
from rest_framework import status

from .models import Message
from .serializers import MessageSerializer


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Message.objects.none()

        user = self.request.user
        if not user or not user.is_authenticated:
            return Message.objects.none()

        qs = Message.objects.select_related("booking", "restaurant", "sender", "booking__restaurant").filter(
            Q(booking__user=user) | 
            Q(booking__restaurant__owner=user) |
            Q(restaurant__owner=user) |
            Q(restaurant__id__in=Message.objects.filter(sender=user).values('restaurant_id')) |
            Q(sender=user)
        ).distinct()

        booking_id = self.request.query_params.get("booking")
        if booking_id:
            try:
                bid = int(booking_id)
                from bookings.models import Booking
                from .models import Conversation
                b = Booking.objects.select_related('restaurant', 'user').filter(id=bid).first()
                if b and b.user_id and b.restaurant_id:
                    conv = Conversation.objects.filter(
                        restaurant_id=b.restaurant_id, guest_id=b.user_id
                    ).first()
                    if conv:
                        qs = qs.filter(conversation_id=conv.id)
                    else:
                        # No conversation yet — fall back to direct booking FK
                        qs = qs.filter(booking_id=bid)
                else:
                    qs = qs.filter(booking_id=bid)
            except (TypeError, ValueError):
                pass

        restaurant_id = self.request.query_params.get("restaurant") or self.request.query_params.get("restaurant_id")
        if restaurant_id:
            try:
                qs = qs.filter(restaurant_id=int(restaurant_id))
            except (TypeError, ValueError):
                pass

        return qs.order_by("timestamp", "id")

    def perform_create(self, serializer):
        booking = serializer.validated_data.get('booking') if hasattr(serializer, 'validated_data') else None
        restaurant = serializer.validated_data.get('restaurant') if hasattr(serializer, 'validated_data') else None

        conversation = None
        if booking and booking.user_id and booking.restaurant_id:
            from .models import Conversation
            conversation, _ = Conversation.objects.get_or_create(restaurant_id=booking.restaurant_id, guest_id=booking.user_id)
            restaurant = restaurant or booking.restaurant
        elif restaurant:
            # For direct restaurant chat (guest side) we consider the guest as the sender.
            from .models import Conversation
            conversation, _ = Conversation.objects.get_or_create(restaurant_id=restaurant.id, guest_id=self.request.user.id)

        serializer.save(sender=self.request.user, conversation=conversation, restaurant=restaurant)

    @decorators.action(detail=False, methods=["get"])
    def unread_count(self, request):
        user = request.user
        qs = Message.objects.filter(
            Q(is_read=False) & (
                Q(booking__user=user) | 
                Q(booking__restaurant__owner=user) |
                Q(restaurant__owner=user) |
                Q(restaurant__id__in=Message.objects.filter(sender=user).values('restaurant_id'))
            )
        ).exclude(sender=user).distinct()
        return response.Response({"unread": qs.count()})

    @decorators.action(detail=False, methods=["post"])
    def mark_read(self, request):
        """
        Marks messages as read for a single thread.
        Accepts either:
        - booking: booking id (resolves to Conversation restaurant+guest)
        - restaurant: restaurant id (marks messages in that restaurant thread for the current user)
        """
        user = request.user
        booking_id = request.data.get("booking")
        restaurant_id = request.data.get("restaurant") or request.data.get("restaurant_id")

        qs = Message.objects.filter(is_read=False).exclude(sender=user)

        if booking_id:
            try:
                from bookings.models import Booking
                from .models import Conversation
                b = Booking.objects.select_related('restaurant', 'user').filter(id=int(booking_id)).first()
                if not b or not b.user_id or not b.restaurant_id:
                    return response.Response({"detail": "Invalid booking"}, status=status.HTTP_400_BAD_REQUEST)
                conv = Conversation.objects.filter(restaurant_id=b.restaurant_id, guest_id=b.user_id).first()
                if not conv:
                    return response.Response({"updated": 0})
                updated = qs.filter(conversation_id=conv.id).update(is_read=True)
                return response.Response({"updated": updated})
            except (TypeError, ValueError):
                return response.Response({"detail": "Invalid booking"}, status=status.HTTP_400_BAD_REQUEST)

        if restaurant_id:
            try:
                rid = int(restaurant_id)
            except (TypeError, ValueError):
                return response.Response({"detail": "Invalid restaurant"}, status=status.HTTP_400_BAD_REQUEST)

            # Verify user belongs to this restaurant
            from restaurants.models import Restaurant
            restaurant_obj = Restaurant.objects.filter(id=rid).first()
            if not restaurant_obj:
                return response.Response({"detail": "Restaurant not found"}, status=status.HTTP_404_NOT_FOUND)
            is_owner = restaurant_obj.owner_id == user.id
            is_staff = hasattr(user, 'profile') and getattr(user.profile, 'restaurant_id', None) == rid
            is_guest = Message.objects.filter(restaurant_id=rid, sender=user).exists()
            if not (is_owner or is_staff or is_guest):
                return response.Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

            updated = qs.filter(restaurant_id=rid).update(is_read=True)
            return response.Response({"updated": updated})

        return response.Response({"detail": "booking or restaurant is required"}, status=status.HTTP_400_BAD_REQUEST)
