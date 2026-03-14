from django.db.models.signals import post_save
from django.dispatch import receiver

from bookings.models import Booking
from .models import Order


@receiver(post_save, sender=Booking)
def autocancel_order_on_booking_cancel(sender, instance: Booking, **kwargs):
    """
    If a reservation is cancelled, automatically cancel its attached order.
    """
    if instance.status not in (Booking.CANCELLED_BY_USER, Booking.CANCELLED_BY_RESTAURANT):
        return
    Order.objects.filter(reservation=instance).exclude(status=Order.Status.CANCELLED).update(status=Order.Status.CANCELLED)

