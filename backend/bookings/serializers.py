from rest_framework import serializers
from datetime import datetime, timedelta, date
from django.utils import timezone
from .models import Booking, ReservationHistory
from restaurants.models import Review
from core.utils import get_user_profile
import logging

logger = logging.getLogger(__name__)


def _prefetched_related_items(instance, relation_name):
    cache = getattr(instance, "_prefetched_objects_cache", {})
    if relation_name not in cache:
        return None
    return cache[relation_name]


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
        reviewed_restaurant_ids = self.context.get('reviewed_restaurant_ids')
        if reviewed_restaurant_ids is not None:
            return obj.restaurant_id not in reviewed_restaurant_ids
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
    customer_summary = serializers.SerializerMethodField(read_only=True)
    history = ReservationHistorySerializer(many=True, read_only=True)

    duration_hours = serializers.IntegerField(required=False, write_only=True)

    def validate_date(self, value):
        if value < timezone.localdate():
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
            'customer_summary',
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
                                                                            
                                                                                        
                                                                                       
                                                                              
                                                                                          
        status_val = data.get('status')
        if status_val == Booking.CONFIRMED:
            data['status'] = 'confirmed'
        elif status_val == Booking.SEATED:
            data['status'] = 'seated'
                                                                                        
                                                                                            

        if instance.user:
            data['user_name'] = instance.user.get_full_name() or instance.user.username or data.get('user_name')
            if not data.get('user_phone'):
                profile = get_user_profile(instance.user)
                if profile and profile.phone:
                    data['user_phone'] = profile.phone

        return data

    def get_table_number(self, obj: Booking):
        return obj.table.number if obj.table else None

    def get_customer_id(self, obj: Booking):
        return obj.user_id

    def get_table_id(self, obj: Booking):
        return obj.table_id

    def get_customer_summary(self, obj: Booking):
        phone = (obj.user_phone or '').strip()
        if not phone and obj.user_id:
            profile = get_user_profile(obj.user)
            phone = (getattr(profile, 'phone', '') or '').strip()

        if not phone:
            return None

        summary_map = self.context.get('customer_summary_map')
        if summary_map is not None:
            return summary_map.get((obj.restaurant_id, phone))

        try:
            from crm.models import Customer
        except Exception:
            return None

        customer = Customer.objects.filter(
            restaurant_id=obj.restaurant_id,
            phone=phone,
        ).order_by('-last_visit').first()
        if not customer:
            return None

        return self._build_customer_summary(customer)

    @staticmethod
    def _build_customer_summary(customer):
        notes_text = (customer.notes or '').strip()
        note_preview = notes_text[:140].strip() if notes_text else ''
        if note_preview and len(notes_text) > 140:
            note_preview = f"{note_preview}..."

        risk_label = 'regular'
        if customer.flag == 'problem':
            risk_label = 'blacklist'
        elif (customer.no_show_count or 0) >= 2:
            risk_label = 'no_show_risk'
        elif customer.flag == 'vip' or (customer.visits_count or 0) >= 5:
            risk_label = 'vip'

        return {
            'id': customer.id,
            'visits_count': customer.visits_count or 0,
            'no_show_count': customer.no_show_count or 0,
            'flag': customer.flag or 'new',
            'is_vip': customer.flag == 'vip' or (customer.visits_count or 0) >= 5,
            'risk_label': risk_label,
            'notes': notes_text or '',
            'note_preview': note_preview,
        }

    def get_table_ids(self, obj: Booking):
        prefetched_tables = _prefetched_related_items(obj, 'tables')
        if prefetched_tables is not None:
            return [table.id for table in prefetched_tables]
        return list(obj.tables.values_list('id', flat=True))

    def get_has_preorder(self, obj: Booking):
        if hasattr(obj, 'has_preorder'):
            return obj.has_preorder
        prefetched_orders = _prefetched_related_items(obj, 'orders')
        if prefetched_orders is not None:
            return bool(prefetched_orders)
        return obj.orders.exists()

    def get_orders_count(self, obj: Booking):
        if hasattr(obj, 'orders_count'):
            return obj.orders_count
        prefetched_orders = _prefetched_related_items(obj, 'orders')
        if prefetched_orders is not None:
            return len(prefetched_orders)
        return obj.orders.count()

    def get_can_review(self, obj: Booking):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated or not obj.user_id or obj.user_id != user.id:
            return False
        if obj.status != Booking.COMPLETED:
            return False
        reviewed_restaurant_ids = self.context.get('reviewed_restaurant_ids')
        if reviewed_restaurant_ids is not None:
            return obj.restaurant_id not in reviewed_restaurant_ids
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


class BookingListSerializer(BookingSerializer):
    class Meta(BookingSerializer.Meta):
        fields = [
            'id', 'public_token', 'user', 'user_name', 'user_phone', 'restaurant', 'restaurant_name',
            'date', 'time', 'duration_minutes', 'guests', 'event_type', 'event_title',
            'status', 'status_display', 'source', 'created_at',
            'table_number', 'table_ids', 'has_preorder', 'orders_count',
            'reservation_date', 'reservation_time', 'customer_id', 'table_id', 'customer_summary',
            'is_checked_in', 'check_in_time',
        ]


class AdminBookingSerializer(serializers.ModelSerializer):
                                                                        
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

                                                                    
                                                                       
        if 'user_name' in attrs and attrs['user_name']:
            attrs['user_name'] = attrs['user_name'].strip()
        if 'user_phone' in attrs and attrs['user_phone']:
            attrs['user_phone'] = attrs['user_phone'].strip()

        from .services import BookingService
        if not BookingService.is_within_operating_hours(restaurant, booking_date, start_time, duration):
            raise serializers.ValidationError({"time": "Бронирование недоступно на выбранное время."})

        return attrs


class BookingAdminUpdateSerializer(serializers.ModelSerializer):
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
        if value < timezone.localdate():
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
