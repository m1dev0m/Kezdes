from rest_framework import serializers
from .models import WaitlistEntry


class WaitlistEntrySerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = WaitlistEntry
        fields = [
            'id', 'user', 'restaurant', 'restaurant_name', 'user_name',
            'date', 'time', 'guests', 'status', 'notified_at',
            'promoted_booking', 'created_at',
        ]
        read_only_fields = ['id', 'user', 'status', 'notified_at', 'promoted_booking', 'created_at']
