from celery import shared_task
from .notifications import NotificationService
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_notification_task(self, user_id, title, body, data=None):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
        NotificationService._notify_user_sync(user, title, body, data)
    except User.DoesNotExist:
        logger.warning(f"User {user_id} not found for notification task.")
    except Exception as e:
        logger.error(f"Notification task failed: {e}")
        self.retry(exc=e, countdown=60)
