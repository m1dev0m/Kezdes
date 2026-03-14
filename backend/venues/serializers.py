from rest_framework import serializers
from .models import Venue, Amenity, ToikhanaFoodItem, ToikhanaServiceItem
class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ['id', 'name']
class ToikhanaFoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToikhanaFoodItem
        fields = ['id', 'name', 'description', 'price_per_person']
class ToikhanaServiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToikhanaServiceItem
        fields = ['id', 'name', 'price', 'is_included']
class VenueSerializer(serializers.ModelSerializer):
    amenities = AmenitySerializer(many=True, read_only=True)
    food_options = ToikhanaFoodItemSerializer(many=True, read_only=True)
    services = ToikhanaServiceItemSerializer(many=True, read_only=True)
    pricing = serializers.SerializerMethodField()
    capacity = serializers.SerializerMethodField()
    class Meta:
        model = Venue
        fields = [
            'id', 'name', 'city', 'address', 'capacity', 
            'pricing', 'rating', 'review_count', 'image_url', 
            'amenities', 'description', 'food_options', 'services'
        ]
    def get_pricing(self, obj):
        return {
            'budget': obj.price_budget,
            'medium': obj.price_medium,
            'premium': obj.price_premium,
            'luxury': obj.price_luxury,
        }
    def get_capacity(self, obj):
        return {
            'min': obj.min_capacity,
            'max': obj.max_capacity,
        }
