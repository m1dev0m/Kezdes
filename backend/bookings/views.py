from rest_framework import viewsets, permissions, status, serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, IntegrityError
from django.core.cache import cache
from django.db.models import Q
from django.db.models import Case, When, Value, IntegerField
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
import hashlib
import json
import logging
from core.responses import api_error
from core.permissions import IsRestaurantAdmin, CanManageReservations

logger = logging.getLogger(__name__)
from .serializers import BookingSerializer, AdminBookingSerializer
from .waitlist_serializers import WaitlistEntrySerializer
from .models import Booking, WaitlistEntry
from restaurants.models import Table, Restaurant
from .services import WaitlistService, BookingService
from core.notifications import NotificationService
from core.viewsets import OptionalPaginationMixin

class BookingViewSet(OptionalPaginationMixin, viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @staticmethod
    def _normalize_statuses(raw_statuses):
        normalized = []
        for st in raw_statuses:
            if st == 'confirmed':
                normalized.append(Booking.CONFIRMED)
            elif st == 'cancelled':
                normalized.extend([Booking.CANCELLED_BY_USER, Booking.CANCELLED_BY_RESTAURANT])
            else:
                normalized.append(st)
        return normalized

    @staticmethod
    def _idempotency_cache_key(user_id: int, idempotency_key: str) -> str:
        return f"idempotency:bookings:create:{user_id}:{idempotency_key}"

    @staticmethod
    def _request_payload_hash(data) -> str:
        payload = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()
    
    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Booking.objects.none()
        if not hasattr(user, 'profile'):
            return Booking.objects.none()
        
        # Mandatory tenant isolation for staff
        if user.profile.is_staff_member:
             from core.utils import get_user_restaurant
             user_rest = get_user_restaurant(user)
             if not user_rest:
                 return Booking.objects.none()
             return Booking.objects.filter(
                 restaurant=user_rest
             ).select_related('restaurant', 'user', 'table').prefetch_related('history', 'tables', 'orders').order_by('-date', '-time')
             
        # Guest logic
        if user.profile.role in ('customer', 'organizer'):
            return Booking.objects.filter(user=user).select_related('restaurant', 'table').prefetch_related('history', 'tables', 'orders').order_by('-created_at')
            
        # Global admin (platform level)
        if user.profile.role == 'global_admin':
            return Booking.objects.all().select_related('restaurant', 'user', 'table').prefetch_related('history', 'tables', 'orders').order_by('-created_at')
            
        return Booking.objects.filter(user=user).select_related('restaurant', 'table').prefetch_related('history', 'tables', 'orders').order_by('-created_at')

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())

        status_param = request.query_params.get('status')
        if status_param:
            statuses = self._normalize_statuses(status_param.split(','))
            qs = qs.filter(status__in=statuses)

        date_param = request.query_params.get('date')
        if date_param:
            try:
                qs = qs.filter(date=date_param)
            except Exception:
                pass

        date_from_param = request.query_params.get('date_from')
        if date_from_param:
            try:
                qs = qs.filter(date__gte=date_from_param)
            except Exception:
                pass

        date_to_param = request.query_params.get('date_to')
        if date_to_param:
            try:
                qs = qs.filter(date__lte=date_to_param)
            except Exception:
                pass

        time_from_param = request.query_params.get('time_from')
        if time_from_param:
            try:
                qs = qs.filter(time__gte=datetime.strptime(time_from_param.strip(), '%H:%M').time())
            except ValueError:
                pass

        time_to_param = request.query_params.get('time_to')
        if time_to_param:
            try:
                qs = qs.filter(time__lte=datetime.strptime(time_to_param.strip(), '%H:%M').time())
            except ValueError:
                pass

        table_id_param = request.query_params.get('table_id')
        if table_id_param:
            try:
                table_id_int = int(table_id_param)
                qs = qs.filter(Q(table_id=table_id_int) | Q(tables__id=table_id_int)).distinct()
            except (TypeError, ValueError):
                pass

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """
        Create booking with optional idempotency support.
        Repeated request with same Idempotency-Key and same payload returns existing booking.
        """
        idempotency_key = request.headers.get("Idempotency-Key")
        payload_hash = self._request_payload_hash(request.data)
        cache_key = None

        if idempotency_key and request.user.is_authenticated:
            cache_key = self._idempotency_cache_key(request.user.id, idempotency_key)
            cached = cache.get(cache_key)
            if cached:
                if cached.get("payload_hash") != payload_hash:
                    return Response(
                        {
                            "success": False,
                            "error": {
                                "message": "Idempotency-Key already used with a different payload.",
                                "details": {"idempotency_key": ["Payload mismatch for key."]},
                                "status_code": status.HTTP_409_CONFLICT,
                            },
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

                booking_id = cached.get("booking_id")
                existing = Booking.objects.filter(id=booking_id, user=request.user).first()
                if existing:
                    serializer = self.get_serializer(existing)
                    return Response(serializer.data, status=status.HTTP_200_OK)
                cache.delete(cache_key)

        response = super().create(request, *args, **kwargs)

        if cache_key and response.status_code == status.HTTP_201_CREATED and response.data.get("id"):
            cache.set(
                cache_key,
                {"booking_id": response.data["id"], "payload_hash": payload_hash},
                timeout=600,
            )
        return response

    def perform_create(self, serializer):
        """Create booking using the BookingService."""
        from .services import BookingService
        from django.core.exceptions import ValidationError as DjangoValidationError

        restaurant = serializer.validated_data['restaurant']

        # Gate: reject bookings for unverified restaurants
        if not restaurant.is_verified:
            raise drf_serializers.ValidationError(
                {"detail": "Ресторан ещё не прошёл верификацию. Бронирование невозможно."}
            )

        date = serializer.validated_data['date']
        time_val = serializer.validated_data['time']
        guests = serializer.validated_data.get('guests', 1)
        duration = serializer.validated_data.get('duration_minutes', 90)

        # Extract preferred table ID from request data
        preferred_table_id = None
        preferred_table_id_raw = self.request.data.get('table_id')
        if preferred_table_id_raw not in (None, ''):
            try:
                preferred_table_id = int(preferred_table_id_raw)
            except (TypeError, ValueError):
                raise drf_serializers.ValidationError({"table_id": "Некорректный table_id."})

        user = self.request.user if self.request.user.is_authenticated else None

        # Extract additional booking data
        booking_data = {
            'user_name': serializer.validated_data.get('user_name'),
            'user_phone': serializer.validated_data.get('user_phone'),
            'event_type': serializer.validated_data.get('event_type'),
            'event_title': serializer.validated_data.get('event_title'),
            'special_requests': serializer.validated_data.get('special_requests'),
        }

        try:
            BookingService.create_booking(
                user=user,
                restaurant=restaurant,
                booking_date=date,
                start_time=time_val,
                guests=guests,
                duration_minutes=duration,
                preferred_table_id=preferred_table_id,
                **booking_data
            )
        except DjangoValidationError as e:
            raise drf_serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))

    def _is_restaurant_staff(self, request, booking):
        """Check if user is restaurant staff for this booking's restaurant."""
        user = request.user
        if not user or not user.is_authenticated or not hasattr(user, 'profile'):
            return False

        profile = user.profile
        if profile.is_global_admin:
            return True

        from core.utils import get_user_restaurant
        user_rest = get_user_restaurant(user)
        return user_rest == booking.restaurant

    def destroy(self, request, *args, **kwargs):
        """DELETE behaves as cancellation for MVP API compatibility."""
        booking = self.get_object()
        is_owner = booking.user and booking.user == request.user
        is_restaurant_staff = self._is_restaurant_staff(request, booking)

        if not is_owner and not is_restaurant_staff:
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        try:
            if is_restaurant_staff and not is_owner:
                # Restaurant admin is cancelling
                booking.transition_to(Booking.CANCELLED_BY_RESTAURANT, actor=request.user)
            else:
                # User is cancelling their own booking
                booking.transition_to(Booking.CANCELLED_BY_USER, actor=request.user)
                if booking.restaurant.owner:
                    NotificationService.notify_user(
                        booking.restaurant.owner,
                        "Бронь отменена",
                        f"Клиент отменил бронирование на {booking.date} в {booking.time}.",
                        data={"booking_id": booking.id, "type": "booking_cancelled_by_user"},
                    )
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)

        # Auto-promote next waitlisted user
        WaitlistService.promote_next(booking.restaurant, booking.date, booking.time)

        return Response(status=status.HTTP_204_NO_CONTENT)
    @action(detail=False, methods=['post'], permission_classes=[CanManageReservations])
    def create_manual(self, request):
        """Allows admins to manually create a booking for a walk-in guest."""
        from .services import BookingService
        from django.core.exceptions import ValidationError as DjangoValidationError

        serializer = AdminBookingSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        restaurant = serializer.validated_data['restaurant']
        date = serializer.validated_data['date']
        time_val = serializer.validated_data['time']
        guests = serializer.validated_data.get('guests', 1)
        duration = serializer.validated_data.get('duration_minutes', 90)

        # Permission check
        profile = getattr(request.user, 'profile', None)
        role = getattr(profile, 'role', None) if profile else None

        if role == 'global_admin':
            pass  # allowed
        elif role in ('owner', 'restaurant_admin'):
            is_owner = getattr(request.user, 'owned_restaurant', None) == restaurant
            is_profile_linked = getattr(profile, 'restaurant', None) == restaurant
            if not (is_owner or is_profile_linked):
                return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        elif role in ('manager', 'host'):
            if getattr(profile, 'restaurant', None) != restaurant:
                return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        else:
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        # Extract preferred table ID
        preferred_table_id = None
        preferred_table_id_raw = request.data.get('table_id')
        if preferred_table_id_raw not in (None, ''):
            try:
                preferred_table_id = int(preferred_table_id_raw)
            except (TypeError, ValueError):
                return api_error("Некорректный table_id.", status.HTTP_400_BAD_REQUEST)

        # Extract booking data
        booking_data = {
            'user_name': serializer.validated_data.get('user_name'),
            'user_phone': serializer.validated_data.get('user_phone'),
            'event_type': serializer.validated_data.get('event_type'),
            'event_title': serializer.validated_data.get('event_title'),
            'special_requests': serializer.validated_data.get('special_requests'),
            'status': serializer.validated_data.get('status', Booking.CONFIRMED),
        }

        try:
            booking = BookingService.create_booking(
                user=None,  # Manual booking, no user
                restaurant=restaurant,
                booking_date=date,
                start_time=time_val,
                guests=guests,
                duration_minutes=duration,
                preferred_table_id=preferred_table_id,
                **booking_data
            )
            # Return the created booking data
            response_serializer = AdminBookingSerializer(booking)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except DjangoValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)
    @action(detail=False, methods=['get'], permission_classes=[CanManageReservations])
    def my_restaurant(self, request):
        """Get all bookings for the admin's restaurant."""
        from core.utils import get_user_restaurant
        restaurant = get_user_restaurant(request.user)
        
        if not restaurant:
            return Response({"detail": "No restaurant associated with this user."}, status=status.HTTP_400_BAD_REQUEST)
        
        qs = Booking.objects.filter(restaurant=restaurant).select_related('restaurant', 'user').prefetch_related('history')
        qs = qs.annotate(
            _pending_first=Case(
                When(status=Booking.PENDING, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        ).order_by('_pending_first', '-date', '-time')

        # Filters (keep in sync with main list endpoint expectations)
        status_param = request.query_params.get('status')
        if status_param:
            statuses = self._normalize_statuses(status_param.split(','))
            qs = qs.filter(status__in=statuses)

        date_param = request.query_params.get('date')
        if date_param:
            try:
                qs = qs.filter(date=date_param)
            except Exception:
                pass

        date_from_param = request.query_params.get('date_from')
        if date_from_param:
            try:
                qs = qs.filter(date__gte=date_from_param)
            except Exception:
                pass

        date_to_param = request.query_params.get('date_to')
        if date_to_param:
            try:
                qs = qs.filter(date__lte=date_to_param)
            except Exception:
                pass

        time_from_param = request.query_params.get('time_from')
        if time_from_param:
            time_from_param = time_from_param.strip()
            if time_from_param:
                try:
                    qs = qs.filter(time__gte=datetime.strptime(time_from_param, '%H:%M').time())
                except ValueError:
                    pass

        time_to_param = request.query_params.get('time_to')
        if time_to_param:
            time_to_param = time_to_param.strip()
            if time_to_param:
                try:
                    qs = qs.filter(time__lte=datetime.strptime(time_to_param, '%H:%M').time())
                except ValueError:
                    pass

        table_id_param = request.query_params.get('table_id')
        if table_id_param:
            try:
                table_id_int = int(table_id_param)
                qs = qs.filter(Q(table_id=table_id_int) | Q(tables__id=table_id_int)).distinct()
            except (TypeError, ValueError):
                pass

        limit_param = request.query_params.get('limit')
        if limit_param:
            try:
                limit_int = max(1, min(int(limit_param), 100))
                qs = qs[:limit_int]
            except (TypeError, ValueError):
                pass
            
        if 'page' in request.query_params or 'page_size' in request.query_params:
            page = self.paginate_queryset(qs)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def attach_order(self, request, pk=None):
        """Attach an existing order to an existing booking (preorder flow after booking creation)."""
        from orders.models import Order

        booking = self.get_object()
        if booking.user_id != request.user.id:
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        order_id = request.data.get('order_id')
        if not order_id:
            return api_error("order_id is required", status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.select_for_update().select_related('restaurant').get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return api_error("Order not found", status.HTTP_404_NOT_FOUND)

        if order.reservation_id is not None and order.reservation_id != booking.id:
            return api_error("Order is already attached to another booking", status.HTTP_409_CONFLICT)

        if order.restaurant_id != booking.restaurant_id:
            return api_error("Order belongs to another restaurant", status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order.id)
            if order.reservation_id is not None and order.reservation_id != booking.id:
                return api_error("Order is already attached to another booking", status.HTTP_409_CONFLICT)
            order.reservation = booking
            order.save(update_fields=['reservation'])

        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def check_in(self, request, pk=None):
        """Mark booking as checked in (guest arrived) and transition to SEATED."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        if booking.status != Booking.CONFIRMED:
            return api_error(
                "Только подтвержденные бронирования могут быть отмечены как прибывшие.",
                status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            booking.is_checked_in = True
            booking.check_in_time = timezone.now()
            booking.save(update_fields=['is_checked_in', 'check_in_time'])
            # Transition to SEATED so status is consistent
            try:
                booking.transition_to(Booking.SEATED, actor=request.user)
            except Exception:
                pass  # already seated or transition not allowed — keep is_checked_in flag

        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def reschedule(self, request, pk=None):
        """Reschedule booking by changing date/time/duration, re-checking capacity and reallocating tables."""
        from .models import ReservationHistory

        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        date_raw = request.data.get('date', str(booking.date))
        time_raw = request.data.get('time', booking.time.strftime('%H:%M'))
        duration_raw = request.data.get('duration_minutes', booking.duration_minutes)

        try:
            new_date = datetime.strptime(str(date_raw), '%Y-%m-%d').date()
            if isinstance(time_raw, str) and len(time_raw) == 8:
                new_time = datetime.strptime(time_raw, '%H:%M:%S').time()
            else:
                new_time = datetime.strptime(str(time_raw), '%H:%M').time()
            new_duration = int(duration_raw)
            if new_duration < 15:
                raise ValueError
        except Exception:
            return api_error(
                "Invalid date/time/duration_minutes",
                status.HTTP_400_BAD_REQUEST,
                details={"date": date_raw, "time": time_raw, "duration_minutes": duration_raw},
            )

        restaurant = booking.restaurant

        if not BookingService.is_within_operating_hours(restaurant, new_date, new_time, new_duration):
            return api_error("Бронирование недоступно на выбранное время.", status.HTTP_400_BAD_REQUEST)

        if not BookingService.acquire_booking_lock(restaurant.id, new_date, new_time, duration_minutes=new_duration):
            return api_error(
                "Это время сейчас бронируется другим пользователем. Попробуйте снова.",
                status.HTTP_409_CONFLICT,
            )

        try:
            with transaction.atomic():
                booking = Booking.objects.select_for_update().prefetch_related('tables').get(id=booking.id)

                if booking.status not in Booking.ACTIVE_STATUSES:
                    return api_error(
                        f"Booking is in {booking.status} status, cannot reschedule.",
                        status.HTTP_400_BAD_REQUEST,
                    )

                ok, available = BookingService.check_capacity(
                    restaurant,
                    new_date,
                    new_time,
                    booking.guests,
                    new_duration,
                    exclude_booking_id=booking.id,
                )
                if not ok:
                    return api_error(
                        "Превышена вместимость ресторана.",
                        status.HTTP_400_BAD_REQUEST,
                        details={"available_seats": available, "needed": booking.guests},
                    )

                preferred_table_id = request.data.get('table_id')
                tables = BookingService.find_best_tables(
                    restaurant=restaurant,
                    date=new_date,
                    start_time=new_time,
                    guests=booking.guests,
                    duration_minutes=new_duration,
                    preferred_table_id=preferred_table_id,
                    exclude_booking_id=booking.id,
                )
                if not tables:
                    return api_error(
                        "Нет доступных столов на выбранное время.",
                        status.HTTP_400_BAD_REQUEST,
                    )

                old_status = booking.status
                old_table = booking.table
                old_date = booking.date
                old_time = booking.time

                booking.date = new_date
                booking.time = new_time
                booking.duration_minutes = new_duration
                booking.table = tables[0]
                # Call full save() so start_datetime/end_datetime are recalculated
                booking.save()
                booking.tables.set(tables)

                ReservationHistory.objects.create(
                    reservation=booking,
                    status=booking.status,
                    event_type='reschedule',
                    actor=request.user,
                    from_status=old_status,
                    to_status=booking.status,
                    from_table=old_table,
                    to_table=booking.table,
                )

                if (old_date, old_time) != (new_date, new_time):
                    WaitlistService.promote_next(restaurant, old_date, old_time)

                return Response(self.get_serializer(booking).data)
        finally:
            BookingService.release_booking_lock(restaurant.id, new_date, new_time, duration_minutes=new_duration)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def confirm(self, request, pk=None):
        """PENDING → APPROVED with capacity re-check inside a transaction."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        booking, error = BookingService.confirm_booking(booking.id, actor=request.user)
        if error:
            return api_error(error, status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def reject(self, request, pk=None):
        """PENDING → REJECTED (admin rejects a pending booking)."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        booking, error = BookingService.reject_booking(booking.id, actor=request.user)
        if error:
            return api_error(error, status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def cancel_by_restaurant(self, request, pk=None):
        """APPROVED → CANCELLED_BY_RESTAURANT (restaurant cancels after approval)."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        try:
            booking.transition_to(Booking.CANCELLED_BY_RESTAURANT, actor=request.user)
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def seat(self, request, pk=None):
        """APPROVED → SEATED (guest has arrived and been seated). Allows setting a table_id."""
        from restaurants.models import Table
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
            
        table_id = request.data.get('table_id')
        if table_id:
            try:
                table = Table.objects.get(id=table_id, restaurant=booking.restaurant)
                booking.table = table
                booking.save(update_fields=['table', 'updated_at'])
                booking.tables.set([table])
            except Table.DoesNotExist:
                return api_error("Указанный стол не найден.", status.HTTP_400_BAD_REQUEST)

        try:
            booking.transition_to(Booking.SEATED, actor=request.user)
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def complete(self, request, pk=None):
        """APPROVED/SEATED → COMPLETED (event finished successfully). Records visit in CRM."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        try:
            with transaction.atomic():
                booking.transition_to(Booking.COMPLETED, actor=request.user)
                from crm.services import CRMService
                
                customer_phone = booking.user_phone
                if not customer_phone and booking.user:
                    if hasattr(booking.user, 'profile'):
                        customer_phone = booking.user.profile.phone

                if customer_phone:
                    CRMService.record_visit(
                        restaurant=booking.restaurant,
                        phone=customer_phone,
                        name=booking.user_name or (booking.user.username if booking.user else "Guest"),
                        email=booking.user.email if booking.user else None,
                        booking=booking,
                        spent_amount=booking.budget or 0,
                    )
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)
    @action(detail=True, methods=['post', 'patch'], permission_classes=[CanManageReservations])
    def no_show(self, request, pk=None):
        """APPROVED → NO_SHOW (guest didn't arrive)."""
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        try:
            booking.transition_to(Booking.NO_SHOW, actor=request.user)
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post'], permission_classes=[CanManageReservations])
    def reassign_table(self, request, pk=None):
        """Reassign booking to a different single table (table_id required)."""
        from .services import BookingService

        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        table_id = request.data.get('table_id')
        if not table_id:
            return api_error("table_id is required", status.HTTP_400_BAD_REQUEST)

        try:
            new_table = Table.objects.get(id=table_id, restaurant=booking.restaurant, is_active=True)
        except Table.DoesNotExist:
            return api_error("Table not found", status.HTTP_404_NOT_FOUND)

        if new_table.seats < booking.guests:
            return api_error(
                "Table capacity is insufficient for this booking",
                status.HTTP_400_BAD_REQUEST,
                details={"seats": new_table.seats, "guests": booking.guests},
            )

        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(id=booking.id)

            available_table_ids = BookingService.get_available_table_ids(
                booking.restaurant,
                booking.date,
                booking.time,
                booking.duration_minutes,
                exclude_booking_id=booking.id,
            )
            if new_table.id not in available_table_ids:
                return api_error(
                    "Table is not available for this time slot",
                    status.HTTP_400_BAD_REQUEST,
                    details={"table_id": new_table.id},
                )

            old_table = booking.table
            booking.table = new_table
            booking.save(update_fields=['table', 'updated_at'])
            booking.tables.set([new_table])

            try:
                from .models import ReservationHistory

                ReservationHistory.objects.create(
                    reservation=booking,
                    status=booking.status,
                    event_type='table_reassign',
                    actor=request.user,
                    from_status=booking.status,
                    to_status=booking.status,
                    from_table=old_table,
                    to_table=new_table,
                )
            except Exception:
                logger.exception("Failed to write reservation history for table reassign")

        return Response(self.get_serializer(booking).data)
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def available_slots(self, request):
        """
        Public endpoint to get available time slots for a restaurant.
        Query params: restaurant_id, date, guests, duration_minutes (default 90)
        """
        from restaurants.models import Restaurant
        from .services import BookingService
        
        restaurant_id = request.query_params.get('restaurant_id')
        date_str = request.query_params.get('date')
        guests_raw = request.query_params.get('guests', 2)
        
        duration_mins_raw = request.query_params.get('duration_minutes')
        duration_hours_raw = request.query_params.get('duration')
        
        if duration_mins_raw:
             try:
                 duration = int(duration_mins_raw)
             except ValueError:
                 duration = 90
        elif duration_hours_raw:
             try:
                 duration = int(duration_hours_raw) * 60
             except ValueError:
                 duration = 90
        else:
             duration = 90

        if not restaurant_id or not date_str:
            raise drf_serializers.ValidationError(
                {"detail": "restaurant_id and date are required."}
            )
        
        try:
            guests = int(guests_raw)
            if guests < 1 or duration < 1:
                raise ValueError
            restaurant = Restaurant.objects.get(id=restaurant_id)
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except (Restaurant.DoesNotExist, ValueError):
            raise drf_serializers.ValidationError(
                {
                    "detail": (
                        "Invalid request params. Expect restaurant_id, "
                        "date=YYYY-MM-DD, guests>=1."
                    )
                }
            )
            
        slots = BookingService.get_available_slots(restaurant, date_obj, guests, duration)
        return Response({"slots": slots})

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def available_tables(self, request):
        """
        Public endpoint to get available tables for a specific time slot.
        Query params: restaurant_id, date, time, duration_minutes (default 90)
        Returns: {"available_tables": [table objects]}
        """
        from restaurants.models import Restaurant
        from restaurants.serializers import TableSerializer
        from .services import BookingService
        
        restaurant_id = request.query_params.get('restaurant_id')
        date_str = request.query_params.get('date')
        time_str = request.query_params.get('time')
        
        duration_mins_raw = request.query_params.get('duration_minutes')
        duration_hours_raw = request.query_params.get('duration')
        
        if duration_mins_raw:
             try:
                 duration = int(duration_mins_raw)
             except ValueError:
                 duration = 90
        elif duration_hours_raw:
             try:
                 duration = int(duration_hours_raw) * 60
             except ValueError:
                 duration = 90
        else:
             duration = 90

        if not restaurant_id or not date_str or not time_str:
            raise drf_serializers.ValidationError(
                {"detail": "restaurant_id, date, and time are required."}
            )
        
        try:
            restaurant = Restaurant.objects.get(id=restaurant_id)
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            time_obj = datetime.strptime(time_str, '%H:%M').time()
        except (Restaurant.DoesNotExist, ValueError):
            raise drf_serializers.ValidationError(
                {
                    "detail": "Invalid parameters."
                }
            )
            
        table_ids = BookingService.get_available_table_ids(restaurant, date_obj, time_obj, duration)
        available_tables = Table.objects.filter(id__in=table_ids).order_by('name')
        serializer = TableSerializer(available_tables, many=True)
        return Response({"available_tables": serializer.data})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        """User cancels their own booking: PENDING/APPROVED → CANCELLED_BY_USER."""
        booking = self.get_object()
        if booking.user != request.user:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            booking.transition_to(Booking.CANCELLED_BY_USER, actor=request.user)
            if booking.restaurant.owner:
                NotificationService.notify_user(
                    booking.restaurant.owner,
                    "Бронь отменена",
                    f"Клиент отменил бронирование на {booking.date} в {booking.time}.",
                    data={"booking_id": booking.id, "type": "booking_cancelled_by_user"}
                )
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-promote next waitlisted user
        WaitlistService.promote_next(booking.restaurant, booking.date, booking.time)

        return Response(self.get_serializer(booking).data)

    # ── Waitlist endpoints ──────────────────────────────────────────────

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def join_waitlist(self, request):
        """User joins the waitlist for a fully-booked slot."""
        serializer = WaitlistEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            entry = serializer.save(user=request.user)
        except IntegrityError:
            return Response(
                {"detail": "Вы уже в листе ожидания на это время."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(WaitlistEntrySerializer(entry).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def leave_waitlist(self, request):
        """User cancels their waitlist entry."""
        entry_id = request.data.get('waitlist_id')
        if not entry_id:
            return Response({"detail": "waitlist_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            entry = WaitlistEntry.objects.get(id=entry_id, user=request.user)
        except WaitlistEntry.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if entry.status not in (WaitlistEntry.WAITING, WaitlistEntry.NOTIFIED):
            return Response({"detail": "Запись уже обработана."}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = WaitlistEntry.CANCELLED
        entry.save()
        return Response({"detail": "Вы покинули лист ожидания."})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_waitlist(self, request):
        """List the current user's active waitlist entries."""
        entries = WaitlistEntry.objects.filter(
            user=request.user,
            status__in=[WaitlistEntry.WAITING, WaitlistEntry.NOTIFIED],
        ).select_related('restaurant')
        return Response(WaitlistEntrySerializer(entries, many=True).data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def confirm_waitlist(self, request):
        """User confirms a waitlist notification → creates a real booking."""
        from .services import BookingService

        entry_id = request.data.get('waitlist_id')
        if not entry_id:
            return Response({"detail": "waitlist_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            entry = WaitlistEntry.objects.get(
                id=entry_id, user=request.user, status=WaitlistEntry.NOTIFIED
            )
        except WaitlistEntry.DoesNotExist:
            return Response({"detail": "Not found or already expired."}, status=status.HTTP_404_NOT_FOUND)

        # Check if the notification hasn't expired (15 min window)
        if entry.notified_at and (timezone.now() - entry.notified_at).total_seconds() > 900:
            entry.status = WaitlistEntry.EXPIRED
            entry.save()
            return Response({"detail": "Время подтверждения истекло."}, status=status.HTTP_410_GONE)

        # Try to create actual booking
        duration = 90
        if not BookingService.acquire_booking_lock(entry.restaurant_id, entry.date, entry.time, duration_minutes=duration):
            return Response(
                {"detail": "Это время сейчас бронируется другим пользователем. Попробуйте снова."},
                status=status.HTTP_409_CONFLICT,
            )
        try:
            try:
                with transaction.atomic():
                    tables = BookingService.find_best_tables(
                        entry.restaurant, entry.date, entry.time, entry.guests, duration_minutes=duration
                    )
                    if not tables:
                        return Response(
                            {"detail": "К сожалению, столик уже занят."},
                            status=status.HTTP_409_CONFLICT,
                        )

                    booking = Booking.objects.create(
                        user=entry.user,
                        restaurant=entry.restaurant,
                        date=entry.date,
                        time=entry.time,
                        guests=entry.guests,
                        duration_minutes=duration,
                        status=Booking.CONFIRMED,
                        table=tables[0],
                    )
                    booking.tables.set(tables)

                    entry.status = WaitlistEntry.PROMOTED
                    entry.promoted_booking = booking
                    entry.save()

                    return Response(
                        BookingSerializer(booking).data,
                        status=status.HTTP_201_CREATED,
                    )
            except IntegrityError:
                return Response(
                    {"detail": "Не удалось создать бронирование."},
                    status=status.HTTP_409_CONFLICT,
                )
        finally:
            BookingService.release_booking_lock(entry.restaurant_id, entry.date, entry.time, duration_minutes=duration)
