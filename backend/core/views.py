from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from rest_framework import permissions
from rest_framework.views import APIView
from django.core.cache import cache
from django.db import connections
from django.db import OperationalError
from django.db import IntegrityError
from .models import PushToken, OTPVerification
from .serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    PushTokenSerializer,
    SetupRestaurantSerializer,
    UserMeSerializer,
    SendOTPSerializer,
)
import random
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

class UserProfileView(generics.RetrieveAPIView):
    serializer_class = UserMeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = 'auth'

class PushTokenUpdateView(generics.CreateAPIView):
    serializer_class = PushTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        token = serializer.validated_data.get('token')
        PushToken.objects.update_or_create(
            token=token,
            defaults={
                'user': self.request.user,
                'device_name': serializer.validated_data.get('device_name')
            }
        )

class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request, *args, **kwargs):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            code = f"{random.randint(100000, 999999)}"
            
            # Save or update OTP (also refresh created_at for expiry tracking)
            OTPVerification.objects.update_or_create(
                email=email,
                defaults={'code': code, 'is_verified': False}
            )
            OTPVerification.objects.filter(email=email).update(created_at=timezone.now(), is_verified=False, code=code)
            
            # Send Email
            try:
                send_mail(
                    subject='Код подтверждения Kezdes',
                    message=f'Ваш код подтверждения: {code}\nНикому не сообщайте этот код.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception as e:
                return Response(
                    {"detail": "Не удалось отправить письмо. Проверьте настройки почты."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response(
                {
                    "detail": "Код отправлен на ваш email.",
                    **(
                        {"code": code}
                        if getattr(settings, "DEBUG", False)
                        and getattr(settings, "EMAIL_BACKEND", "").endswith("console.EmailBackend")
                        else {}
                    ),
                },
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def _handle_db_errors(self, callback):
        try:
            return callback()
        except OperationalError:
            return Response(
                {"detail": "Сервер сейчас недоступен. Попробуйте позже."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except IntegrityError:
            return Response(
                {"detail": "Account with these credentials already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def post(self, request, *args, **kwargs):
        def execute():
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                user = serializer.save()
                return Response(
                    {
                        "user": {
                            "username": user.username,
                            "email": user.email,
                            "role": user.profile.role,
                        },
                        "message": "User registered successfully",
                    },
                    status=status.HTTP_201_CREATED,
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return self._handle_db_errors(execute)


class SetupRestaurantView(generics.CreateAPIView):
    serializer_class = SetupRestaurantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if not hasattr(request.user, "profile") or request.user.profile.role not in ("owner",):
            return Response({"detail": "Only restaurant owners can submit setup."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        req = serializer.save()
        return Response(
            {
                "success": True,
                "message": "Restaurant application submitted.",
                "data": {
                    "request_id": req.id,
                    "status": req.status,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class UpdateRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        role = request.data.get('role')
        if role not in ('owner', 'customer'):
            return Response({"detail": "Invalid role choice."}, status=status.HTTP_400_BAD_REQUEST)
        
        profile = request.user.profile
        profile.role = role
        profile.save()
        
        return Response({
            "success": True, 
            "role": role,
            "message": f"Account type set to {role}"
        })


class HealthLiveView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return Response({"status": "ok", "service": "kezdes-api"}, status=status.HTTP_200_OK)


class HealthReadyView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        db_ok = False
        cache_ok = False

        try:
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            db_ok = True
        except Exception:
            db_ok = False

        try:
            probe_key = "health:ready:cache_probe"
            cache.set(probe_key, "ok", timeout=5)
            cache_ok = cache.get(probe_key) == "ok"
        except Exception:
            cache_ok = False

        ready = db_ok and cache_ok
        status_code = status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(
            {
                "status": "ok" if ready else "degraded",
                "components": {
                    "database": "ok" if db_ok else "error",
                    "cache": "ok" if cache_ok else "error",
                },
            },
            status=status_code,
        )
