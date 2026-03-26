from rest_framework import serializers
from datetime import datetime, timedelta, date
from .models import Booking, ReservationHistory
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
            'table_number', 'table_ids',
            'reservation_date', 'reservation_time', 'customer_id', 'table_id',
            'is_checked_in', 'check_in_time',
            'history',
        ]
        read_only_fields = ['user', 'status']
        validators = []

    def validate_guests(self, value):
        if value < 1 or value > 20:
            raise serializers.ValidationError("Количество гостей должно быть от 1 до 20.")
        return value

    def validate_duration_minutes(self, value):
        if value < 15 or value > 480:
            raise serializers.ValidationError("Длительность бронирования должна быть от 15 до 480 минут.")
        return value

    def validate(self, attrs):
        # general validator for date/time formats is done by DRF fields,
        # but we include explicit fallback for invalid schedule.
        if 'date' in attrs and attrs['date'] is None:
            raise serializers.ValidationError({
                'date': 'Неверный формат даты.'
            })
        if 'time' in attrs and attrs['time'] is None:
            raise serializers.ValidationError({
                'time': 'Неверный формат времени.'
            })
        return super().validate(attrs)

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

    def get_table_ids(self, obj: Booking):
        return list(obj.tables.values_list('id', flat=True))


class AdminBookingSerializer(serializers.ModelSerializer):
    """
    Serializer used exclusively by restaurant admins to manually create bookings.
    Bypasses user linkage validation, relying instead on explicit name/phone fields.
    """
    # Accept both 'user_name' (frontend) and 'user_name_manual' (legacy)
    user_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    user_phone = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    duration_hours = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'user_name', 'user_phone', 'restaurant',
            'date', 'time', 'duration_minutes', 'duration_hours', 'guests', 'event_type', 'event_title',
            'status', 'special_requests', 'created_at'
        ]
        extra_kwargs = {
            'restaurant': {'required': False}
        }

    def validate(self, attrs):
        restaurant = attrs.get('restaurant')
        if not restaurant:
            request = self.context.get('request')
            if request and hasattr(request.user, 'profile'):
                from core.utils import get_user_restaurant
                restaurant = get_user_restaurant(request.user)
                if not restaurant:
                    raise serializers.ValidationError({"restaurant": "Не удалось определить ресторан пользователя."})
                attrs['restaurant'] = restaurant
            else:
                 raise serializers.ValidationError({"restaurant": "Обязательное поле."})

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

        from .services import BookingService
        if not BookingService.is_within_operating_hours(restaurant, booking_date, start_time, duration):
            raise serializers.ValidationError({"time": "Бронирование недоступно на выбранное время."})

        return attrs

