from rest_framework import serializers
from .models import Customer, Visit, CustomerNote, Lead

class VisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visit
        fields = '__all__'

class CustomerNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.username')
    
    class Meta:
        model = CustomerNote
        fields = ['id', 'customer', 'author', 'author_name', 'content', 'is_important', 'created_at', 'updated_at']
        read_only_fields = ['author']

class CustomerSerializer(serializers.ModelSerializer):
    visit_history = VisitSerializer(many=True, read_only=True)
    internal_notes = CustomerNoteSerializer(many=True, read_only=True)
    full_name = serializers.CharField(source='name', read_only=True)
    total_bookings = serializers.IntegerField(source='visits_count', read_only=True)
    is_vip = serializers.SerializerMethodField(read_only=True)
    notes = serializers.SerializerMethodField(read_only=True)
    tags = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'restaurant', 'name', 'full_name', 'phone', 'email',
            'visits_count', 'total_bookings', 'total_spent', 'avg_check', 'last_visit',
            'date_of_birth', 'tags',
            'created_at', 'visit_history', 'internal_notes', 'notes', 'is_vip'
        ]

    def get_is_vip(self, obj):
        return (obj.visits_count or 0) >= 5

    def get_notes(self, obj):
        notes = obj.internal_notes.order_by('-updated_at').values_list('content', flat=True)
        return '\n\n'.join(notes) if notes else ''


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ['id', 'name', 'phone', 'city', 'restaurants_count', 'source', 'comment', 'created_at']
        read_only_fields = ['created_at']
