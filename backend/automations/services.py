from .models import AutomationLog
from .tasks import send_reminder_email
from core.models import PushToken
from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_push(user, title, message, data=None):
        tokens = PushToken.objects.filter(user=user)
        for token_record in tokens:
            logger.debug(f"Sending Push to {token_record.token}: [{title}] {message}")
        return True

    @staticmethod
    def schedule_reminder(restaurant, customer, delay_minutes=120):
        log = AutomationLog.objects.create(
            restaurant=restaurant,
            customer=customer,
            type='reminder',
            status='pending'
        )
        
        return log
