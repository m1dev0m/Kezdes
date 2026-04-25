import logging
import os
from django.conf import settings
from .push_utils import send_push_notification

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def notify_user(user, title, body, data=None):
        if not user or not user.id:
            return

        if getattr(settings, "IS_TESTING", False) or getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
            return
        
        try:
            from .tasks import send_notification_task
            send_notification_task.delay(user.id, title, body, data)
        except Exception as e:
            logger.warning(
                "Notification async failed; skipping sync fallback for user %s: %s",
                user.id,
                e,
            )
            return

    @staticmethod
    def _notify_user_sync(user, title, body, data=None):
        push_response = send_push_notification(user, title, body, data)
        if push_response:
            logger.info(f"Push notification sent to user {user.id}")
        
        
        return push_response

    @staticmethod
    def notify_restaurant_new_booking(booking):
        restaurant = booking.restaurant
        title = "Новое бронирование"
        body = f"Получена новая бронь на {booking.date} в {booking.time} ({booking.guests} чел.)"
        data = {"booking_id": booking.id, "type": "new_booking", "url": "/messages"}
        
        if restaurant.owner:
            NotificationService.notify_user(restaurant.owner, title, body, data)
        
                                                                              
        staff = restaurant.staff_profiles.filter(role__in=['manager', 'host', 'hostess'])
        for profile in staff:
            NotificationService.notify_user(profile.user, title, body, data)

    @staticmethod
    def notify_customer_booking_confirmed(booking):
        title = "Бронь подтверждена!"
        body = f"Ваше бронирование в {booking.restaurant.name} на {booking.date} в {booking.time} подтверждено."
        data = {"booking_id": booking.id, "type": "booking_approved", "url": f"/restaurant/{booking.restaurant.id}/bookings/{booking.id}"}
        
        NotificationService.notify_user(booking.user, title, body, data)

    @staticmethod
    def notify_customer_booking_rejected(booking):
        title = "Бронь отклонена"
        body = f"К сожалению, {booking.restaurant.name} отклонил ваше бронирование на {booking.date}."
        data = {"booking_id": booking.id, "type": "booking_rejected", "url": f"/restaurant/{booking.restaurant.id}"}
        
        NotificationService.notify_user(booking.user, title, body, data)

    @staticmethod
    def notify_restaurant_approved(user, restaurant_name, credentials=None):
        title = "Ваш ресторан одобрен!"
        body = f"Поздравляем! Ваш запрос на подключение '{restaurant_name}' был одобрен. Теперь вы можете войти в панель управления."
        data = {"type": "restaurant_approved", "url": "/app/dashboard"}
        
        if credentials and credentials.get("username"):
            body += f" Ваши данные для входа: Логин: {credentials['username']}, Пароль: {credentials['password']}"

        NotificationService.notify_user(user, title, body, data)

    @staticmethod
    def send_whatsapp_placeholder(phone, message):
        logger.warning(f"WhatsApp integration not implemented - message to {phone}: {message}")
