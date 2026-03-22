from django.db import models
from django.conf import settings
from bookings.models import Booking
from restaurants.models import Restaurant

class Conversation(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='conversations')
    guest = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['restaurant', 'guest'], name='unique_conversation_per_guest_restaurant'),
        ]

    def __str__(self):
        return f"Conversation {self.id} - {self.guest_id} @ {self.restaurant_id}"

class Message(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='direct_messages', null=True, blank=True)
    conversation = models.ForeignKey('chat.Conversation', on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    class Meta:
        ordering = ['timestamp']
    def __str__(self):
        return f"From {self.sender.username} - {self.timestamp}"
