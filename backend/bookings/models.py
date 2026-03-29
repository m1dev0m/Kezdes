from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta, datetime, time, date
from restaurants.models import Restaurant
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import RangeOperators, DateTimeRangeField
from django.db.models import Func
from typing import Optional, List, Dict, Any

class TsRange(Func):
    function = 'tstzrange'
    output_field = DateTimeRangeField()

class Booking(models.Model):
    # Status constants
    PENDING = 'pending'
    PAYMENT_PENDING = 'payment_pending'
    CONFIRMED = 'confirmed'
    APPROVED = 'confirmed'  # alias — backward compatibility with tests and CRM
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
        (CONFIRMED, 'Подтверждено'),
        (SEATED, 'Гость за столом'),
        (REJECTED, 'Отклонено'),
        (CANCELLED_BY_USER, 'Отменено пользователем'),
        (CANCELLED_BY_RESTAURANT, 'Отменено рестораном'),
        (EXPIRED, 'Истекло'),
        (COMPLETED, 'Завершено'),
        (NO_SHOW, 'Неявка'),
    ]

    TRANSITIONS = {
        PENDING: [CONFIRMED, PAYMENT_PENDING, REJECTED, EXPIRED, CANCELLED_BY_USER],
        PAYMENT_PENDING: [CONFIRMED, EXPIRED, CANCELLED_BY_USER],
        CONFIRMED: [SEATED, CANCELLED_BY_USER, CANCELLED_BY_RESTAURANT, COMPLETED, NO_SHOW],
        SEATED: [COMPLETED, NO_SHOW],
        REJECTED: [],
        CANCELLED_BY_USER: [],
        CANCELLED_BY_RESTAURANT: [],
        EXPIRED: [],
        COMPLETED: [],
        NO_SHOW: [],
    }

    ACTIVE_STATUSES = [PENDING, CONFIRMED, PAYMENT_PENDING, SEATED]

    # Fields
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings',
        null=True,
        blank=True
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    table = models.ForeignKey(
        'restaurants.Table',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings'
    )
    tables = models.ManyToManyField(
        'restaurants.Table',
        blank=True,
        related_name='legacy_bookings'
    )

    # Date/Time fields
    date = models.DateField()
    time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(
        default=90,
        help_text="Длительность бронирования в минутах"
    )
    start_datetime = models.DateTimeField(
        editable=False,
        null=True,
        blank=True
    )
    end_datetime = models.DateTimeField(
        editable=False,
        null=True,
        blank=True
    )

    # Guest information
    guests = models.PositiveIntegerField(default=1)
    user_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Имя клиента (для ручного ввода)"
    )
    user_phone = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Телефон клиента (для ручного ввода)"
    )

    # Event details
    event_type = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    event_title = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    special_requests = models.TextField(blank=True, null=True)

    # Status and workflow
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=PENDING
    )
    
    SOURCE_CHOICES = [
        ('web', 'Web'),
        ('telegram', 'Telegram'),
        ('phone', 'Phone'),
        ('admin', 'Admin'),
        ('walk_in', 'Walk-in'),
    ]
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='web')
    shift = models.ForeignKey('restaurants.Shift', on_delete=models.SET_NULL, null=True, blank=True)

    # Financial fields
    deposit_required = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.0
    )
    is_deposit_paid = models.BooleanField(default=False)
    budget = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Примерный бюджет события"
    )
    pay_at_restaurant = models.BooleanField(
        default=False,
        help_text="Оплатить в ресторане"
    )

    # Additional fields
    guest_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Email for unauthenticated guests"
    )
    is_checked_in = models.BooleanField(default=False)
    check_in_time = models.DateTimeField(null=True, blank=True)

    # Timestamps
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
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['start_datetime', 'end_datetime']),
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
            models.CheckConstraint(
                condition=models.Q(duration_minutes__lte=480),
                name='booking_duration_max_480',
            ),
            models.CheckConstraint(
                condition=models.Q(guests__lte=20),
                name='booking_guests_lte_20',
            ),
            models.UniqueConstraint(
                fields=['user', 'restaurant', 'date', 'time'],
                condition=models.Q(status__in=['pending', 'confirmed', 'payment_pending', 'seated']),
                name='unique_active_booking_per_slot',
            ),
        ]

    def __str__(self) -> str:
        user_label = self.user.username if self.user_id else (self.user_name or "guest")
        return f"Booking {self.id} - {user_label} @ {self.restaurant.name}"

    @property
    def duration_hours(self) -> float:
        """Get duration in hours"""
        return self.duration_minutes / 60

    @duration_hours.setter
    def duration_hours(self, value: float) -> None:
        """Set duration from hours"""
        self.duration_minutes = int(value * 60)

    @property
    def end_time(self) -> time:
        """Calculate end time based on start time and duration"""
        start_dt = datetime.combine(self.date, self.time)
        end_dt = start_dt + timedelta(minutes=self.duration_minutes)
        return end_dt.time()

    @property
    def is_active(self) -> bool:
        """Check if booking is in active status"""
        return self.status in self.ACTIVE_STATUSES

    @property
    def is_past(self) -> bool:
        """Check if booking is in the past"""
        if not self.end_datetime:
            return False
        return self.end_datetime < timezone.now()

    @property
    def can_be_cancelled(self) -> bool:
        """Check if booking can be cancelled by user"""
        return self.status in [self.PENDING, self.CONFIRMED, self.PAYMENT_PENDING]

    @property
    def can_be_modified(self) -> bool:
        """Check if booking can be modified"""
        return self.status in [self.PENDING, self.CONFIRMED] and not self.is_past

    def overlaps_with(self, other_start_dt: datetime, other_end_dt: datetime) -> bool:
        """Check if this booking overlaps with given time range"""
        if not self.start_datetime or not self.end_datetime:
            return False
        return self.start_datetime < other_end_dt and other_start_dt < self.end_datetime

    def clean(self) -> None:
        """Validate booking data"""
        if self.guests < 1:
            raise ValidationError({'guests': 'Количество гостей должно быть больше 0'})

        if self.duration_minutes < 15:
            raise ValidationError({'duration_minutes': 'Длительность должна быть не менее 15 минут'})

        if self.duration_minutes > 480:
            raise ValidationError({'duration_minutes': 'Длительность не может превышать 8 часов'})

        if self.date < date.today():
            raise ValidationError({'date': 'Нельзя создать бронирование на прошедшую дату'})

    def save(self, *args, **kwargs) -> None:
        """Save booking with automatic datetime calculation"""
        self.full_clean()

        # Calculate start and end datetimes
        start_dt = datetime.combine(self.date, self.time)
        if settings.USE_TZ:
            start_dt = timezone.make_aware(start_dt)

        self.start_datetime = start_dt
        self.end_datetime = start_dt + timedelta(minutes=self.duration_minutes)

        super().save(*args, **kwargs)

    def transition_to(self, new_status: str, *, actor: Optional[settings.AUTH_USER_MODEL] = None) -> 'Booking':
        """Transition booking to new status with validation"""
        if new_status not in self.TRANSITIONS.get(self.status, []):
            raise ValidationError(
                f"Недопустимый переход статуса: {self.get_status_display()} → {new_status}"
            )

        old_status = self.status
        old_table = self.table
        self.status = new_status
        self.save()

        # Create history record
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

    @classmethod
    def expire_stale_bookings(cls, ttl_minutes: int = 30) -> int:
        """Mark pending bookings older than TTL as expired"""
        cutoff = timezone.now() - timedelta(minutes=ttl_minutes)
        expired_count = cls.objects.filter(
            status=cls.PENDING,
            created_at__lt=cutoff
        ).update(status=cls.EXPIRED)
        return expired_count

    @classmethod
    def get_active_for_slot(
        cls,
        restaurant: Restaurant,
        date: date,
        start_time: time,
        duration_minutes: int = 90
    ) -> models.QuerySet['Booking']:
        """Get all active bookings that overlap with the given time slot"""
        start_dt = datetime.combine(date, start_time)
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        if settings.USE_TZ:
            start_dt = timezone.make_aware(start_dt)
            end_dt = timezone.make_aware(end_dt)

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
    
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('confirmed', 'Confirmed'),
        ('seated', 'Seated'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
        ('table_assigned', 'Table Assigned'),
        ('notes_updated', 'Notes Updated'),
    ]
    action = models.CharField(max_length=30, choices=ACTION_CHOICES, default='status_change')
    actor_label = models.CharField(max_length=100, blank=True)
    payload = models.JSONField(null=True, blank=True)
    
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
        status__in=[Booking.PENDING, Booking.CONFIRMED]
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
