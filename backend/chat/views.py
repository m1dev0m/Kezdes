from rest_framework import viewsets, permissions, decorators, response
from django.db.models import OuterRef, Q, Subquery
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Message, Conversation
from .serializers import MessageSerializer, ConversationSerializer
from bookings.models import Booking
from core.utils import get_user_restaurant, get_user_profile
from core.viewsets import OptionalPaginationMixin


def _is_global_admin(user):
    profile = get_user_profile(user)
    return bool(profile and profile.role == "global_admin")


def _get_restaurant_scope(user):
    if _is_global_admin(user):
        return None, True
    return get_user_restaurant(user), False


def _user_can_access_restaurant(user, restaurant) -> bool:
    if not user or not user.is_authenticated or not restaurant:
        return False
    if _is_global_admin(user):
        return True
    scoped_restaurant = get_user_restaurant(user)
    return bool(scoped_restaurant and scoped_restaurant.id == restaurant.id)


def _user_can_access_booking(user, booking) -> bool:
    if not user or not user.is_authenticated or not booking:
        return False
    if booking.user_id == user.id:
        return True
    return _user_can_access_restaurant(user, booking.restaurant)


def _broadcast_message(message: Message) -> None:
    if not message.restaurant_id or not message.conversation_id:
        return
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    group_send = getattr(channel_layer, "group_send", None)
    if group_send is None:
        group_send = lambda *args, **kwargs: None
    payload = {
        "type": "chat.message",
        "message": {
            "id": message.id,
            "content": message.content,
            "sender": message.sender_id,
            "sender_name": getattr(message.sender, "username", ""),
            "timestamp": message.timestamp.isoformat(),
            "booking_id": message.booking_id,
            "conversation_id": message.conversation_id,
            "restaurant_id": message.restaurant_id,
        },
    }
    async_to_sync(group_send)(f"chat_restaurant_{message.restaurant_id}", payload)
    async_to_sync(group_send)(f"chat_user_{message.conversation.guest_id}", payload)


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        restaurant, is_global_admin = _get_restaurant_scope(user)
        latest_message = Message.objects.filter(conversation_id=OuterRef("pk")).order_by("-timestamp", "-id")
        qs = Conversation.objects.select_related("restaurant", "guest").annotate(
            last_message_content=Subquery(latest_message.values("content")[:1]),
            last_message_timestamp=Subquery(latest_message.values("timestamp")[:1]),
            last_message_sender_id=Subquery(latest_message.values("sender_id")[:1]),
            last_message_is_read=Subquery(latest_message.values("is_read")[:1]),
        ).order_by("-updated_at")
        if is_global_admin:
            return qs
        filters = Q(guest=user)
        if restaurant:
            filters |= Q(restaurant=restaurant)
        return qs.filter(filters).distinct()

    @decorators.action(detail=False, methods=["post"], url_path="start")
    def start(self, request):
        booking_id = request.data.get("booking_id")
        try:
            booking_id = int(booking_id)
        except (TypeError, ValueError):
            raise ValidationError({"booking_id": "Valid booking_id is required."})

        booking = Booking.objects.select_related("restaurant", "user").filter(id=booking_id).first()
        if not booking:
            return response.Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
        if not _user_can_access_booking(request.user, booking):
            raise PermissionDenied("You do not have access to this booking.")
        if not booking.user_id:
            return response.Response(
                {"detail": "This booking has no authenticated guest account for direct messaging."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation, _ = Conversation.objects.get_or_create(
            restaurant_id=booking.restaurant_id,
            guest_id=booking.user_id,
        )
        serializer = self.get_serializer(conversation)
        return response.Response(serializer.data)

class MessageViewSet(OptionalPaginationMixin, viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Message.objects.none()

        user = self.request.user
        if not user or not user.is_authenticated:
            return Message.objects.none()

        restaurant, is_global_admin = _get_restaurant_scope(user)
        qs = Message.objects.select_related(
            "booking",
            "restaurant",
            "sender",
            "conversation",
            "booking__restaurant",
        )
        if not is_global_admin:
            filters = Q(sender=user) | Q(booking__user=user) | Q(conversation__guest=user)
            if restaurant:
                filters |= (
                    Q(restaurant=restaurant)
                    | Q(booking__restaurant=restaurant)
                    | Q(conversation__restaurant=restaurant)
                )
            qs = qs.filter(filters)
        qs = qs.distinct()

        booking_id = self.request.query_params.get("booking")
        if booking_id:
            try:
                bid = int(booking_id)
                b = Booking.objects.select_related("restaurant", "user").filter(id=bid).first()
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

        conversation_id = self.request.query_params.get("conversation")
        if conversation_id:
            try:
                qs = qs.filter(conversation_id=int(conversation_id))
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
        booking = serializer.validated_data.get("booking") if hasattr(serializer, "validated_data") else None
        restaurant = serializer.validated_data.get("restaurant") if hasattr(serializer, "validated_data") else None
        conversation = serializer.validated_data.get("conversation") if hasattr(serializer, "validated_data") else None

        if booking and not _user_can_access_booking(self.request.user, booking):
            raise PermissionDenied("You do not have access to this booking.")

        if conversation:
            if not (
                conversation.guest_id == self.request.user.id
                or _user_can_access_restaurant(self.request.user, conversation.restaurant)
            ):
                raise PermissionDenied("You do not have access to this conversation.")
            restaurant = restaurant or conversation.restaurant
        elif booking and booking.user_id and booking.restaurant_id:
            conversation, _ = Conversation.objects.get_or_create(
                restaurant_id=booking.restaurant_id,
                guest_id=booking.user_id,
            )
            restaurant = restaurant or booking.restaurant
        elif restaurant:
            if _user_can_access_restaurant(self.request.user, restaurant):
                raise ValidationError(
                    {"conversation": "Restaurant staff should send direct messages through an existing conversation."}
                )
            conversation, _ = Conversation.objects.get_or_create(
                restaurant_id=restaurant.id,
                guest_id=self.request.user.id,
            )

        serializer.save(sender=self.request.user, conversation=conversation, restaurant=restaurant)
        if serializer.instance is not None:
            _broadcast_message(serializer.instance)

    @decorators.action(detail=False, methods=["get"])
    def unread_count(self, request):
        user = request.user
        restaurant, is_global_admin = _get_restaurant_scope(user)
        qs = Message.objects.filter(is_read=False).exclude(sender=user)
        if not is_global_admin:
            filters = Q(booking__user=user) | Q(conversation__guest=user)
            if restaurant:
                filters |= (
                    Q(restaurant=restaurant)
                    | Q(booking__restaurant=restaurant)
                    | Q(conversation__restaurant=restaurant)
                )
            qs = qs.filter(filters)
        qs = qs.distinct()
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
        conversation_id = request.data.get("conversation")
        restaurant_id = request.data.get("restaurant") or request.data.get("restaurant_id")

        qs = Message.objects.filter(is_read=False).exclude(sender=user)

        if booking_id:
            try:
                b = Booking.objects.select_related('restaurant', 'user').filter(id=int(booking_id)).first()
                if not b or not b.user_id or not b.restaurant_id:
                    return response.Response({"detail": "Invalid booking"}, status=status.HTTP_400_BAD_REQUEST)
                if not _user_can_access_booking(user, b):
                    return response.Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
                conv = Conversation.objects.filter(restaurant_id=b.restaurant_id, guest_id=b.user_id).first()
                if not conv:
                    return response.Response({"updated": 0})
                updated = qs.filter(conversation_id=conv.id).update(is_read=True)
                return response.Response({"updated": updated})
            except (TypeError, ValueError):
                return response.Response({"detail": "Invalid booking"}, status=status.HTTP_400_BAD_REQUEST)

        if conversation_id:
            try:
                conv = Conversation.objects.select_related("restaurant").filter(id=int(conversation_id)).first()
            except (TypeError, ValueError):
                conv = None
            if not conv:
                return response.Response({"detail": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)
            if not (conv.guest_id == user.id or _user_can_access_restaurant(user, conv.restaurant)):
                return response.Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
            updated = qs.filter(conversation_id=conv.id).update(is_read=True)
            return response.Response({"updated": updated})

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
            if not _user_can_access_restaurant(user, restaurant_obj):
                return response.Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

            return response.Response(
                {"detail": "Use booking or conversation to mark messages as read."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return response.Response({"detail": "booking, conversation or restaurant is required"}, status=status.HTTP_400_BAD_REQUEST)
