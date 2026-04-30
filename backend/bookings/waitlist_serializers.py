from rest_framework import serializers
from .models import WaitlistEntry
from core.utils import get_user_profile


class WaitlistEntrySerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    user_name = serializers.SerializerMethodField(read_only=True)
    contact_name = serializers.SerializerMethodField(read_only=True)
    contact_phone = serializers.SerializerMethodField(read_only=True)
    contact_email = serializers.SerializerMethodField(read_only=True)
    promoted_booking_public_token = serializers.CharField(
        source='promoted_booking.public_token',
        read_only=True,
    )
    can_be_cancelled = serializers.SerializerMethodField(read_only=True)
    slot_available = serializers.SerializerMethodField(read_only=True)
    suggested_tables = serializers.SerializerMethodField(read_only=True)
    turnover_minutes = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = WaitlistEntry
        fields = [
            'id',
            'public_token',
            'user',
            'restaurant',
            'restaurant_name',
            'user_name',
            'guest_name',
            'guest_phone',
            'guest_email',
            'contact_name',
            'contact_phone',
            'contact_email',
            'date',
            'time',
            'guests',
            'status',
            'can_be_cancelled',
            'slot_available',
            'suggested_tables',
            'turnover_minutes',
            'notified_at',
            'promoted_booking',
            'promoted_booking_public_token',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'public_token',
            'user',
            'status',
            'notified_at',
            'promoted_booking',
            'promoted_booking_public_token',
            'created_at',
            'user_name',
            'contact_name',
            'contact_phone',
            'contact_email',
            'can_be_cancelled',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        profile = get_user_profile(user) if user and user.is_authenticated else None

        is_staff_actor = bool(profile and (getattr(profile, 'is_staff_member', False) or getattr(profile, 'is_global_admin', False)))

        if not user or not user.is_authenticated:
            guest_name = (attrs.get('guest_name') or '').strip()
            guest_phone = (attrs.get('guest_phone') or '').strip()
            if not guest_name:
                raise serializers.ValidationError({'guest_name': 'Укажите имя для листа ожидания.'})
            if not guest_phone:
                raise serializers.ValidationError({'guest_phone': 'Укажите телефон для листа ожидания.'})
            attrs['guest_name'] = guest_name
            attrs['guest_phone'] = guest_phone
        elif is_staff_actor:
            guest_name = (attrs.get('guest_name') or '').strip()
            guest_phone = (attrs.get('guest_phone') or '').strip()
            if not guest_name:
                raise serializers.ValidationError({'guest_name': 'Укажите имя гостя для листа ожидания.'})
            if not guest_phone:
                raise serializers.ValidationError({'guest_phone': 'Укажите телефон гостя для листа ожидания.'})
            attrs['guest_name'] = guest_name
            attrs['guest_phone'] = guest_phone
        else:
            if not attrs.get('guest_name'):
                attrs['guest_name'] = user.get_full_name() or user.username
            if not attrs.get('guest_phone') and profile and getattr(profile, 'phone', None):
                attrs['guest_phone'] = profile.phone
            if not attrs.get('guest_email') and getattr(user, 'email', None):
                attrs['guest_email'] = user.email
        return attrs

    def get_user_name(self, obj: WaitlistEntry):
        return obj.contact_name

    def get_contact_name(self, obj: WaitlistEntry):
        return obj.contact_name

    def get_contact_phone(self, obj: WaitlistEntry):
        return obj.contact_phone

    def get_contact_email(self, obj: WaitlistEntry):
        return obj.contact_email

    def get_can_be_cancelled(self, obj: WaitlistEntry):
        return obj.status in (WaitlistEntry.WAITING, WaitlistEntry.NOTIFIED)

    def get_slot_available(self, obj: WaitlistEntry):
        from .services import BookingService

        is_available, _ = BookingService.check_capacity(
            obj.restaurant,
            obj.date,
            obj.time,
            obj.guests,
            duration_minutes=self.get_turnover_minutes(obj),
        )
        return is_available

    def get_suggested_tables(self, obj: WaitlistEntry):
        from .services import BookingService

        tables = BookingService.find_best_tables(
            obj.restaurant,
            obj.date,
            obj.time,
            obj.guests,
            duration_minutes=self.get_turnover_minutes(obj),
        )
        return [
            {
                'id': table.id,
                'name': table.number,
                'capacity': table.seats,
            }
            for table in tables[:3]
        ]

    def get_turnover_minutes(self, obj: WaitlistEntry):
        return getattr(obj.restaurant, 'turnover_default_min', 85)
