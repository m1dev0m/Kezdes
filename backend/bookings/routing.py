from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^/?ws/bookings/(?P<id>\d+)/$', consumers.BookingConsumer.as_asgi()),
]
