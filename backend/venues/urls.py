from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VenueViewSet, AmenityViewSet
router = DefaultRouter()
router.register(r'venues', VenueViewSet, basename='venue')
router.register(r'amenities', AmenityViewSet, basename='amenity')
urlpatterns = [
    path('', include(router.urls)),
]
