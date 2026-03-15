from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from rest_framework import permissions
from rest_framework.views import APIView
from django.core.cache import cache
from django.db import connections
from django.db import OperationalError
from .models import PushToken
from .serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    PushTokenSerializer,
    SetupRestaurantSerializer,
    UserMeSerializer,
)

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
