from rest_framework import serializers
from .models import Contractor
class ContractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contractor
        fields = [
            'id', 'user', 'name', 'city', 'category', 'price_from', 
            'pricing_info', 'rating', 'review_count', 'image_url', 'description'
        ]
