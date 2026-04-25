from celery import shared_task
from django.utils import timezone
from datetime import timedelta


@shared_task
def expire_stale_waitlist_entries(ttl_minutes=15):
    from .models import WaitlistEntry

    cutoff = timezone.now() - timedelta(minutes=ttl_minutes)
    expired_count = WaitlistEntry.objects.filter(
        status=WaitlistEntry.NOTIFIED,
        notified_at__lt=cutoff,
    ).update(status=WaitlistEntry.EXPIRED)
    return f"Expired {expired_count} waitlist entries"


@shared_task
def expire_stale_bookings(ttl_minutes=30):
    from .models import Booking

    cutoff = timezone.now() - timedelta(minutes=ttl_minutes)
    expired_count = Booking.objects.filter(
        status=Booking.PENDING,
        created_at__lt=cutoff,
    ).update(status=Booking.EXPIRED)
    return f"Expired {expired_count} stale bookings"


@shared_task
def auto_mark_no_shows(grace_minutes=20):
    from .models import Booking, ReservationHistory
    from crm.models import Customer
    import logging
    logger = logging.getLogger(__name__)

    cutoff = timezone.now() - timedelta(minutes=grace_minutes)
    
    stale_bookings = Booking.objects.filter(
        status__in=[Booking.PENDING, Booking.CONFIRMED],
        start_datetime__lt=cutoff
    )
    
    count = 0
    for b in stale_bookings:
        try:
            b.transition_to(Booking.NO_SHOW)
            
                                       
            customer_phone = b.user_phone
            if customer_phone:
                try:
                    customer = Customer.objects.get(restaurant=b.restaurant, phone=customer_phone)
                    customer.no_show_count += 1
                    customer.save(update_fields=['no_show_count'])
                except Customer.DoesNotExist:
                    pass
            
            ReservationHistory.objects.create(
                reservation=b,
                status=Booking.NO_SHOW,
                event_type='no_show',
                action='no_show',
                actor_label='system'
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to auto mark no show for booking {b.id}: {e}")
            
    return f"Marked {count} bookings as NO_SHOW"
