from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AutomationLogViewSet

router = DefaultRouter()
router.register(r'logs', AutomationLogViewSet, basename='automation-log')

urlpatterns = [
    path('', include(router.urls)),
]
