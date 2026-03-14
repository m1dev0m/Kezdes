from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContractorViewSet
router = DefaultRouter()
router.register(r'contractors', ContractorViewSet, basename='contractor')
urlpatterns = [
    path('', include(router.urls)),
]
