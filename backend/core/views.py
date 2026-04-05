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
from django.db import transaction
from django_celery_beat.models import PeriodicTask
from celery import current_app
from .models import OTPDeliveryAttempt, PushToken, OTPVerification
from .permissions import IsGlobalAdmin
from .viewsets import OptionalPageNumberPagination
from .serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    HealthLiveSerializer,
    HealthReadySerializer,
    HealthWorkersSerializer,
    OTPDeliveryAttemptSerializer,
    PushTokenSerializer,
    SendOTPResponseSerializer,
    SetupRestaurantSerializer,
    UpdateRoleResponseSerializer,
    UpdateRoleSerializer,
    UserMeSerializer,
    UserMeUpdateSerializer,
    SendOTPSerializer,
)
import secrets
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from drf_spectacular.utils import extend_schema


REQUIRED_PERIODIC_TASKS = (
    "Expire stale bookings",
    "Expire stale waitlist entries",
    "Auto mark no-shows",
)


def _normalize_email(value: str) -> str:
    return (value or '').strip().lower()

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return UserMeUpdateSerializer
        return UserMeSerializer

    def get_object(self):
        return (
            User.objects.select_related("profile", "profile__restaurant")
            .only(
                "id",
                "username",
                "email",
                "first_name",
                "last_name",
                "profile__role",
                "profile__phone",
                "profile__restaurant_id",
                "profile__restaurant__is_verified",
            )
            .get(pk=self.request.user.pk)
        )

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=request.method == 'PATCH')
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserMeSerializer(user).data, status=status.HTTP_200_OK)

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

    @extend_schema(request=SendOTPSerializer, responses=SendOTPResponseSerializer)
    def post(self, request, *args, **kwargs):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = _normalize_email(serializer.validated_data['email'])
            code = str(secrets.randbelow(900000) + 100000)

            try:
                with transaction.atomic():
                    otp_record, created = OTPVerification.objects.update_or_create(
                        email=email,
                        defaults={'code': code, 'is_verified': False},
                    )
                    if not created:
                        OTPVerification.objects.filter(pk=otp_record.pk).update(
                            created_at=timezone.now(),
                            is_verified=False,
                            code=code,
                        )

                    send_mail(
                        subject='Код подтверждения Kezdes',
                        message=f'Ваш код подтверждения: {code}\nНикому не сообщайте этот код.',
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[email],
                        fail_silently=False,
                    )
                    OTPDeliveryAttempt.objects.create(
                        email=email,
                        status=OTPDeliveryAttempt.STATUS_SENT,
                        metadata={
                            "otp_required": bool(getattr(settings, "REQUIRE_EMAIL_OTP", False)),
                        },
                    )
            except Exception:
                OTPDeliveryAttempt.objects.create(
                    email=email,
                    status=OTPDeliveryAttempt.STATUS_FAILED,
                    error_message="Не удалось отправить письмо. Проверьте настройки почты.",
                    metadata={
                        "otp_required": bool(getattr(settings, "REQUIRE_EMAIL_OTP", False)),
                    },
                )
                return Response(
                    {"detail": "Не удалось отправить письмо. Проверьте настройки почты."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response(
                {
                    "detail": "Код отправлен на ваш email.",
                    "otp_required": bool(getattr(settings, "REQUIRE_EMAIL_OTP", False)),
                    **({"code": code} if getattr(settings, "DEBUG", False) else {}),
                },
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OTPDeliveryAttemptListView(generics.ListAPIView):
    serializer_class = OTPDeliveryAttemptSerializer
    permission_classes = [permissions.IsAuthenticated, IsGlobalAdmin]
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        queryset = OTPDeliveryAttempt.objects.all().order_by('-created_at')

        email = (self.request.query_params.get('email') or '').strip()
        status_param = (self.request.query_params.get('status') or '').strip()
        provider = (self.request.query_params.get('provider') or '').strip()

        if email:
            queryset = queryset.filter(email__iexact=email)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if provider:
            queryset = queryset.filter(provider__iexact=provider)

        return queryset

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
        if not hasattr(request.user, "profile") or request.user.profile.role not in ("owner", "pending"):
            return Response({"detail": "Only restaurant applicants can submit setup."}, status=status.HTTP_403_FORBIDDEN)

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

    @extend_schema(request=UpdateRoleSerializer, responses=UpdateRoleResponseSerializer)
    def post(self, request, *args, **kwargs):
        role = request.data.get('role')
        if role not in ('owner', 'customer'):
            return Response({"detail": "Invalid role choice."}, status=status.HTTP_400_BAD_REQUEST)

        if role == 'owner':
            return Response(
                {"detail": "Owner access is granted only through the restaurant approval flow."},
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = getattr(request.user, "profile", None)
        if profile is None:
            return Response({"detail": "Profile not found."}, status=status.HTTP_400_BAD_REQUEST)
        profile.role = role
        if role == 'customer':
            profile.restaurant = None
        profile.save()
        
        return Response({
            "success": True, 
            "role": role,
            "message": f"Account type set to {role}"
        })


class HealthLiveView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=HealthLiveSerializer)
    def get(self, request, *args, **kwargs):
        return Response({"status": "ok", "service": "kezdes-api"}, status=status.HTTP_200_OK)


class HealthReadyView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=HealthReadySerializer)
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


class HealthWorkersView(APIView):
    permission_classes = [permissions.AllowAny]

    def _check_periodic_tasks(self):
        enabled = set(
            PeriodicTask.objects.filter(
                name__in=REQUIRED_PERIODIC_TASKS,
                enabled=True,
            ).values_list("name", flat=True)
        )
        missing = sorted(set(REQUIRED_PERIODIC_TASKS) - enabled)
        return not missing, missing

    def _check_broker(self):
        connection = current_app.connection_for_read()
        try:
            connection.ensure_connection(max_retries=1)
            return True
        finally:
            try:
                connection.release()
            except Exception:
                pass

    def _check_worker(self):
        replies = current_app.control.inspect(timeout=1).ping() or {}
        return bool(replies), sorted(replies.keys())

    @extend_schema(responses=HealthWorkersSerializer)
    def get(self, request, *args, **kwargs):
        schedule_ok, missing_tasks = self._check_periodic_tasks()

        broker_state = "skipped" if settings.IS_TESTING else "error"
        worker_state = "skipped" if settings.IS_TESTING else "error"
        worker_nodes = []

        if not settings.IS_TESTING:
            try:
                broker_ok = self._check_broker()
                broker_state = "ok" if broker_ok else "error"
            except Exception:
                broker_state = "error"
                broker_ok = False

            if broker_ok:
                try:
                    worker_ok, worker_nodes = self._check_worker()
                    worker_state = "ok" if worker_ok else "error"
                except Exception:
                    worker_state = "error"

        ready = schedule_ok and broker_state in {"ok", "skipped"} and worker_state in {"ok", "skipped"}
        status_code = status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(
            {
                "status": "ok" if ready else "degraded",
                "components": {
                    "broker": broker_state,
                    "worker": worker_state,
                    "beat_schedule": "ok" if schedule_ok else "error",
                },
                "details": {
                    "worker_nodes": worker_nodes,
                    "missing_periodic_tasks": missing_tasks,
                },
            },
            status=status_code,
        )
