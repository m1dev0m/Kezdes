import requests
import logging
logger = logging.getLogger(__name__)
def send_push_notification(user, title, body, data=None):
    from .models import PushToken
    tokens = list(PushToken.objects.filter(user=user).values_list('token', flat=True))
    if not tokens:
        return None
    messages = []
    for token in tokens:
        if not token.startswith('ExponentPushToken'):
            continue
        message = {
            'to': token,
            'title': title,
            'body': body,
            'sound': 'default',
        }
        if data:
            message['data'] = data
        messages.append(message)
    if not messages:
        return None
    try:
        response = requests.post(
            'https://exp.host/--/api/v2/push/send',
            json=messages,
            headers={
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Error sending push notification to user {user.id}: {e}")
        return None
