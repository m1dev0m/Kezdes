from rest_framework import viewsets, permissions, decorators, response
from django.db.models import Q

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

        return Message.objects.filter(
            Q(booking__user=user) | 
            Q(booking__restaurant__owner=user) |
            Q(restaurant__owner=user) |
            Q(restaurant__id__in=Message.objects.filter(sender=user).values('restaurant_id')) |
            Q(sender=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

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
