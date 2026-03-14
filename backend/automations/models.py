from django.db import models
from restaurants.models import Restaurant
from crm.models import Customer


class AutomationLog(models.Model):
    TYPE_CHOICES = [
        ('reminder', 'Reminder (2 hours before)'),
        ('thank_you', 'Thank You (After Visit)'),
        ('inactivity', 'Inactivity (30 days)'),
        ('birthday', 'Birthday (7 days before)'),
        ('win_back', 'Win Back (30 days since last visit)'),
        ('review_request', 'Review Request (2 hours after visit)'),
        ('no_show_followup', 'No‑show follow-up'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='automation_logs')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='automation_logs')
    type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} to {self.customer.name} - {self.status}"
