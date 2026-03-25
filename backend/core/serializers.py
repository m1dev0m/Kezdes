from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from .models import Profile, PushToken, OTPVerification
from contractors.models import Contractor
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
class UserMeSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    restaurant = serializers.PrimaryKeyRelatedField(source='profile.restaurant', read_only=True)
    phone = serializers.CharField(source='profile.phone', read_only=True)
    restaurant_verified = serializers.SerializerMethodField()
    restaurant_setup_required = serializers.SerializerMethodField()

    def get_restaurant_verified(self, obj):
        if not hasattr(obj, 'profile'):
            return True
        if obj.profile.restaurant:
            return obj.profile.restaurant.is_verified
        if obj.profile.role in ['restaurant_admin', 'restaurant_owner', 'owner']:
            from restaurants.models import RestaurantRequest
            req = RestaurantRequest.objects.filter(owner=obj).order_by('-created_at').first()
            if req:
                return req.status == 'approved'
            return False
        return True

    def get_restaurant_setup_required(self, obj):
        if not hasattr(obj, 'profile'):
            return False
        if obj.profile.role not in ['restaurant_admin', 'restaurant_owner', 'owner']:
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

class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=True, allow_blank=False)
    email = serializers.EmailField(required=True, allow_blank=False)
    password = serializers.CharField(write_only=True, required=True, allow_blank=False)
    role = serializers.CharField(write_only=True, required=False, default='customer')
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
    otp_code = serializers.CharField(write_only=True, required=True, min_length=4, max_length=6)

    class Meta:
        model = User
        fields = ['username', 'password', 'password2', 'email', 'role', 'phone', 'first_name', 'name', 'restaurant_name', 'address', 'category', 'price_from', 'description', 'city', 'otp_code']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_email(self, value):
        value = (value or '').strip().lower()
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

        role = attrs.get('role', 'customer')
        role_aliases = {
            'admin': 'global_admin',
            'restaurant_owner': 'owner',
            'restaurant_admin': 'owner',
            'organizer': 'customer',
            'customer': 'customer',
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
        
        # Email OTP Verification
        email = attrs.get('email')
        otp_code = attrs.get('otp_code')
        if not otp_code:
            raise serializers.ValidationError({"otp_code": "OTP code is required."})
        
        otp_record = OTPVerification.objects.filter(email=email).order_by('-created_at').first()
        if not otp_record or otp_record.code != otp_code:
            raise serializers.ValidationError({"otp_code": "Invalid or expired OTP code."})

        return attrs

    def create(self, validated_data):
        otp_code = validated_data.pop('otp_code', None)
        role = validated_data.pop('role', 'customer')
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
            
        if role == 'owner' and restaurant_name:
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
        OTPVerification.objects.filter(email=user.email).update(is_verified=True)
            
        return user

class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Учетная запись с таким email уже существует.")
        return value


class SetupRestaurantSerializer(serializers.Serializer):
    restaurant_name = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=255)
    address = serializers.CharField(max_length=500)
    phone = serializers.CharField(max_length=50)
    owner_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    instagram = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def create(self, validated_data):
        from restaurants.models import Restaurant, RestaurantRequest

        user = self.context["request"].user

        if hasattr(user, "profile") and user.profile.restaurant and user.profile.restaurant.is_verified:
            raise serializers.ValidationError({"detail": "Restaurant is already approved for this account."})
        if Restaurant.objects.filter(owner=user, is_verified=True).exists():
            raise serializers.ValidationError({"detail": "Restaurant is already approved for this account."})

        pending = RestaurantRequest.objects.filter(owner=user, status='pending').order_by('-created_at').first()
        payload = {
            "name": validated_data["restaurant_name"],
            "owner_name": validated_data.get("owner_name") or user.first_name or user.username,
            "city": validated_data["city"],
            "address": validated_data["address"],
            "phone": validated_data["phone"],
            "email": user.email,
            "instagram": validated_data.get("instagram", ""),
            "admin_username": user.username,
            "owner": user,
        }

        if pending:
            for key, val in payload.items():
                setattr(pending, key, val)
            pending.save()
            return pending

        return RestaurantRequest.objects.create(**payload, status='pending')
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
