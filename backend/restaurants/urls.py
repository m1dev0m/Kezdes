from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RestaurantViewSet, RestaurantRequestViewSet, TableViewSet, StaffViewSet, ReviewViewSet, ZoneViewSet, ShiftViewSet

router = DefaultRouter()
router.register(r'requests', RestaurantRequestViewSet, basename='requests')
router.register(r'tables', TableViewSet, basename='tables')
router.register(r'zones', ZoneViewSet, basename='zones')
router.register(r'shifts', ShiftViewSet, basename='shifts')
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'reviews', ReviewViewSet, basename='all-reviews')
router.register(r'', RestaurantViewSet)

# For nested routing: /restaurants/<id>/reviews/
restaurant_router = DefaultRouter()
restaurant_router.register(r'reviews', ReviewViewSet, basename='restaurant-reviews')

urlpatterns = [
    path('', include(router.urls)),
    path('<int:restaurant_pk>/', include(restaurant_router.urls)),
]
