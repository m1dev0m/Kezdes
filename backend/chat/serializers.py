from rest_framework import serializers
from .models import Message

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    booking_status = serializers.SerializerMethodField(read_only=True)
    booking_date = serializers.SerializerMethodField(read_only=True)
    booking_time = serializers.SerializerMethodField(read_only=True)
    booking_guests = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Message
        fields = [
            'id',
            'booking',
            'booking_status',
            'booking_date',
            'booking_time',
            'booking_guests',
            'restaurant',
            'sender',
            'sender_name',
            'content',
            'timestamp',
            'is_read',
        ]
        read_only_fields = ['sender', 'timestamp']

    def get_booking_status(self, obj: Message):
        if not obj.booking_id:
            return None
        return obj.booking.status

    def get_booking_date(self, obj: Message):
        if not obj.booking_id:
            return None
        return str(obj.booking.date)

    def get_booking_time(self, obj: Message):
        if not obj.booking_id:
            return None
        return obj.booking.time.strftime('%H:%M')

    def get_booking_guests(self, obj: Message):
        if not obj.booking_id:
            return None
        return obj.booking.guests
