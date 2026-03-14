from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, CustomerNoteViewSet, VisitViewSet, LeadViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'notes', CustomerNoteViewSet, basename='customer-note')
router.register(r'visits', VisitViewSet, basename='visit')
router.register(r'leads', LeadViewSet, basename='lead')

urlpatterns = [
    path('', include(router.urls)),
]
