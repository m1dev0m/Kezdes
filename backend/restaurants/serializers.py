from rest_framework import serializers
from .models import (
    Restaurant,
    Availability,
    Review,
    RestaurantRequest,
    Table,
    Zone,
    Shift,
    FloorMapShape,
    RestaurantAuditLog,
    RestaurantInvoice,
)

class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = '__all__'

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'


class FloorMapShapeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FloorMapShape
        fields = [
            'id',
            'restaurant',
            'zone',
            'name',
            'shape_type',
            'x',
            'y',
            'width',
            'height',
            'rotation',
            'fill_color',
            'stroke_color',
            'text_color',
            'z_index',
            'is_visible',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'restaurant', 'created_at', 'updated_at']

    def validate(self, attrs):
        for field in ('x', 'y', 'width', 'height', 'rotation'):
            value = attrs.get(field)
            if value is None:
                continue
            try:
                attrs[field] = float(value)
            except (TypeError, ValueError):
                raise serializers.ValidationError({field: f'{field} must be a number.'})

        for field in ('width', 'height'):
            value = attrs.get(field)
            if value is not None and value <= 0:
                raise serializers.ValidationError({field: f'{field} must be > 0.'})

        return attrs


class RestaurantRequestSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        source='admin_password',
        write_only=True,
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = RestaurantRequest
        fields = ['id', 'name', 'owner_name', 'city', 'address', 'phone', 'email', 
                  'instagram', 'admin_username', 'admin_password', 'password', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']
        extra_kwargs = {
            'admin_password': {'write_only': True, 'required': False, 'allow_blank': True},
            'admin_username': {'required': False, 'allow_blank': True},
            'owner_name': {'required': False, 'allow_blank': True},
            'address': {'required': False, 'allow_blank': True},
            'instagram': {'required': False, 'allow_blank': True},
        }
class TableSerializer(serializers.ModelSerializer):
    # API exposes 'name' and 'capacity' as primary fields (map to number/seats)
    name = serializers.CharField(source='number', required=False)
    capacity = serializers.IntegerField(source='seats', required=False)
    # Legacy aliases
    table_number = serializers.CharField(source='number', required=False)
    pos_x = serializers.FloatField(source='x', required=False)
    pos_y = serializers.FloatField(source='y', required=False)
    active = serializers.BooleanField(source='is_active', required=False)
    status = serializers.CharField(read_only=True)

    def validate(self, attrs):
        # seats is the model field; capacity maps to it via source='seats'
        seats = attrs.get('seats')
        if seats is not None:
            if seats < 1:
                raise serializers.ValidationError({"capacity": "Вместимость должна быть не менее 1."})
            if seats > Table.CAPACITY_MAX:
                raise serializers.ValidationError({"capacity": f"Вместимость не может превышать {Table.CAPACITY_MAX}."})

        # Unique number per restaurant
        number = attrs.get('number')
        if not number and self.instance:
            number = self.instance.number
        if number:
            request = self.context.get('request')
            restaurant = None
            if request and hasattr(request, 'user'):
                user = request.user
                restaurant = getattr(user, 'owned_restaurant', None)
                if not restaurant and hasattr(user, 'profile'):
                    restaurant = getattr(user.profile, 'restaurant', None)
            if restaurant:
                qs = Table.objects.filter(restaurant=restaurant, number=number)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({"name": "Стол с таким именем уже существует в этом ресторане."})
        return attrs

    class Meta:
        model = Table
        fields = [
            'id', 'restaurant',
            'name', 'table_number', 'number',
            'capacity', 'seats',
            'x', 'pos_x', 'y', 'pos_y',
            'width', 'height', 'rotation',
            'table_type', 'status',
            'is_active', 'active',
            'created_at',
            'zone', 'grid_x', 'grid_y', 'grid_w', 'grid_h'
        ]
        read_only_fields = ['restaurant', 'status', 'created_at']


class TableAPISerializer(serializers.ModelSerializer):
    """
    Minimal contract for `/api/v1/tables/` endpoints.
    """
    status = serializers.SerializerMethodField()
    # Backward-compatible input aliases (older clients/tests may still send these)
    number = serializers.CharField(write_only=True, required=False)
    seats = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Table
        fields = [
            "id",
            "name",
            "capacity",
            "number",
            "seats",
            "x",
            "y",
            "width",
            "height",
            "rotation",
            "status",
            "is_active",
            "table_type",
            "zone",
            "grid_x",
            "grid_y",
            "grid_w",
            "grid_h",
        ]
        read_only_fields = ["id", "status"]

    def get_status(self, obj):
        from bookings.models import Booking
        from django.db.models import Q
        from django.utils import timezone
        now = timezone.now()
        active = Booking.objects.filter(
            Q(table=obj) | Q(tables=obj),
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lte=now,
            end_datetime__gt=now,
        ).first()
        if active:
            return "occupied" if active.status == Booking.SEATED else "reserved"
        return "free"

    def validate(self, attrs):
        if "restaurant" in attrs:
            raise serializers.ValidationError({"restaurant": "Changing restaurant is not allowed."})

        # Accept legacy keys: map number→name, seats→capacity
        if "name" not in attrs and "number" in attrs:
            attrs["name"] = attrs.pop("number")
        if "capacity" not in attrs and "seats" in attrs:
            attrs["capacity"] = attrs.pop("seats")

        # On create, name and capacity are mandatory
        if self.instance is None:
            if "name" not in attrs or attrs.get("name") is None:
                raise serializers.ValidationError({"name": "This field is required."})
            if "capacity" not in attrs or attrs.get("capacity") is None:
                raise serializers.ValidationError({"capacity": "This field is required."})

        name = attrs.get("name")
        if name is not None and not str(name).strip():
            raise serializers.ValidationError({"name": "name cannot be blank."})

        capacity = attrs.get("capacity")
        if capacity is not None:
            try:
                capacity_int = int(capacity)
            except (TypeError, ValueError):
                raise serializers.ValidationError({"capacity": "capacity must be an integer."})
            if capacity_int < 1:
                raise serializers.ValidationError({"capacity": "capacity must be >= 1"})
            if capacity_int > Table.CAPACITY_MAX:
                raise serializers.ValidationError({"capacity": f"capacity must be <= {Table.CAPACITY_MAX}"})
            attrs["capacity"] = capacity_int

        for field in ("width", "height"):
            value = attrs.get(field)
            if value is None:
                continue
            try:
                numeric = float(value)
            except (TypeError, ValueError):
                raise serializers.ValidationError({field: f"{field} must be a number."})
            if numeric <= 0:
                raise serializers.ValidationError({field: f"{field} must be > 0."})
            attrs[field] = numeric

        for field in ("x", "y", "rotation"):
            value = attrs.get(field)
            if value is None:
                continue
            try:
                attrs[field] = float(value)
            except (TypeError, ValueError):
                raise serializers.ValidationError({field: f"{field} must be a number."})

        # Check duplicate table name within restaurant
        if name:
            request = self.context.get('request')
            restaurant = None
            if request and hasattr(request, 'user'):
                user = request.user
                restaurant = getattr(user, 'owned_restaurant', None)
                if not restaurant and hasattr(user, 'profile'):
                    restaurant = getattr(user.profile, 'restaurant', None)
            if restaurant:
                qs = Table.objects.filter(restaurant=restaurant, number=str(name).strip())
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError({"name": "Table with this name already exists in your restaurant."})

        return attrs

    def create(self, validated_data):
        restaurant = validated_data["restaurant"]
        name = validated_data["name"]
        capacity = validated_data["capacity"]
        is_active = validated_data.get("is_active", True)
        table_type = validated_data.get("table_type", "rectangle")
        zone = validated_data.get("zone")
        return Table.objects.create(
            restaurant=restaurant,
            number=name,
            seats=capacity,
            is_active=is_active,
            table_type=table_type,
            zone=zone,
            x=validated_data.get("x"),
            y=validated_data.get("y"),
            width=validated_data.get("width", 60.0),
            height=validated_data.get("height", 60.0),
            rotation=validated_data.get("rotation", 0.0),
            grid_x=validated_data.get("grid_x", 0),
            grid_y=validated_data.get("grid_y", 0),
            grid_w=validated_data.get("grid_w", 1),
            grid_h=validated_data.get("grid_h", 1),
        )

    def update(self, instance, validated_data):
        if "name" in validated_data:
            instance.number = validated_data["name"]
        if "capacity" in validated_data:
            instance.seats = validated_data["capacity"]
        if "is_active" in validated_data:
            instance.is_active = validated_data["is_active"]
        if "table_type" in validated_data:
            instance.table_type = validated_data["table_type"]
        if "zone" in validated_data:
            instance.zone = validated_data["zone"]
        if "x" in validated_data:
            instance.x = validated_data["x"]
        if "y" in validated_data:
            instance.y = validated_data["y"]
        if "width" in validated_data:
            instance.width = validated_data["width"]
        if "height" in validated_data:
            instance.height = validated_data["height"]
        if "rotation" in validated_data:
            instance.rotation = validated_data["rotation"]
        if "grid_x" in validated_data:
            instance.grid_x = validated_data["grid_x"]
        if "grid_y" in validated_data:
            instance.grid_y = validated_data["grid_y"]
        if "grid_w" in validated_data:
            instance.grid_w = validated_data["grid_w"]
        if "grid_h" in validated_data:
            instance.grid_h = validated_data["grid_h"]
        instance.save()
        return instance
class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ['date', 'available_seats', 'is_fully_booked']
class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    booking_id = serializers.IntegerField(write_only=True, required=False)
    is_anonymous = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Review
        fields = ['id', 'user', 'user_name', 'rating', 'comment', 'created_at', 'booking_id', 'is_anonymous']
        read_only_fields = ['user']
class RestaurantSerializer(serializers.ModelSerializer):
    availabilities = AvailabilitySerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    tables = TableSerializer(many=True, read_only=True)
    photo_url = serializers.SerializerMethodField()
    plan = serializers.CharField(read_only=True)
    payment_status = serializers.CharField(read_only=True)

    class Meta:
        model = Restaurant
        fields = [
            'id', 'name', 'description', 'address', 'latitude', 'longitude',
            'phone', 'image_url', 'image', 'photo_url', 'source', 'is_claimed', 'is_verified',
            'capacity', 'average_price', 'rating', 'price_level', 'plan', 'payment_status', 'views_count', 'availabilities',
            'reviews', 'tables', 'floor', 'entrance', 'extra_address_info', 'city', 'status',
            'deposit_min_guests', 'deposit_amount_per_guest',
            'slug', 'turnover_default_min', 'has_namazhana', 'has_parking', 'has_kids_zone',
            'has_wifi', 'has_terrace', 'deposit_required', 'birthday_service_available',
            'wheelchair_accessible', 'max_party_size', 'current_period_starts_at', 'current_period_ends_at', 'grace_until',
        ]
        read_only_fields = ['views_count', 'rating', 'plan', 'payment_status', 'current_period_starts_at', 'current_period_ends_at', 'grace_until', 'status']

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            url = obj.image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return obj.image_url or None


class RestaurantInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantInvoice
        fields = [
            'id',
            'number',
            'plan',
            'amount',
            'currency',
            'status',
            'issued_at',
            'due_at',
            'paid_at',
            'period_start',
            'period_end',
            'note',
        ]


class RestaurantAuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = RestaurantAuditLog
        fields = [
            'id',
            'event_type',
            'target_type',
            'target_id',
            'summary',
            'payload',
            'actor_username',
            'created_at',
        ]


class RestaurantSubscriptionSerializer(serializers.ModelSerializer):
    plan_label = serializers.CharField(source='get_plan_display', read_only=True)
    payment_status_label = serializers.CharField(source='get_payment_status_display', read_only=True)
    limits = serializers.SerializerMethodField()
    usage = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()
    checklist = serializers.SerializerMethodField()
    invoices = RestaurantInvoiceSerializer(many=True, read_only=True)
    is_subscription_live = serializers.SerializerMethodField()
    subscription_state = serializers.SerializerMethodField()
    usage_percent = serializers.SerializerMethodField()
    upgrade_cta = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = [
            'id',
            'name',
            'status',
            'plan',
            'plan_label',
            'payment_status',
            'payment_status_label',
            'current_period_starts_at',
            'current_period_ends_at',
            'grace_until',
            'is_subscription_live',
            'subscription_state',
            'limits',
            'usage',
            'usage_percent',
            'features',
            'checklist',
            'feature_flags',
            'invoices',
            'upgrade_cta',
        ]

    def get_limits(self, obj: Restaurant):
        return obj.get_plan_limits()

    def get_usage(self, obj: Restaurant):
        return obj.get_usage_snapshot()

    def get_usage_percent(self, obj: Restaurant):
        usage = obj.get_usage_snapshot()
        limits = obj.get_plan_limits()
        return {
            key: None if limits.get(key) in (None, 0) else round((usage.get(key, 0) / limits[key]) * 100)
            for key in ('tables', 'zones', 'staff')
        }

    def get_is_subscription_live(self, obj: Restaurant):
        return obj.is_subscription_live()

    def get_subscription_state(self, obj: Restaurant):
        return obj.get_subscription_state()

    def get_checklist(self, obj: Restaurant):
        return obj.get_onboarding_checklist()

    def get_features(self, obj: Restaurant):
        feature_labels = [
            ('table_map', 'Схема зала'),
            ('zones', 'Зоны / залы'),
            ('shifts', 'Смены'),
            ('staff_basic', 'Команда'),
            ('orders_basic', 'Предзаказы и заказы'),
            ('analytics_basic', 'Базовая аналитика'),
            ('analytics_advanced', 'Продвинутая аналитика'),
            ('automations', 'Автоматизации'),
        ]
        return [
            {'key': key, 'label': label, 'enabled': obj.has_feature(key)}
            for key, label in feature_labels
        ]

    def get_upgrade_cta(self, obj: Restaurant):
        target_plan = Restaurant.PLAN_PRO if obj.get_effective_plan() == Restaurant.PLAN_PLUS else Restaurant.PLAN_PLUS
        return {
            'label': f'Перейти на {dict(Restaurant.PLAN_CHOICES).get(target_plan, target_plan)}',
            'path': '/pricing',
        }


class RestaurantFeatureFlagsSerializer(serializers.ModelSerializer):
    plan_label = serializers.CharField(source='get_plan_display', read_only=True)
    payment_status_label = serializers.CharField(source='get_payment_status_display', read_only=True)
    effective_features = serializers.SerializerMethodField()
    managed_features = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = [
            'id',
            'name',
            'plan',
            'plan_label',
            'payment_status',
            'payment_status_label',
            'feature_flags',
            'managed_features',
            'effective_features',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'name',
            'plan',
            'plan_label',
            'payment_status',
            'payment_status_label',
            'managed_features',
            'effective_features',
            'updated_at',
        ]

    def get_effective_features(self, obj: Restaurant):
        keys = [
            'bookings_basic',
            'chat_basic',
            'table_map',
            'zones',
            'shifts',
            'staff_basic',
            'menu_basic',
            'orders_basic',
            'analytics_basic',
            'analytics_advanced',
            'automations',
        ]
        return [key for key in keys if obj.has_feature(key)]

    def get_managed_features(self, obj: Restaurant):
        return [
            {'key': key, 'enabled': value}
            for key, value in sorted((obj.feature_flags or {}).items(), key=lambda item: str(item[0]))
            if isinstance(key, str) and key.strip()
        ]

    def validate_feature_flags(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError({'feature_flags': 'feature_flags must be an object.'})

        normalized = {}
        for raw_key, raw_value in value.items():
            key = str(raw_key).strip()
            if not key:
                raise serializers.ValidationError({'feature_flags': 'feature flag keys must be non-empty strings.'})
            if not isinstance(raw_value, bool):
                raise serializers.ValidationError({'feature_flags': {key: 'feature flag values must be boolean.'}})
            normalized[key] = raw_value
        return normalized

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
