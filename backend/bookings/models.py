from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta, datetime, time
from restaurants.models import Restaurant
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import RangeOperators, DateTimeRangeField
from django.db.models import Func

class TsRange(Func):
    function = 'tstzrange'
    output_field = DateTimeRangeField()

class Booking(models.Model):
    PENDING = 'pending'
    PAYMENT_PENDING = 'payment_pending'
    APPROVED = 'approved'
    SEATED = 'seated'
    REJECTED = 'rejected'
    CANCELLED_BY_USER = 'cancelled_by_user'
    CANCELLED_BY_RESTAURANT = 'cancelled_by_restaurant'
    EXPIRED = 'expired'
    COMPLETED = 'completed'
    NO_SHOW = 'no_show'
    STATUS_CHOICES = [
        (PENDING, 'Ожидает подтверждения'),
        (PAYMENT_PENDING, 'Ожидает предоплаты'),
        (APPROVED, 'Подтверждено'),
        (SEATED, 'Гость за столом'),
        (REJECTED, 'Отклонено'),
        (CANCELLED_BY_USER, 'Отменено пользователем'),
        (CANCELLED_BY_RESTAURANT, 'Отменено рестораном'),
        (EXPIRED, 'Истекло'),
        (COMPLETED, 'Завершено'),
        (NO_SHOW, 'Неявка'),
    ]
    TRANSITIONS = {
        PENDING: [APPROVED, PAYMENT_PENDING, REJECTED, EXPIRED, CANCELLED_BY_USER],
        PAYMENT_PENDING: [APPROVED, EXPIRED, CANCELLED_BY_USER],
        APPROVED: [SEATED, CANCELLED_BY_USER, CANCELLED_BY_RESTAURANT, COMPLETED, NO_SHOW],
        SEATED: [COMPLETED, NO_SHOW],
        REJECTED: [],
        CANCELLED_BY_USER: [],
        CANCELLED_BY_RESTAURANT: [],
        EXPIRED: [],
        COMPLETED: [],
        NO_SHOW: [],
    }
    ACTIVE_STATUSES = [PENDING, APPROVED, PAYMENT_PENDING, SEATED]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings', null=True, blank=True)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='bookings')
    table = models.ForeignKey('restaurants.Table', on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    tables = models.ManyToManyField('restaurants.Table', blank=True, related_name='legacy_bookings')
    date = models.DateField()
    time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(default=90, help_text="Длительность бронирования в минутах")
    start_datetime = models.DateTimeField(editable=False, null=True, blank=True)
    end_datetime = models.DateTimeField(editable=False, null=True, blank=True)
    guests = models.PositiveIntegerField(default=1)
    event_type = models.CharField(max_length=100, blank=True, null=True)
    special_requests = models.TextField(blank=True, null=True)
    user_name = models.CharField(max_length=255, blank=True, null=True, help_text="Имя клиента (для ручного ввода)")
    user_phone = models.CharField(max_length=50, blank=True, null=True, help_text="Телефон клиента (для ручного ввода)")
    event_title = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=PENDING)
    
    # Deposit fields
    deposit_required = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    is_deposit_paid = models.BooleanField(default=False)
    
    guest_email = models.EmailField(blank=True, null=True, help_text="Email for unauthenticated guests")
    budget = models.PositiveIntegerField(null=True, blank=True, help_text="Примерный бюджет события")
    pay_at_restaurant = models.BooleanField(default=False, help_text="Оплатить в ресторане")
    is_checked_in = models.BooleanField(default=False)
    check_in_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-date', '-time']
        indexes = [
            models.Index(fields=['restaurant', 'date', 'status']),
            models.Index(fields=['restaurant', 'date', 'time', 'status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['table', 'date', 'time']),
            models.Index(fields=['restaurant', 'created_at']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(guests__gte=1),
                name='booking_guests_gte_1',
            ),
            models.CheckConstraint(
                condition=models.Q(duration_minutes__gte=15),
                name='booking_duration_min_15',
            ),
            models.UniqueConstraint(
                fields=['user', 'restaurant', 'date', 'time'],
                condition=models.Q(status__in=['pending', 'approved']),
                name='unique_active_booking_per_slot',
            ),
        ]
    def __str__(self):
        user_label = self.user.username if self.user_id else (self.user_name or "guest")
        return f"Booking {self.id} - {user_label} @ {self.restaurant.name}"
    
    @property
    def duration_hours(self):
        return self.duration_minutes // 60
    
    @duration_hours.setter
    def duration_hours(self, value):
        self.duration_minutes = value * 60

    def save(self, *args, **kwargs):
        from datetime import datetime, time, date

        # Handle strings like '2030-01-01' and '19:00'
        parsed_date = self.date
        parsed_time = self.time

        if isinstance(parsed_date, str):
            parsed_date = datetime.strptime(parsed_date, '%Y-%m-%d').date()
        if isinstance(parsed_time, str):
            if len(parsed_time) == 5: # HH:MM
                 parsed_time = datetime.strptime(parsed_time, '%H:%M').time()
            else: # HH:MM:SS
                 parsed_time = datetime.strptime(parsed_time, '%H:%M:%S').time()

        self.date = parsed_date
        self.time = parsed_time

        start_dt = datetime.combine(parsed_date, parsed_time)
        # Always make timezone-aware when USE_TZ is enabled
        if settings.USE_TZ:
            start_dt = timezone.make_aware(start_dt)

        # Check if we need to update the datetime fields
        needs_update = False
        if not self.start_datetime:
            needs_update = True
        else:
            # Compare aware datetimes properly
            existing = self.start_datetime
            if settings.USE_TZ and timezone.is_naive(existing):
                existing = timezone.make_aware(existing)
            if existing != start_dt:
                needs_update = True

        if needs_update:
            self.start_datetime = start_dt
            self.end_datetime = start_dt + timedelta(minutes=self.duration_minutes)

        super().save(*args, **kwargs)

    def transition_to(self, new_status, *, actor=None):
        """Enforce valid status transitions. Raises ValidationError on illegal ones."""
        allowed = self.TRANSITIONS.get(self.status, [])
        if new_status not in allowed:
            raise ValidationError(
                f"Недопустимый переход статуса: {self.get_status_display()} → {new_status}. "
                f"Допустимые: {', '.join(allowed) if allowed else 'нет (терминальный статус)'}."
            )
        old_status = self.status
        old_table = self.table
        self.status = new_status
        self.save()
        ReservationHistory.objects.create(
            reservation=self,
            status=new_status,
            event_type='status_change',
            actor=actor,
            from_status=old_status,
            to_status=new_status,
            from_table=old_table,
            to_table=self.table,
        )
        return self
    @property
    def end_time(self):
        start_dt = datetime.combine(self.date, self.time)
        end_dt = start_dt + timedelta(minutes=self.duration_minutes)
        return end_dt.time()
    @property
    def is_active(self):
        return self.status in self.ACTIVE_STATUSES
    def overlaps_with(self, other_start_dt: datetime, other_end_dt: datetime) -> bool:
        if not self.start_datetime or not self.end_datetime:
            return False
        return self.start_datetime < other_end_dt and other_start_dt < self.end_datetime

    @classmethod
    def expire_stale_bookings(cls, ttl_minutes=30):
        """Mark pending bookings older than TTL as expired."""
        cutoff = timezone.now() - timedelta(minutes=ttl_minutes)
        expired_count = cls.objects.filter(
            status=cls.PENDING,
            created_at__lt=cutoff
        ).update(status=cls.EXPIRED)
        return expired_count
    @classmethod
    def get_active_for_slot(cls, restaurant, date, start_time, duration_minutes=90):
        """Get all active bookings that overlap with the given time slot."""
        start_dt = datetime.combine(date, start_time)
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        return cls.objects.filter(
            restaurant=restaurant,
            status__in=cls.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt
        )
class BookingSecurity(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='security')
    qr_code_data = models.CharField(max_length=255, unique=True)
    is_valid = models.BooleanField(default=True)
    def __str__(self):
        return f"Security for Booking {self.booking.id}"

class ReservationHistory(models.Model):
    reservation = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='history')
    status = models.CharField(max_length=30)
    event_type = models.CharField(max_length=50, default='status_change')
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_events',
    )
    from_status = models.CharField(max_length=30, null=True, blank=True)
    to_status = models.CharField(max_length=30, null=True, blank=True)
    from_table = models.ForeignKey(
        'restaurants.Table',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_events_from',
    )
    to_table = models.ForeignKey(
        'restaurants.Table',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='booking_events_to',
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['reservation', '-changed_at']),
        ]

    def __str__(self):
        return f"{self.reservation.id} - {self.status} at {self.changed_at}"

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum
from restaurants.models import Availability

