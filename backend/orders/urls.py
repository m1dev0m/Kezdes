from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AdminMenuCategoryViewSet, AdminMenuItemViewSet, OrderViewSet

app_name = "orders"

router = DefaultRouter()

router.register(r"admin/categories", AdminMenuCategoryViewSet, basename="admin-menu-categories")
router.register(r"admin/items", AdminMenuItemViewSet, basename="admin-menu-items")

router.register(r"orders", OrderViewSet, basename="orders")

urlpatterns = [
    path("", include(router.urls)),
]

