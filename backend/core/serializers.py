from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from .models import Profile, PushToken, OTPVerification, OTPDeliveryAttempt
from contractors.models import Contractor
from django.conf import settings


def _normalize_email(value: str) -> str:
    return (value or '').strip().lower()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class OTPDeliveryAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPDeliveryAttempt
        fields = [
            'id',
            'email',
            'channel',
            'status',
            'provider',
            'error_message',
            'metadata',
            'created_at',
        ]


class HealthLiveSerializer(serializers.Serializer):
    status = serializers.CharField()
    service = serializers.CharField()


class HealthReadyComponentsSerializer(serializers.Serializer):
    database = serializers.CharField()
    cache = serializers.CharField()


class HealthReadySerializer(serializers.Serializer):
    status = serializers.CharField()
    components = HealthReadyComponentsSerializer()


class HealthWorkersComponentsSerializer(serializers.Serializer):
    broker = serializers.CharField()
    worker = serializers.CharField()
    beat_schedule = serializers.CharField()


class HealthWorkersDetailsSerializer(serializers.Serializer):
    worker_nodes = serializers.ListField(child=serializers.CharField())
    missing_periodic_tasks = serializers.ListField(child=serializers.CharField())


class HealthWorkersSerializer(serializers.Serializer):
    status = serializers.CharField()
    components = HealthWorkersComponentsSerializer()
    details = HealthWorkersDetailsSerializer()


class SendOTPResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    otp_required = serializers.BooleanField()
    code = serializers.CharField(required=False)


class UpdateRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=("owner", "customer"))


class UpdateRoleResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    role = serializers.CharField()
    message = serializers.CharField()


class UserMeSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    restaurant = serializers.PrimaryKeyRelatedField(source='profile.restaurant', read_only=True)
    phone = serializers.CharField(source='profile.phone', read_only=True)
    restaurant_verified = serializers.SerializerMethodField()
    restaurant_setup_required = serializers.SerializerMethodField()

    def get_restaurant_verified(self, obj) -> bool:
        if not hasattr(obj, 'profile'):
            return True
        if obj.profile.restaurant:
            return obj.profile.restaurant.is_verified
        if obj.profile.role in ['restaurant_admin', 'restaurant_owner', 'owner', 'pending']:
            from restaurants.models import RestaurantRequest
            req = RestaurantRequest.objects.filter(owner=obj).order_by('-created_at').first()
            if req:
                return req.status == 'approved'
            return False
        return True

    def get_restaurant_setup_required(self, obj) -> bool:
        if not hasattr(obj, 'profile'):
            return False
        if obj.profile.role not in ['restaurant_admin', 'restaurant_owner', 'owner', 'pending']:
            return False
        if obj.profile.restaurant:
            return False
        from restaurants.models import RestaurantRequest
        has_request = RestaurantRequest.objects.filter(owner=obj).exists()
        return not has_request

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'restaurant', 'phone', 'restaurant_verified', 'restaurant_setup_required'
        ]


class UserMeUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=False)
    email = serializers.EmailField(required=False, allow_blank=False)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)

    def validate_username(self, value):
        value = (value or '').strip()
        user = self.context['request'].user
        if not value:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        value = _normalize_email(value)
        user = self.context['request'].user
        if not value:
            raise serializers.ValidationError("Email is required.")
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def update(self, instance, validated_data):
        profile = instance.profile
        user_fields = []

        for field in ('username', 'email', 'first_name', 'last_name'):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
                user_fields.append(field)

        if user_fields:
            instance.save(update_fields=user_fields)

        if 'phone' in validated_data:
            profile.phone = validated_data['phone'] or ''
            profile.save(update_fields=['phone'])

        return instance

