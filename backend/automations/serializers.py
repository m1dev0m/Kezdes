from rest_framework import serializers
from .models import AutomationLog
from crm.serializers import CustomerSerializer

class AutomationLogSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)

    class Meta:
        model = AutomationLog
        fields = ['id', 'type', 'status', 'sent_at', 'created_at', 'customer', 'customer_name', 'customer_phone']
        read_only_fields = ['id', 'created_at']