@receiver(post_save, sender=Booking)
@receiver(post_delete, sender=Booking)
def update_availability_on_booking_change(sender, instance, **kwargs):
    """
    Automatically updates the daily Availability record when a booking is made or changed.
    This ensures that the 'available_seats' at the daily level reflects confirmed reservations.
    """
    restaurant = instance.restaurant
    date = instance.date
    
    total_capacity = restaurant.tables.filter(is_active=True).aggregate(Sum('seats'))['seats__sum'] or 0
    
    
    booked_guests = Booking.objects.filter(
        restaurant=restaurant,
        date=date,
        status__in=[Booking.PENDING, Booking.APPROVED]
    ).aggregate(Sum('guests'))['guests__sum'] or 0
    
    available_seats = max(0, total_capacity - booked_guests)
    
    Availability.objects.update_or_create(
        restaurant=restaurant,
        date=date,
        defaults={
            'available_seats': available_seats,
            'is_fully_booked': available_seats <= 0
        }
    )

    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        if channel_layer:
            data = {
                'id': instance.id,
                'status': instance.status,
                'date': str(instance.date),
                'time': str(instance.time),
                'guests': instance.guests,
                'duration_minutes': instance.duration_minutes,
                'user_name': instance.user_name or (instance.user.get_full_name() if instance.user else None),
                'comment': instance.special_requests,
                'restaurant_name': restaurant.name,
                'table_number': instance.table.number if instance.table else None,
            }
            async_to_sync(channel_layer.group_send)(
                f'bookings_restaurant_{restaurant.id}',
                {
                    'type': 'booking_update',
                    'booking': data
                }
            )
            if instance.user_id:
                async_to_sync(channel_layer.group_send)(
                    f'bookings_user_{instance.user_id}',
                    {
                        'type': 'booking_update',
                        'booking': data
                    }
                )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"WebSocket send failed: {e}")


class WaitlistEntry(models.Model):
    WAITING = 'waiting'
    NOTIFIED = 'notified'
    PROMOTED = 'promoted'
    EXPIRED = 'expired'
    CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (WAITING, 'В очереди'),
        (NOTIFIED, 'Уведомлён'),
        (PROMOTED, 'Бронь создана'),
        (EXPIRED, 'Истекло'),
        (CANCELLED, 'Отменено'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='waitlist_entries')
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='waitlist_entries')
    date = models.DateField()
    time = models.TimeField()
    guests = models.PositiveIntegerField(default=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=WAITING)
    notified_at = models.DateTimeField(null=True, blank=True)
    promoted_booking = models.ForeignKey(
        Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='waitlist_source'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['restaurant', 'date', 'time', 'status']),
            models.Index(fields=['user', 'status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'restaurant', 'date', 'time'],
                condition=models.Q(status__in=['waiting', 'notified']),
                name='unique_active_waitlist_per_slot',
            ),
        ]

    def __str__(self):
        return f"Waitlist: {self.user.username} @ {self.restaurant.name} on {self.date} {self.time}"
