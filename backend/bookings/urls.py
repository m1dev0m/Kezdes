from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet, WaitlistViewSet

app_name = 'bookings'
router = DefaultRouter()
router.register(r'waitlist', WaitlistViewSet, basename='waitlist')
router.register(r'', BookingViewSet, basename='booking')
urlpatterns = [
    path('', include(router.urls)),
]
