from rest_framework import filters, viewsets, permissions, status, serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, IntegrityError
from django.core.cache import cache
from django.db.models import Q, Prefetch, Exists, OuterRef, Count, BooleanField
from django.db.models import Case, When, Value, IntegerField
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
import hashlib
import json
import logging
from core.responses import api_error
from core.permissions import IsRestaurantAdmin, CanManageReservations
from core.utils import get_user_profile

logger = logging.getLogger(__name__)
from .serializers import (
    BookingSerializer,
    AdminBookingSerializer,
    BookingAdminUpdateSerializer,
    PublicBookingSerializer,
    BookingListSerializer,
)
from .waitlist_serializers import WaitlistEntrySerializer
from .models import Booking, WaitlistEntry, ReservationHistory
from restaurants.models import Table, Restaurant, Review
from orders.models import Order
from .services import WaitlistService, BookingService
from .engine import StatusMachine
from core.notifications import NotificationService
from core.viewsets import OptionalPaginationMixin

class WaitlistViewSet(viewsets.ModelViewSet):
    serializer_class = WaitlistEntrySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        qs = WaitlistEntry.objects.all()
        restaurant_id = self.request.query_params.get('restaurant_id')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        
        user = self.request.user
        if not user.is_authenticated:
            return WaitlistEntry.objects.none()
            
        from core.utils import get_user_restaurant
        user_restaurant = get_user_restaurant(user)
        
        user_profile = get_user_profile(user)
        user_role = getattr(user_profile, 'role', '')
        if user_role != 'global_admin':
             if user_restaurant:
                  from django.db.models import Q
                  qs = qs.filter(Q(restaurant=user_restaurant) | Q(user=user))
             else:
                  qs = qs.filter(user=user)
        return qs

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        profile = get_user_profile(user)
        if profile and (getattr(profile, 'is_staff_member', False) or getattr(profile, 'is_global_admin', False)):
            user = None
        serializer.save(user=user)

    @action(detail=True, methods=['post'], url_path='convert-to-reservation', permission_classes=[permissions.IsAuthenticated])
    def convert_to_reservation(self, request, pk=None):
        from .services import BookingService
        entry = self.get_object()
        
        user = self.request.user
        from core.utils import get_user_restaurant
        user_restaurant = get_user_restaurant(user)
        user_profile = get_user_profile(user)
        if getattr(user_profile, 'role', '') != 'global_admin' and user_restaurant != entry.restaurant:
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
            
        from .services import WaitlistService
        
        booking, error_msg = WaitlistService.convert_to_reservation(entry)
        if error_msg:
            return api_error(error_msg, status.HTTP_409_CONFLICT)
            
        response_data = BookingSerializer(booking, context={'request': request}).data
        response_data.update(
            {
                'booking_id': booking.id,
                'waitlist_id': entry.id,
                'redirect_to': f"/app/bookings?id={booking.id}",
            }
        )
        return Response(response_data, status=status.HTTP_201_CREATED)
