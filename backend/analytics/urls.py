from django.urls import path
from .views import DashboardAnalyticsView, SystemAnalyticsView
urlpatterns = [
    path('dashboard/', DashboardAnalyticsView.as_view(), name='dashboard'),
    path('system/', SystemAnalyticsView.as_view(), name='system'),
]
