from django.urls import path

from .views import HealthLiveView, HealthReadyView, HealthWorkersView

urlpatterns = [
    path("live/", HealthLiveView.as_view(), name="health_live"),
    path("ready/", HealthReadyView.as_view(), name="health_ready"),
    path("workers/", HealthWorkersView.as_view(), name="health_workers"),
]
