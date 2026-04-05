from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    OTPDeliveryAttemptListView,
    PushTokenUpdateView,
    SetupRestaurantView,
    UserProfileView,
    SendOTPView,
    UpdateRoleView,
)
urlpatterns = [
    path('send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('otp-delivery-attempts/', OTPDeliveryAttemptListView.as_view(), name='otp_delivery_attempts'),
    path('register/', RegisterView.as_view(), name='register'),
    path('update-role/', UpdateRoleView.as_view(), name='update_role'),
    path('setup-restaurant/', SetupRestaurantView.as_view(), name='setup_restaurant'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserProfileView.as_view(), name='user_me'),
    path('push-token/', PushTokenUpdateView.as_view(), name='push_token_update'),
]
