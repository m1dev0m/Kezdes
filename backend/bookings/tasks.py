from celery import shared_task
from django.utils import timezone
from datetime import timedelta


@shared_task
def expire_stale_waitlist_entries(ttl_minutes=15):
    """
    Expire waitlist entries that were notified but not confirmed within TTL.
    """
    from .models import WaitlistEntry

    cutoff = timezone.now() - timedelta(minutes=ttl_minutes)
    expired_count = WaitlistEntry.objects.filter(
        status=WaitlistEntry.NOTIFIED,
        notified_at__lt=cutoff,
    ).update(status=WaitlistEntry.EXPIRED)
    return f"Expired {expired_count} waitlist entries"


@shared_task
def expire_stale_bookings(ttl_minutes=30):
    """
    Mark pending bookings older than TTL as expired.
    """
    from .models import Booking

    cutoff = timezone.now() - timedelta(minutes=ttl_minutes)
    expired_count = Booking.objects.filter(
        status=Booking.PENDING,
        created_at__lt=cutoff,
    ).update(status=Booking.EXPIRED)
    return f"Expired {expired_count} stale bookings"
