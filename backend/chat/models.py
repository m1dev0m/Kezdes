from django.db import models
from django.conf import settings
from bookings.models import Booking
from restaurants.models import Restaurant

class Message(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='direct_messages', null=True, blank=True)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    class Meta:
        ordering = ['timestamp']
    def __str__(self):
        return f"From {self.sender.username} - {self.timestamp}"
