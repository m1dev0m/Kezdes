from rest_framework import serializers
from datetime import datetime, timedelta, date
from .models import Booking, ReservationHistory
from restaurants.models import Review
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


class PublicBookingSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    table_number = serializers.SerializerMethodField(read_only=True)
    can_be_cancelled = serializers.SerializerMethodField(read_only=True)
    can_review = serializers.SerializerMethodField(read_only=True)
    rebook_payload = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'public_token',
            'restaurant',
            'restaurant_name',
            'date',
            'time',
            'guests',
            'status',
            'status_display',
            'table_number',
            'can_be_cancelled',
            'can_review',
            'rebook_payload',
            'created_at',
        ]
        read_only_fields = fields

    def get_table_number(self, obj: Booking):
        return obj.table.number if obj.table else None

    def get_can_be_cancelled(self, obj: Booking):
        return obj.can_be_cancelled

    def get_can_review(self, obj: Booking):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated or not obj.user_id or obj.user_id != user.id:
            return False
        if obj.status != Booking.COMPLETED:
            return False
        return not Review.objects.filter(restaurant_id=obj.restaurant_id, user_id=obj.user_id).exists()

    def get_rebook_payload(self, obj: Booking):
        return {
            'booking_id': obj.id,
            'restaurant_id': obj.restaurant_id,
            'restaurant_name': obj.restaurant.name,
            'date': obj.date.isoformat() if obj.date else None,
            'time': obj.time.strftime('%H:%M') if obj.time else None,
            'guests': obj.guests,
            'duration_minutes': obj.duration_minutes,
            'public_token': obj.public_token,
        }


class BookingSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    user_phone = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    guest_email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    public_token = serializers.CharField(read_only=True)
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)

    table_number = serializers.SerializerMethodField(read_only=True)
    table_ids = serializers.SerializerMethodField(read_only=True)
    has_preorder = serializers.SerializerMethodField(read_only=True)
    orders_count = serializers.SerializerMethodField(read_only=True)
    can_review = serializers.SerializerMethodField(read_only=True)
    rebook_payload = serializers.SerializerMethodField(read_only=True)
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
            'id', 'public_token', 'user', 'user_name', 'user_phone', 'guest_email', 'restaurant', 'restaurant_name',
            'date', 'time', 'duration_minutes', 'duration_hours', 'guests', 'event_type', 'event_title',
            'status', 'status_display', 'source', 'special_requests', 'created_at',
            'budget', 'pay_at_restaurant',
            'table_number', 'table_ids', 'has_preorder', 'orders_count', 'can_review', 'rebook_payload',
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
        # Normalize status values to the canonical set the frontend expects.
        # CONFIRMED and APPROVED are the same model constant ('confirmed') — keep as-is.
        # CANCELLED_BY_USER / CANCELLED_BY_RESTAURANT are kept distinct so the frontend
        # can differentiate them (isActiveReservation checks both separately).
        # No remapping needed for: pending, seated, rejected, completed, no_show, expired.
        status_val = data.get('status')
        if status_val == Booking.CONFIRMED:
            data['status'] = 'confirmed'
        elif status_val == Booking.SEATED:
            data['status'] = 'seated'
        # Do NOT collapse cancelled_by_user / cancelled_by_restaurant into 'cancelled' —
        # the frontend ReservationStatus type and isActiveReservation() use the full values.

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

    def get_has_preorder(self, obj: Booking):
        return obj.orders.exists()

    def get_orders_count(self, obj: Booking):
        return obj.orders.count()

    def get_can_review(self, obj: Booking):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated or not obj.user_id or obj.user_id != user.id:
            return False
        if obj.status != Booking.COMPLETED:
            return False
        return not Review.objects.filter(restaurant_id=obj.restaurant_id, user_id=obj.user_id).exists()

    def get_rebook_payload(self, obj: Booking):
        return {
            'booking_id': obj.id,
            'restaurant_id': obj.restaurant_id,
            'restaurant_name': obj.restaurant.name,
            'date': obj.date.isoformat() if obj.date else None,
            'time': obj.time.strftime('%H:%M') if obj.time else None,
            'guests': obj.guests,
            'duration_minutes': obj.duration_minutes,
            'public_token': obj.public_token,
        }


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
    guest_email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    status = serializers.ChoiceField(
        choices=[
            (Booking.PENDING, 'Pending'),
            (Booking.CONFIRMED, 'Confirmed'),
        ],
        required=False,
    )
    table_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    duration_hours = serializers.IntegerField(required=False, write_only=True)
    table_number = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'user_name', 'user_phone', 'guest_email', 'restaurant',
            'date', 'time', 'duration_minutes', 'duration_hours', 'guests', 'event_type', 'event_title',
            'status', 'table_id', 'special_requests', 'budget', 'pay_at_restaurant', 'created_at', 'table_number',
        ]
        extra_kwargs = {
            'restaurant': {'required': False}
        }

    def get_table_number(self, obj: Booking):
        return obj.table.number if obj.table else None

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

        if duration_minutes is not None:
            duration = duration_minutes
        elif duration_hours is not None:
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

        # Manual bookings must include explicit guest contact details.
        # Prevents creating unreachable reservations via implicit defaults.
        user_name = (attrs.get('user_name') or '').strip()
        user_phone = (attrs.get('user_phone') or '').strip()
        errors = {}
        if not user_name:
            errors['user_name'] = "Укажите имя гостя для ручного бронирования."
        if not user_phone:
            errors['user_phone'] = "Укажите телефон гостя для ручного бронирования."
        if errors:
            raise serializers.ValidationError(errors)

        from .services import BookingService
        if not BookingService.is_within_operating_hours(restaurant, booking_date, start_time, duration):
            raise serializers.ValidationError({"time": "Бронирование недоступно на выбранное время."})

        return attrs


class BookingAdminUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for restaurant staff edits and reschedules.
    Keeps the update contract explicit so admin table actions can patch
    guest details and schedule fields without exposing unrelated model state.
    """
    user_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    user_phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    guest_email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    date = serializers.DateField(required=False)
    time = serializers.TimeField(required=False)
    guests = serializers.IntegerField(required=False)
    duration_minutes = serializers.IntegerField(required=False)
    table_id = serializers.IntegerField(required=False, allow_null=True)
    event_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    event_title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    special_requests = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    budget = serializers.IntegerField(required=False, allow_null=True)
    pay_at_restaurant = serializers.BooleanField(required=False)

    class Meta:
        model = Booking
        fields = [
            'user_name',
            'user_phone',
            'guest_email',
            'date',
            'time',
            'guests',
            'duration_minutes',
            'table_id',
            'event_type',
            'event_title',
            'special_requests',
            'budget',
            'pay_at_restaurant',
        ]

    def validate_date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Нельзя перенести бронь на прошедшую дату.")
        return value

    def validate_guests(self, value):
        if value < 1 or value > 20:
            raise serializers.ValidationError("Количество гостей должно быть от 1 до 20.")
        return value

    def validate_duration_minutes(self, value):
        if value < 15 or value > 480:
            raise serializers.ValidationError("Длительность бронирования должна быть от 15 до 480 минут.")
        return value

    def validate(self, attrs):
        if 'date' in attrs and attrs['date'] is None:
            raise serializers.ValidationError({'date': 'Неверный формат даты.'})
        if 'time' in attrs and attrs['time'] is None:
            raise serializers.ValidationError({'time': 'Неверный формат времени.'})
        return super().validate(attrs)
