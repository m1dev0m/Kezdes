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
from core.utils import get_user_profile, get_user_restaurant

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
from restaurants.serializers import TableSerializer
from orders.models import Order
from .services import WaitlistService, BookingService
from .engine import StatusMachine
from core.notifications import NotificationService
from core.viewsets import OptionalPaginationMixin

from .mixins.lifecycle_mixins import BookingLifecycleMixin

class BookingViewSet(OptionalPaginationMixin, BookingLifecycleMixin, viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user_name', 'user_phone', 'guest_email', 'user__username', 'table__number']
    ordering_fields = [
        'date',
        'time',
        'created_at',
        'guests',
        'status',
        'user_name',
        'user_phone',
        'restaurant__name',
        'table__number',
    ]
    ordering = ['-date', '-time']

    def get_serializer_class(self):
        if self.action in ('list', 'my_restaurant'):
            return BookingListSerializer
        return super().get_serializer_class()

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        if self.action in {
            'create_manual',
            'my_restaurant',
            'reschedule',
            'confirm',
            'reject',
            'cancel_by_restaurant',
            'seat',
            'complete',
            'no_show',
            'reassign_table',
            'check_in',
            'smart_tables',
            'update',
            'partial_update',
        }:
            return [CanManageReservations()]
        if self.action == 'cancel':
            return [permissions.IsAuthenticated()]
        if self.action in {'public_booking', 'public_waitlist', 'join_waitlist', 'confirm_waitlist'}:
            return [permissions.AllowAny()]
        return super().get_permissions()

    @staticmethod
    def _normalize_statuses(raw_statuses):
        normalized = []
        for st in raw_statuses:
            if st in ('confirmed', 'approved'):
                                                                                
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
    def _submission_cache_key(scope: str, action_name: str, payload_hash: str) -> str:
        return f"idempotency:bookings:{action_name}:{scope}:{payload_hash}"

    @staticmethod
    def _request_payload_hash(data) -> str:
        payload = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @staticmethod
    def _request_scope(request) -> str:
        if request.user.is_authenticated:
            return f"user:{request.user.id}"
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.META.get("REMOTE_ADDR", "anon")
        return f"anon:{client_ip or 'unknown'}"

    def _existing_booking_from_cache(self, cache_key: str):
        cached = cache.get(cache_key)
        if not cached:
            return None
        booking_id = cached.get("booking_id")
        if not booking_id:
            cache.delete(cache_key)
            return None
        booking = Booking.objects.filter(id=booking_id).first()
        if not booking:
            cache.delete(cache_key)
            return None
        return booking

    def _store_booking_cache(self, cache_key: str, booking_id: int, payload_hash: str, ttl: int = 30) -> None:
        cache.set(
            cache_key,
            {"booking_id": booking_id, "payload_hash": payload_hash},
            timeout=ttl,
        )

    @staticmethod
    def _parse_time_value(raw_value, default_time=None):
        if raw_value in (None, ''):
            return default_time

        if hasattr(raw_value, 'hour') and hasattr(raw_value, 'minute'):
            return raw_value

        raw_text = str(raw_value).strip()
        if not raw_text:
            return default_time

        try:
            if len(raw_text) == 8:
                return datetime.strptime(raw_text, '%H:%M:%S').time()
            return datetime.strptime(raw_text, '%H:%M').time()
        except ValueError:
            return default_time

    @staticmethod
    def _schedule_fields_changed(payload) -> bool:
        return any(field in payload for field in {'date', 'time', 'duration_minutes', 'guests', 'table_id'})

    @staticmethod
    def _metadata_fields_from_payload(payload):
        fields = {}
        for key in ('user_name', 'user_phone', 'guest_email', 'event_type', 'event_title', 'special_requests', 'budget', 'pay_at_restaurant'):
            if key in payload:
                fields[key] = payload[key]
        return fields

    @staticmethod
    def _history_prefetch():
        return Prefetch(
            'history',
            queryset=ReservationHistory.objects.select_related(
                'actor',
                'from_table',
                'to_table',
            ).order_by('-changed_at'),
        )

    def _optimized_booking_queryset(self, queryset, *, include_history=False, include_order_prefetch=False):
        prefetches = ['tables']
        if include_history:
            prefetches.append(self._history_prefetch())
        if include_order_prefetch:
            prefetches.append('orders')

        return queryset.select_related(
            'restaurant', 'user', 'user__profile', 'table'
        ).prefetch_related(*prefetches).annotate(
            has_preorder=Exists(Order.objects.filter(reservation=OuterRef('pk'))),
            orders_count=Count('orders'),
        )

    def _apply_common_filters(self, qs, request):
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

        source_param = request.query_params.get('source')
        if source_param:
            qs = qs.filter(source__in=[item for item in source_param.split(',') if item])

        shift_param = request.query_params.get('shift')
        if shift_param:
            qs = qs.filter(shift_id=shift_param)

        return qs

    def _apply_response_pagination(self, request, qs, *, allow_limit=False):
        if allow_limit and 'limit' in request.query_params and 'page' not in request.query_params and 'page_size' not in request.query_params:
            limit_param = request.query_params.get('limit')
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

                                                                                        
                                                                     
        qs = qs[:2000]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def _apply_metadata_update(self, booking, payload, actor):
        update_fields = []
        for field, value in self._metadata_fields_from_payload(payload).items():
            setattr(booking, field, value)
            update_fields.append(field)

        if update_fields:
            booking.save(update_fields=update_fields + ['updated_at'])
        else:
            booking.save()

        try:
            from .models import ReservationHistory
            ReservationHistory.objects.create(
                reservation=booking,
                status=booking.status,
                event_type='edit',
                actor=actor,
                from_status=booking.status,
                to_status=booking.status,
                from_table=booking.table,
                to_table=booking.table,
            )
        except Exception:
            logger.exception("Failed to write reservation history for booking edit")

        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    def _can_manage_restaurant(self, user, restaurant) -> bool:
        profile = get_user_profile(user)
        if not profile:
            return False
        if profile.is_global_admin:
            return True
        return get_user_restaurant(user) == restaurant

    @action(detail=False, methods=['get', 'delete'], permission_classes=[permissions.AllowAny], url_path=r'public/(?P<public_token>[^/.]+)')
    def public_booking(self, request, public_token=None):
        
        try:
            booking = (
                Booking.objects.select_related('restaurant', 'user', 'table')
                .prefetch_related('tables')
                .get(public_token=public_token)
            )
        except Booking.DoesNotExist:
            return api_error("Booking not found", status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            return Response(PublicBookingSerializer(booking, context={'request': request}).data, status=status.HTTP_200_OK)

        try:
            actor = booking.user if booking.user_id else None
            StatusMachine.transition(booking, Booking.CANCELLED_BY_USER, actor=actor)
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)

        if booking.restaurant.owner:
            NotificationService.notify_user(
                booking.restaurant.owner,
                "Бронь отменена",
                f"Бронирование на {booking.date} в {booking.time} было отменено по ссылке из подтверждения.",
                data={"booking_id": booking.id, "public_token": booking.public_token, "type": "booking_cancelled_by_token"},
            )

        WaitlistService.promote_next(booking.restaurant, booking.date, booking.time)
        return Response(PublicBookingSerializer(booking).data, status=status.HTTP_200_OK)

    def _apply_schedule_update(self, request, booking, payload, *, event_type='reschedule'):
        from .models import ReservationHistory

        new_date = payload.get('date', booking.date)
        raw_time = payload.get('time', booking.time)
        new_time = self._parse_time_value(raw_time, booking.time)
        new_duration = int(payload.get('duration_minutes', booking.duration_minutes))
        new_guests = int(payload.get('guests', booking.guests))
        preferred_table_id = payload.get('table_id')

        if not new_time:
            return api_error(
                "Invalid date/time/duration_minutes",
                status.HTTP_400_BAD_REQUEST,
                details={"date": new_date, "time": raw_time, "duration_minutes": new_duration},
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
                    new_guests,
                    new_duration,
                    exclude_booking_id=booking.id,
                )
                if not ok:
                    return api_error(
                        "Превышена вместимость ресторана.",
                        status.HTTP_400_BAD_REQUEST,
                        details={"available_seats": available, "needed": new_guests},
                    )

                tables = BookingService.find_best_tables(
                    restaurant=restaurant,
                    date=new_date,
                    start_time=new_time,
                    guests=new_guests,
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
                booking.guests = new_guests
                booking.table = tables[0]
                for field, value in self._metadata_fields_from_payload(payload).items():
                    setattr(booking, field, value)
                booking.save()
                booking.tables.set(tables)

                ReservationHistory.objects.create(
                    reservation=booking,
                    status=booking.status,
                    event_type=event_type,
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

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Booking.objects.none()
        profile = get_user_profile(user)
        if not profile:
            return Booking.objects.none()
        include_history = self.action not in {'list', 'my_restaurant'}
        include_order_prefetch = self.action not in {'list', 'my_restaurant'}

                                              
        if profile.is_staff_member:
            from core.utils import get_user_restaurant
            user_rest = get_user_restaurant(user)
            if not user_rest:
                return Booking.objects.none()
            return self._optimized_booking_queryset(
                Booking.objects.filter(restaurant=user_rest),
                include_history=include_history,
                include_order_prefetch=include_order_prefetch,
            ).order_by('-date', '-time')

                                       
        if profile.role == 'global_admin':
            return self._optimized_booking_queryset(
                Booking.objects.all(),
                include_history=include_history,
                include_order_prefetch=include_order_prefetch,
            ).order_by('-created_at')

        return self._optimized_booking_queryset(
            Booking.objects.filter(user=user),
            include_history=include_history,
            include_order_prefetch=include_order_prefetch,
        ).order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        request = getattr(self, 'request', None)
        user = getattr(request, 'user', None)
        serializer_class = self.get_serializer_class()
        if (
            user and user.is_authenticated
            and serializer_class in {BookingSerializer, PublicBookingSerializer}
        ):
            context['reviewed_restaurant_ids'] = set(
                Review.objects.filter(user_id=user.id).values_list('restaurant_id', flat=True)
            )
        if (
            user and user.is_authenticated
            and serializer_class in {BookingSerializer, BookingListSerializer, PublicBookingSerializer}
        ):
            restaurant = get_user_restaurant(user)
            if restaurant:
                try:
                    from crm.models import Customer
                    customer_summary_map = {}
                    for customer in Customer.objects.filter(restaurant=restaurant):
                        customer_summary_map[(customer.restaurant_id, customer.phone)] = BookingSerializer._build_customer_summary(customer)
                    context['customer_summary_map'] = customer_summary_map
                except Exception:
                    pass
        return context

    def list(self, request, *args, **kwargs):
        qs = self._apply_common_filters(self.get_queryset(), request)
        qs = self.filter_queryset(qs)
        return self._apply_response_pagination(request, qs)

    def create(self, request, *args, **kwargs):
        idempotency_key = request.headers.get("Idempotency-Key")
        payload_hash = self._request_payload_hash(request.data)
        cache_key = None
        implicit_cache_key = None

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
        else:
            implicit_cache_key = self._submission_cache_key(
                self._request_scope(request),
                "create",
                payload_hash,
            )
            existing = self._existing_booking_from_cache(implicit_cache_key)
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

        response = super().create(request, *args, **kwargs)

        if cache_key and response.status_code == status.HTTP_201_CREATED and response.data.get("id"):
            self._store_booking_cache(cache_key, response.data["id"], payload_hash, ttl=600)
        if implicit_cache_key and response.status_code == status.HTTP_201_CREATED and response.data.get("id"):
            self._store_booking_cache(implicit_cache_key, response.data["id"], payload_hash)
        return response

    def perform_create(self, serializer):
        
        from .services import BookingService
        from django.core.exceptions import ValidationError as DjangoValidationError

        restaurant = serializer.validated_data['restaurant']

                                                          
        if not restaurant.is_verified:
            raise drf_serializers.ValidationError(
                {"detail": "Ресторан ещё не прошёл верификацию. Бронирование невозможно."}
            )

        date = serializer.validated_data['date']
        time_val = serializer.validated_data['time']
        guests = serializer.validated_data.get('guests', 1)
        duration = serializer.validated_data.get('duration_minutes', 90)

                                                      
        preferred_table_id = None
        preferred_table_id_raw = self.request.data.get('table_id')
        if preferred_table_id_raw not in (None, ''):
            try:
                preferred_table_id = int(preferred_table_id_raw)
            except (TypeError, ValueError):
                raise drf_serializers.ValidationError({"table_id": "Некорректный table_id."})

        user = self.request.user if self.request.user.is_authenticated else None
        user_phone = serializer.validated_data.get('user_phone')
        if user_phone:
            user_phone = user_phone.strip()
        if not user_phone and user:
            profile = get_user_profile(user)
            profile_phone = getattr(profile, 'phone', None) if profile else None
            if profile_phone:
                user_phone = profile_phone.strip()

                                         
        booking_data = {
            'user_name': serializer.validated_data.get('user_name'),
            'user_phone': user_phone,
            'guest_email': serializer.validated_data.get('guest_email'),
            'event_type': serializer.validated_data.get('event_type'),
            'event_title': serializer.validated_data.get('event_title'),
            'special_requests': serializer.validated_data.get('special_requests'),
            'budget': serializer.validated_data.get('budget'),
            'source': 'web',
        }
        if serializer.validated_data.get('pay_at_restaurant') is not None:
            booking_data['pay_at_restaurant'] = serializer.validated_data.get('pay_at_restaurant')

        try:
            booking = BookingService.create_booking(
                user=user,
                restaurant=restaurant,
                booking_date=date,
                start_time=time_val,
                guests=guests,
                duration_minutes=duration,
                preferred_table_id=preferred_table_id,
                **booking_data
            )
                                                                                  
            serializer.instance = booking
            
                                                         
            if user and restaurant.owner:
                from chat.models import Conversation, Message
                try:
                    conv, _ = Conversation.objects.get_or_create(
                        restaurant=restaurant,
                        guest=user
                    )
                    Message.objects.create(
                        booking=booking,
                        restaurant=restaurant,
                        conversation=conv,
                        sender=restaurant.owner,
                        content=f"Ваша заявка на бронирование ({date} в {time_val}, {guests} чел.) успешно создана! Ожидайте подтверждения.",
                        is_read=False,
                    )
                except Exception as ex:
                    logger.error(f"Failed to auto-send DM for booking {booking.id}: {ex}")

        except DjangoValidationError as e:
            raise drf_serializers.ValidationError(e.message_dict if hasattr(e, 'message_dict') else str(e))

    def _is_restaurant_staff(self, request, booking):
        
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return self._can_manage_restaurant(user, booking.restaurant)

    def destroy(self, request, *args, **kwargs):
        
        booking = self.get_object()
        is_owner = booking.user and booking.user == request.user
        is_restaurant_staff = self._is_restaurant_staff(request, booking)

        if not is_owner and not is_restaurant_staff:
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        try:
            if is_restaurant_staff and not is_owner:
                                                
                StatusMachine.transition(booking, Booking.CANCELLED_BY_RESTAURANT, actor=request.user)
            else:
                                                      
                StatusMachine.transition(booking, Booking.CANCELLED_BY_USER, actor=request.user)
                if booking.restaurant.owner:
                    NotificationService.notify_user(
                        booking.restaurant.owner,
                        "Бронь отменена",
                        f"Клиент отменил бронирование на {booking.date} в {booking.time}.",
                        data={"booking_id": booking.id, "type": "booking_cancelled_by_user"},
                    )
        except ValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)

                                           
        WaitlistService.promote_next(booking.restaurant, booking.date, booking.time)

        return Response(status=status.HTTP_204_NO_CONTENT)
    @action(detail=False, methods=['post'], permission_classes=[CanManageReservations])
    def create_manual(self, request):
        
        from .services import BookingService
        from django.core.exceptions import ValidationError as DjangoValidationError

        serializer = AdminBookingSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        payload_hash = self._request_payload_hash(request.data)
        submission_cache_key = self._submission_cache_key(
            self._request_scope(request),
            "create_manual",
            payload_hash,
        )
        existing = self._existing_booking_from_cache(submission_cache_key)
        if existing:
            response_serializer = BookingSerializer(existing)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        restaurant = serializer.validated_data['restaurant']
        date = serializer.validated_data['date']
        time_val = serializer.validated_data['time']
        guests = serializer.validated_data.get('guests', 1)
        duration = serializer.validated_data.get('duration_minutes', 90)

        if not self._can_manage_restaurant(request.user, restaurant):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

                                                                                 
        requested_status = serializer.validated_data.get('status', Booking.CONFIRMED)
        preferred_table_id = serializer.validated_data.get('table_id')
        if preferred_table_id is None:
            preferred_table_id_raw = request.data.get('table_id')
            if preferred_table_id_raw not in (None, ''):
                try:
                    preferred_table_id = int(preferred_table_id_raw)
                except (TypeError, ValueError):
                    return api_error("Некорректный table_id.", status.HTTP_400_BAD_REQUEST)

        booking_data = {
            'user_name': serializer.validated_data.get('user_name'),
            'user_phone': serializer.validated_data.get('user_phone'),
            'guest_email': serializer.validated_data.get('guest_email'),
            'event_type': serializer.validated_data.get('event_type'),
            'event_title': serializer.validated_data.get('event_title'),
            'special_requests': serializer.validated_data.get('special_requests'),
            'budget': serializer.validated_data.get('budget'),
            'source': 'admin',
        }
        if serializer.validated_data.get('pay_at_restaurant') is not None:
            booking_data['pay_at_restaurant'] = serializer.validated_data.get('pay_at_restaurant')

        try:
            booking = BookingService.create_booking(
                user=None,                           
                restaurant=restaurant,
                booking_date=date,
                start_time=time_val,
                guests=guests,
                duration_minutes=duration,
                preferred_table_id=preferred_table_id,
                **booking_data
            )
                                                                                                 
            if booking.status != requested_status and requested_status in (Booking.CONFIRMED, Booking.PENDING):
                booking.status = requested_status
                booking.save(update_fields=['status'])
                                             
            response_serializer = BookingSerializer(booking)
            self._store_booking_cache(submission_cache_key, booking.id, payload_hash)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except DjangoValidationError as e:
            return api_error(str(e), status.HTTP_400_BAD_REQUEST)
    @action(detail=False, methods=['get'], permission_classes=[CanManageReservations])
    def my_restaurant(self, request):
        
        restaurant = get_user_restaurant(request.user)
        
        if not restaurant:
            return Response({"detail": "No restaurant associated with this user."}, status=status.HTTP_400_BAD_REQUEST)
        
        qs = self._optimized_booking_queryset(
            Booking.objects.filter(restaurant=restaurant),
            include_history=False,
            include_order_prefetch=False,
        ).annotate(
            _pending_first=Case(
                When(status=Booking.PENDING, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            ),
        ).order_by('_pending_first', '-date', '-time')

        qs = self._apply_common_filters(qs, request)
        qs = self.filter_queryset(qs)
        return self._apply_response_pagination(request, qs, allow_limit=True)

    def _edit_booking(self, request, booking, payload, *, partial=False):
        serializer = BookingAdminUpdateSerializer(
            instance=booking,
            data=payload,
            partial=partial,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        if self._schedule_fields_changed(validated_data):
            return self._apply_schedule_update(request, booking, validated_data)

        return self._apply_metadata_update(booking, validated_data, request.user)

    def update(self, request, *args, **kwargs):
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        return self._edit_booking(request, booking, request.data, partial=False)

    def partial_update(self, request, *args, **kwargs):
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
        return self._edit_booking(request, booking, request.data, partial=True)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def attach_order(self, request, pk=None):
        
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
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def available_slots(self, request):
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
            raise drf_serializers.ValidationError({"detail": "restaurant_id and date are required."})
        
        try:
            restaurant_id_int = int(restaurant_id)
            guests = int(guests_raw)
            if guests < 1 or guests > 20:
                raise ValueError
            if duration < 1:
                raise ValueError
            restaurant = Restaurant.objects.get(id=restaurant_id_int)
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
                                                                                     
        return Response(
            {
                "slots": slots,
                "available_slots": slots,
                "unavailable_slots": [],
                "meta": {
                    "restaurant_id": restaurant.id,
                    "date": date_str,
                    "guests": guests,
                    "duration_minutes": duration,
                },
            }
        )

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def suggestions(self, request):
        from restaurants.models import Restaurant
        from .services import BookingService
        
        restaurant_id = request.query_params.get('restaurant_id')
        date_str = request.query_params.get('date')
        guests_raw = request.query_params.get('party_size', 2)
        preferred_time = request.query_params.get('preferred_time')
        
        if not restaurant_id or not date_str:
            return api_error("restaurant_id and date are required.", status.HTTP_400_BAD_REQUEST)
            
        try:
            guests = int(guests_raw)
            restaurant = Restaurant.objects.get(id=restaurant_id)
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except (Restaurant.DoesNotExist, ValueError):
            return api_error("Invalid parameters.", status.HTTP_400_BAD_REQUEST)
            
        duration = getattr(restaurant, 'turnover_default_min', 85)
        slots = BookingService.get_available_slots(restaurant, date_obj, guests, duration)
        
        suggestions = []
        for slot in slots:
            label = "ok"
            if preferred_time:
                try:
                    pt = datetime.strptime(preferred_time, '%H:%M').time()
                    slot_t = datetime.strptime(slot, '%H:%M').time()
                    diff = abs((datetime.combine(date_obj, pt) - datetime.combine(date_obj, slot_t)).total_seconds() / 60)
                    if diff <= 30:
                        label = "best"
                except ValueError:
                    pass
            suggestions.append({"time": slot, "label": label})
            
        return Response(suggestions)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def available_tables(self, request):
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
        return Response({
            "available_tables": serializer.data,
            "available_table_ids": table_ids,
        })

    @action(detail=True, methods=['get'], permission_classes=[CanManageReservations])
    def smart_tables(self, request, pk=None):
        booking = self.get_object()
        if not self._is_restaurant_staff(request, booking):
            return api_error("Permission denied", status.HTTP_403_FORBIDDEN)

        suggestions = BookingService.find_best_tables(
            booking.restaurant,
            booking.date,
            booking.time,
            booking.guests,
            duration_minutes=booking.duration_minutes,
        )
        serializer = TableSerializer(suggestions[:5], many=True)
        warning = None
        if not suggestions:
            warning = (
                f"Нет свободных столов на {booking.time.strftime('%H:%M')} "
                f"с учетом turnover {booking.duration_minutes} мин."
            )
        return Response(
            {
                "reservation_id": booking.id,
                "turnover_minutes": getattr(booking.restaurant, 'turnover_default_min', 85),
                "duration_minutes": booking.duration_minutes,
                "warning": warning,
                "suggested_tables": serializer.data,
            }
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.user != request.user:
            return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        try:
            StatusMachine.transition(booking, Booking.CANCELLED_BY_USER, actor=request.user)
            if booking.restaurant.owner:
                NotificationService.notify_user(
                    booking.restaurant.owner,
                    "Бронь отменена",
                    f"Клиент отменил бронирование на {booking.date} в {booking.time}.",
                    data={"booking_id": booking.id, "type": "booking_cancelled_by_user"}
                )
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        WaitlistService.promote_next(booking.restaurant, booking.date, booking.time)

        return Response(self.get_serializer(booking).data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def join_waitlist(self, request):
        
        serializer = WaitlistEntrySerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        try:
            entry = serializer.save(user=request.user if request.user.is_authenticated else None)
        except IntegrityError:
            return Response(
                {"detail": "Вы уже в листе ожидания на это время."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(WaitlistEntrySerializer(entry).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get', 'delete'], permission_classes=[permissions.AllowAny], url_path=r'waitlist/public/(?P<public_token>[^/.]+)')
    def public_waitlist(self, request, public_token=None):
        
        try:
            entry = (
                WaitlistEntry.objects.select_related('restaurant', 'user', 'promoted_booking')
                .get(public_token=public_token)
            )
        except WaitlistEntry.DoesNotExist:
            return api_error("Waitlist entry not found", status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            return Response(WaitlistEntrySerializer(entry).data, status=status.HTTP_200_OK)

        if entry.status not in (WaitlistEntry.WAITING, WaitlistEntry.NOTIFIED):
            return api_error("Запись уже обработана.", status.HTTP_400_BAD_REQUEST)

        entry.status = WaitlistEntry.CANCELLED
        entry.save(update_fields=['status'])
        return Response(WaitlistEntrySerializer(entry).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def leave_waitlist(self, request):
        
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
        
        entries = WaitlistEntry.objects.filter(
            user=request.user,
            status__in=[WaitlistEntry.WAITING, WaitlistEntry.NOTIFIED],
        ).select_related('restaurant')
        return Response(WaitlistEntrySerializer(entries, many=True).data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def confirm_waitlist(self, request):
        from .services import BookingService

        entry = None
        public_token = request.data.get('public_token')
        entry_id = request.data.get('waitlist_id')

        if public_token:
            try:
                entry = WaitlistEntry.objects.select_related('restaurant', 'user', 'promoted_booking').get(
                    public_token=public_token,
                    status=WaitlistEntry.NOTIFIED,
                )
            except WaitlistEntry.DoesNotExist:
                return Response({"detail": "Not found or already expired."}, status=status.HTTP_404_NOT_FOUND)
        else:
            if not request.user.is_authenticated:
                return Response({"detail": "public_token or waitlist_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            if not entry_id:
                return Response({"detail": "waitlist_id is required."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                entry = WaitlistEntry.objects.select_related('restaurant', 'user', 'promoted_booking').get(
                    id=entry_id,
                    user=request.user,
                    status=WaitlistEntry.NOTIFIED,
                )
            except WaitlistEntry.DoesNotExist:
                return Response({"detail": "Not found or already expired."}, status=status.HTTP_404_NOT_FOUND)

        if entry.notified_at and (timezone.now() - entry.notified_at).total_seconds() > 900:
            entry.status = WaitlistEntry.EXPIRED
            entry.save()
            return Response({"detail": "Время подтверждения истекло."}, status=status.HTTP_410_GONE)

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
                        user_name=entry.contact_name,
                        user_phone=entry.contact_phone,
                        guest_email=entry.contact_email,
                    )
                    booking.tables.set(tables)

                    entry.status = WaitlistEntry.PROMOTED
                    entry.promoted_booking = booking
                    entry.save()
                    NotificationService.notify_restaurant_new_booking(booking)

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
