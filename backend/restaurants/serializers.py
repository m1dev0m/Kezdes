from rest_framework import serializers
from .models import Restaurant, Availability, Review, RestaurantRequest, Table
class RestaurantRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantRequest
        fields = ['id', 'name', 'owner_name', 'city', 'address', 'phone', 'email', 
                  'instagram', 'admin_username', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']
class TableSerializer(serializers.ModelSerializer):
    table_number = serializers.CharField(source='number', required=False)
    capacity = serializers.IntegerField(source='seats', required=False)
    pos_x = serializers.FloatField(source='x', required=False)
    pos_y = serializers.FloatField(source='y', required=False)

    class Meta:
        model = Table
        fields = [
            'id',
            'restaurant',
            'number',
            'table_number',
            'seats',
            'capacity',
            'x',
            'pos_x',
            'y',
            'pos_y',
            'width',
            'height',
            'rotation',
            'table_type',
            'status',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['restaurant']
class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ['date', 'available_seats', 'is_fully_booked']
class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    class Meta:
        model = Review
        fields = ['id', 'user', 'user_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['user']
class RestaurantSerializer(serializers.ModelSerializer):
    availabilities = AvailabilitySerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    tables = TableSerializer(many=True, read_only=True)
    photo_url = serializers.SerializerMethodField()
    plan = serializers.CharField(read_only=False, required=False)

    class Meta:
        model = Restaurant
        fields = [
            'id', 'name', 'description', 'address', 'latitude', 'longitude',
            'phone', 'image_url', 'image', 'photo_url', 'source', 'is_claimed', 'is_verified',
            'capacity', 'average_price', 'rating', 'price_level', 'plan', 'views_count', 'availabilities',
            'reviews', 'tables', 'floor', 'entrance', 'extra_address_info', 'city', 'status'
        ]
        read_only_fields = ['views_count', 'rating']
    def get_photo_url(self, obj):
        """Return uploaded image URL first, then image_url fallback."""
        request = self.context.get('request')
        if obj.image:
            url = obj.image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return obj.image_url or None
class RestaurantClaimSerializer(serializers.Serializer):
    restaurant_id = serializers.IntegerField()
from django.contrib.auth.models import User
class StaffSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role')
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'role', 'password']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': False, 'allow_blank': True},
            'first_name': {'required': False, 'allow_blank': True}
        }
    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        role = profile_data.get('role', 'manager')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        user.profile.role = role
        user.profile.save()
        return user
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        if 'role' in profile_data:
            instance.profile.role = profile_data['role']
            instance.profile.save()
        if 'password' in validated_data:
            instance.set_password(validated_data.pop('password'))
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