class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=True, allow_blank=False)
    email = serializers.EmailField(required=True, allow_blank=False)
    password = serializers.CharField(write_only=True, required=True, allow_blank=False)
    role = serializers.CharField(write_only=True, required=False, default='pending')
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    name = serializers.CharField(write_only=True, required=False)
    restaurant_name = serializers.CharField(write_only=True, required=False)
    address = serializers.CharField(write_only=True, required=False)
    category = serializers.CharField(write_only=True, required=False)
    price_from = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=False)
    description = serializers.CharField(write_only=True, required=False)
    city = serializers.CharField(write_only=True, required=False)
    password2 = serializers.CharField(write_only=True, required=False)
    otp_code = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=4, max_length=6)

    class Meta:
        model = User
        fields = ['username', 'password', 'password2', 'email', 'role', 'phone', 'first_name', 'name', 'restaurant_name', 'address', 'category', 'price_from', 'description', 'city', 'otp_code']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_email(self, value):
        value = _normalize_email(value)
        if not value:
            raise serializers.ValidationError("Email is required.")
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate_username(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate(self, attrs):
        email = _normalize_email(attrs.get('email'))
        attrs['email'] = email
        password = attrs.get('password')
        password2 = attrs.get('password2')
        if not password:
            raise serializers.ValidationError({"password": "Password is required."})
        if len(password) < 8:
            raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})

        # If password2 is provided by clients, enforce match
        if password2 is not None and password != password2:
            raise serializers.ValidationError({"password2": "Passwords do not match."})

        try:
            validate_password(password)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        requested_role = attrs.get('role', 'customer')
        role = requested_role
        role_aliases = {
            'admin': 'global_admin',
            'restaurant_owner': 'pending',
            'restaurant_admin': 'pending',
            'owner': 'pending',
            'organizer': 'customer',
            'customer': 'customer',
            'pending': 'pending',
        }
        normalized_role = role_aliases.get(role, role)
        allowed_roles = {r[0] for r in Profile.ROLE_CHOICES}
        # Block privileged roles from public registration
        blocked_roles = {'global_admin'}
        if normalized_role in blocked_roles:
            raise serializers.ValidationError({"role": "Invalid role."})
        if normalized_role not in allowed_roles:
            raise serializers.ValidationError({"role": "Invalid role."})
        attrs['role'] = normalized_role
        attrs['requested_role'] = requested_role

        # Email OTP Verification
        if getattr(settings, "REQUIRE_EMAIL_OTP", False):
            otp_code = (attrs.get('otp_code') or '').strip()
            if not otp_code:
                raise serializers.ValidationError({"otp_code": "OTP code is required."})

            otp_record = OTPVerification.objects.filter(email__iexact=email).order_by('-created_at').first()
            if not otp_record or otp_record.is_expired():
                raise serializers.ValidationError({"otp_code": "Invalid or expired OTP code."})

            if otp_record.is_verified:
                raise serializers.ValidationError({"otp_code": "OTP code already used. Request a new one."})

            if otp_record.code != otp_code:
                raise serializers.ValidationError({"otp_code": "Invalid or expired OTP code."})

        return attrs

    def create(self, validated_data):
        validated_data.pop('otp_code', None)
        role = validated_data.pop('role', 'customer')
        requested_role = validated_data.pop('requested_role', role)
        phone = validated_data.pop('phone', '')
        first_name = validated_data.pop('first_name', '')
        name = validated_data.pop('name', '')
        restaurant_name = validated_data.pop('restaurant_name', '')
        address = validated_data.pop('address', '')
        category = validated_data.pop('category', '')
        price_from = validated_data.pop('price_from', 0)
        description = validated_data.pop('description', '')
        city = validated_data.pop('city', 'Алматы')
        validated_data.pop('password2', None)
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=first_name
        )
        
        profile = user.profile
        profile.role = role
        profile.phone = phone
        profile.save()

        if role == 'customer':
            pass
            
        owner_requested = requested_role in {'owner', 'restaurant_owner', 'restaurant_admin'}

        if owner_requested and restaurant_name:
            from restaurants.models import RestaurantRequest
            RestaurantRequest.objects.create(
                owner=user,
                name=restaurant_name,
                address=address or city,
                city=city,
                phone=phone,
                email=user.email,
                admin_username=user.username,
                status='pending'
            )

        if role == 'worker':
            Contractor.objects.create(
                user=user,
                name=name if name else user.username,
                category=category,
                price_from=price_from,
                description=description,
                city=city
            )
        
        # Mark OTP as verified
        otp_record = OTPVerification.objects.filter(email__iexact=user.email).order_by('-created_at').first()
        if otp_record:
            otp_record.mark_verified()
            
        return user

class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        value = _normalize_email(value)
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Учетная запись с таким email уже существует.")
        return value


class SetupRestaurantSerializer(serializers.Serializer):
    restaurant_name = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=255, required=False, allow_blank=True)
    address = serializers.CharField(max_length=500)
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    owner_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)

    def create(self, validated_data):
        from restaurants.models import RestaurantRequest
        user = self.context["request"].user

        if RestaurantRequest.objects.filter(owner=user, status="pending").exists():
            raise serializers.ValidationError({"detail": "У вас уже есть активная заявка."})

        req = RestaurantRequest.objects.create(
            owner=user,
            name=validated_data["restaurant_name"],
            address=validated_data.get("address", ""),
            city=validated_data.get("city", "Алматы"),
            phone=validated_data.get("phone", ""),
            email=user.email,
            admin_username=user.username,
            status="pending",
        )
        return req
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login_input = attrs.get("username")
        if login_input and getattr(self, 'user', None) is None:
            user = User.objects.filter(Q(username=login_input) | Q(email=login_input)).first()
            if user:
                attrs["username"] = user.username
        data = super().validate(attrs)
        if self.user and hasattr(self.user, 'profile'):
            data['role'] = self.user.profile.role
        return data
class PushTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushToken
        fields = ['token', 'device_name']
