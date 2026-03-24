from rest_framework import serializers
from datetime import datetime, timedelta, date
from .models import Booking, ReservationHistory
from orders.models import Order
from chat.models import Message
import logging

logger = logging.getLogger(__name__)


class ReservationHistorySerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    from_table_number = serializers.CharField(source='from_table.number', read_only=True)
    to_table_number = serializers.CharField(source='to_table.number', read_only=True)

    class Meta:
        model = ReservationHistory
        fields = [
            'id',
            'event_type',
            'status',
            'from_status',
            'to_status',
            'from_table',
            'from_table_number',
            'to_table',
            'to_table_number',
            'actor',
            'actor_username',
            'changed_at',
        ]


class BookingSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    user_phone = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    order_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    preorder = serializers.SerializerMethodField(read_only=True)
    table_number = serializers.SerializerMethodField(read_only=True)
    table_ids = serializers.SerializerMethodField(read_only=True)
    reservation_date = serializers.DateField(source='date', required=False)
    reservation_time = serializers.TimeField(source='time', required=False)
    customer_id = serializers.SerializerMethodField(read_only=True)
    table_id = serializers.SerializerMethodField(read_only=True)
    history = ReservationHistorySerializer(many=True, read_only=True)
    
    duration_hours = serializers.IntegerField(required=False, write_only=True)

    def validate_date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Нельзя забронировать на прошедшую дату.")
        return value

    class Meta:
        model = Booking
        fields = [
            'id', 'user', 'user_name', 'user_phone', 'restaurant', 'restaurant_name',
            'date', 'time', 'duration_minutes', 'duration_hours', 'guests', 'event_type', 'event_title',
            'status', 'status_display', 'special_requests', 'created_at',
            'budget', 'pay_at_restaurant',
            'order_id', 'preorder', 'table_number', 'table_ids',
            'reservation_date', 'reservation_time', 'customer_id', 'table_id',
            'is_checked_in', 'check_in_time',
            'history',
        ]
        read_only_fields = ['user', 'status']
        validators = []

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('status') == Booking.CONFIRMED:
            data['status'] = 'confirmed'
        elif data.get('status') == Booking.SEATED:
            data['status'] = 'seated'
        elif data.get('status') in (Booking.CANCELLED_BY_USER, Booking.CANCELLED_BY_RESTAURANT):
            data['status'] = 'cancelled'

        if instance.user:
            data['user_name'] = instance.user.get_full_name() or instance.user.username or data.get('user_name')
            if hasattr(instance.user, 'profile') and instance.user.profile.phone:
                data['user_phone'] = instance.user.profile.phone

        return data

    def get_table_number(self, obj: Booking):
        return obj.table.number if obj.table else None

    def get_customer_id(self, obj: Booking):
        return obj.user_id

    def get_table_id(self, obj: Booking):
        return obj.table_id

    def get_preorder(self, obj: Booking):
        order = obj.orders.order_by("-created_at").first()
        if not order:
            return None
        return {
            "id": order.id,
            "status": order.status,
            "payment_status": order.payment_status,
            "total_amount": str(order.total_amount),
        }

    def get_table_ids(self, obj: Booking):
        return list(obj.tables.values_list('id', flat=True))

    def validate(self, attrs):
        from django.utils import timezone
        
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Требуется авторизация.")

        user = request.user
        restaurant = attrs.get('restaurant')
        booking_date = attrs.get('date')
        start_time = attrs.get('time')
        guests = attrs.get('guests', 1)
        order_id = attrs.get("order_id")
        
        # Prevent booking in the past
        if booking_date and booking_date == date.today() and start_time:
            now = timezone.now()
            current_time = now.time()
            if start_time < current_time:
                raise serializers.ValidationError(
                    {"time": "Нельзя забронировать на прошедшее время сегодня."}
                )
        
        duration_minutes = attrs.get('duration_minutes')
        duration_hours = attrs.get('duration_hours')
        
        if duration_minutes:
            duration = duration_minutes
        elif duration_hours:
            duration = duration_hours * 60
        else:
            duration = 90
            
        attrs['duration_minutes'] = duration
        if 'duration_hours' in attrs:
            del attrs['duration_hours']

        if duration < 15 or duration > 480:
            raise serializers.ValidationError(
                {"duration_minutes": "Длительность должна быть от 15 до 480 минут (8 часов)."}
            )

        if guests < 1 or guests > 20:
            raise serializers.ValidationError(
                {"guests": "Количество гостей должно быть от 1 до 20."}
            )
        if restaurant and not restaurant.is_verified:
            raise serializers.ValidationError(
                {"restaurant": "Ресторан еще не одобрен платформой и не принимает бронирования."}
            )

        if order_id:
            try:
                order = Order.objects.select_related("restaurant").get(id=order_id, user=user)
            except Order.DoesNotExist:
                raise serializers.ValidationError({"order_id": "Заказ не найден."})
            if order.reservation_id is not None:
                raise serializers.ValidationError({"order_id": "Этот заказ уже привязан к бронированию."})
            if order.restaurant_id != restaurant.id:
                raise serializers.ValidationError({"order_id": "Заказ относится к другому ресторану."})
            if order.status not in (Order.Status.DRAFT, Order.Status.CONFIRMED):
                raise serializers.ValidationError({"order_id": "Невозможно использовать этот заказ."})

        from .services import BookingService, make_aware_if_needed
        start_dt = make_aware_if_needed(datetime.combine(booking_date, start_time))
        end_dt = start_dt + timedelta(minutes=duration)

        if not BookingService.is_within_operating_hours(restaurant, booking_date, start_time, duration):
            raise serializers.ValidationError({"time": "Бронирование недоступно на выбранное время."})

        user_same_restaurant = Booking.objects.filter(
            user=user,
            restaurant=restaurant,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt
        )
        for existing in user_same_restaurant:
            raise serializers.ValidationError(
                {"time": f"У вас уже есть активная бронь на пересекающееся время "
                         f"в этом ресторане (статус: {existing.get_status_display()}). "
                         f"Отмените её перед созданием новой."}
            )

        user_all_bookings = Booking.objects.filter(
            user=user,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt
        ).exclude(restaurant=restaurant).select_related('restaurant')
        if user_all_bookings.exists():
            existing = user_all_bookings.first()
            raise serializers.ValidationError(
                {"time": f"У вас уже есть бронь на пересекающееся время "
                         f"в «{existing.restaurant.name}». Отмените её сначала."}
            )

        is_available, available_seats = BookingService.check_capacity(
            restaurant, booking_date, start_time, guests, duration
        )
        if not is_available:
            raise serializers.ValidationError(
                {"guests": f"Превышена вместимость ресторана. "
                           f"Доступно мест: {available_seats}, запрошено: {guests}."}
            )

        active_count = Booking.objects.filter(
            user=user,
            status__in=Booking.ACTIVE_STATUSES
        ).count()
        if active_count >= 3:
            raise serializers.ValidationError(
                {"non_field_errors": "Слишком много активных бронирований (максимум 3). "
                                     "Отмените существующие, чтобы создать новые."}
            )

        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        order_id = validated_data.pop("order_id", None)
        validated_data['user'] = user
        booking = super().create(validated_data)

        if order_id:
            order = Order.objects.select_for_update().get(id=order_id, user=user)
            if order.reservation_id is not None:
                raise serializers.ValidationError({"order_id": "Этот заказ уже привязан к бронированию."})
            if order.restaurant_id != booking.restaurant_id:
                raise serializers.ValidationError({"order_id": "Заказ относится к другому ресторану."})

            payment_status = Order.PaymentStatus.UNPAID if booking.pay_at_restaurant else Order.PaymentStatus.PAID
            if order.status == Order.Status.DRAFT:
                try:
                    order.confirm_atomic(payment_status=payment_status)
                except Exception as e:
                    raise serializers.ValidationError({"order_id": str(e)})
            else:
                if booking.pay_at_restaurant and order.payment_status != Order.PaymentStatus.UNPAID:
                    order.payment_status = Order.PaymentStatus.UNPAID
                    order.save(update_fields=["payment_status"])

            order.reservation = booking
            order.save(update_fields=["reservation"])

        try:
            Message.objects.create(
                booking=booking,
                sender=user,
                content=f"Новая заявка на бронирование в «{booking.restaurant.name}» на {booking.date} {booking.time.strftime('%H:%M')} ({booking.guests} гостей).",
            )
        except Exception as e:
            logger.warning(f"Failed to create message for booking {booking.id}: {e}")

        return booking


class AdminBookingSerializer(serializers.ModelSerializer):
    """
    Serializer used exclusively by restaurant admins to manually create bookings.
    Bypasses user linkage validation, relying instead on explicit name/phone fields.
    """
    user_name_manual = serializers.CharField(
        source='user_name',
        max_length=255,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    user_phone_manual = serializers.CharField(
        source='user_phone',
        max_length=50,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    duration_hours = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'user_name_manual', 'user_phone_manual', 'restaurant',
            'date', 'time', 'duration_minutes', 'duration_hours', 'guests', 'event_type', 'event_title',
            'status', 'special_requests', 'created_at'
        ]

    def validate(self, attrs):
        restaurant = attrs.get('restaurant')
        booking_date = attrs.get('date')
        start_time = attrs.get('time')
        
        duration_minutes = attrs.get('duration_minutes')
        duration_hours = attrs.get('duration_hours')
        
        if duration_minutes:
            duration = duration_minutes
        elif duration_hours:
            duration = duration_hours * 60
        else:
            duration = 90
            
        attrs['duration_minutes'] = duration
        if 'duration_hours' in attrs:
            del attrs['duration_hours']

        if duration < 15 or duration > 480:
            raise serializers.ValidationError(
                {"duration_minutes": "Длительность должна быть от 15 до 480 минут (8 часов)."}
            )

        from .services import BookingService, make_aware_if_needed
        if not BookingService.is_within_operating_hours(restaurant, booking_date, start_time, duration):
            raise serializers.ValidationError({"time": "Бронирование недоступно на выбранное время."})

        guests = attrs.get('guests', 1)
        if guests < 1 or guests > 20:
            raise serializers.ValidationError(
                {"guests": "Количество гостей должно быть от 1 до 20."}
            )

        is_available, available_seats = BookingService.check_capacity(
            restaurant, booking_date, start_time, guests, duration
        )
        if not is_available:
            raise serializers.ValidationError(
                {"guests": f"Превышена вместимость. Доступно мест: {available_seats}, запрошено: {guests}."}
            )

        # Restrict allowed initial statuses for manual bookings
        requested_status = attrs.get('status', Booking.CONFIRMED)
        allowed_initial = {Booking.PENDING, Booking.CONFIRMED}
        if requested_status not in allowed_initial:
            raise serializers.ValidationError(
                {"status": f"Ручное бронирование может быть создано только со статусом pending или confirmed."}
            )

        return attrs

    def create(self, validated_data):
        # We do NOT set validated_data['user'] to self.context['request'].user
        # because this is a manual booking for a guest who might not have an account.
        # The admin is just the creator, not the subject of the booking.
        return super().create(validated_data)
