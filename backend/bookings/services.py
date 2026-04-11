from datetime import datetime, timedelta, time, date
from typing import Optional, List, Tuple, Dict, Any
from django.core.exceptions import ObjectDoesNotExist
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from django.db.models import Sum, Q
from django.db import transaction
from django.core.exceptions import ValidationError
from restaurants.models import Table, Restaurant
from .models import Booking, ReservationHistory
from .engine import ReservationValidator, TableAssigner, StatusMachine, _aware
from core.notifications import NotificationService

# Backward-compatible alias
make_aware_if_needed = _aware


class BookingService:
    """Service class for booking business logic."""

    LOCK_GRANULARITY_MINUTES = 15

    # ── Operating hours ────────────────────────────────────────────────────

    @staticmethod
    def is_within_operating_hours(
        restaurant: Restaurant,
        date: date,
        request_time: time,
        duration_minutes: int = 90,
    ) -> bool:
        """Check if the requested time slot falls within restaurant operating hours."""
        err = ReservationValidator._check_operating_hours(
            restaurant, date, request_time, duration_minutes
        )
        return err is None

    # ── Distributed locking ────────────────────────────────────────────────

    @staticmethod
    def _lock_keys_for_range(
        restaurant_id: int, start_dt: datetime, end_dt: datetime
    ) -> List[str]:
        keys = []
        cursor = start_dt
        step = timedelta(minutes=BookingService.LOCK_GRANULARITY_MINUTES)
        while cursor < end_dt:
            keys.append(
                f"lock:booking:{restaurant_id}:{cursor.date().isoformat()}"
                f":{cursor.time().strftime('%H%M')}"
            )
            cursor += step
        return keys

    @staticmethod
    def acquire_booking_lock(
        restaurant_id: int,
        date: date,
        time_val: time,
        duration_minutes: int = 90,
        timeout: int = 30,
    ) -> bool:
        """Distributed lock for a reservation time range."""
        import time as time_module

        start_dt = _aware(datetime.combine(date, time_val))
        end_dt = start_dt + timedelta(minutes=duration_minutes or 90)
        keys = BookingService._lock_keys_for_range(restaurant_id, start_dt, end_dt)

        for _ in range(50):
            acquired = []
            ok = True
            for key in sorted(keys):
                if cache.add(key, "locked", timeout=timeout):
                    acquired.append(key)
                    continue
                ok = False
                break
            if ok:
                return True
            for k in acquired:
                cache.delete(k)
            time_module.sleep(0.1)
        return False

    @staticmethod
    def release_booking_lock(
        restaurant_id: int,
        date: date,
        time_val: time,
        duration_minutes: int = 90,
    ) -> None:
        start_dt = _aware(datetime.combine(date, time_val))
        end_dt = start_dt + timedelta(minutes=duration_minutes or 90)
        keys = BookingService._lock_keys_for_range(restaurant_id, start_dt, end_dt)
        for key in keys:
            cache.delete(key)

    # ── Delegates to engine ────────────────────────────────────────────────

    @staticmethod
    def find_best_tables(
        restaurant: Restaurant,
        date: date,
        start_time: time,
        guests: int,
        duration_minutes: int = 90,
        preferred_table_id: Optional[int] = None,
        exclude_booking_id: Optional[int] = None,
    ) -> List[Table]:
        """Delegate to TableAssigner."""
        return TableAssigner.assign(
            restaurant, date, start_time, guests, duration_minutes,
            preferred_table_id=preferred_table_id,
            exclude_booking_id=exclude_booking_id,
        )

    @staticmethod
    def check_capacity(
        restaurant: Restaurant,
        date: date,
        start_time: time,
        guests: int,
        duration_minutes: int = 90,
        exclude_booking_id: Optional[int] = None,
    ) -> Tuple[bool, int]:
        """
        Check if the restaurant has enough global capacity for a given slot.
        Returns (is_ok, available_seats).
        """
        err = ReservationValidator._check_capacity(
            restaurant, date, start_time, guests, duration_minutes,
            exclude_booking_id=exclude_booking_id,
        )
        if err is None:
            return True, 0

        # Extract available seats from error (already computed inside validator)
        start_dt = _aware(datetime.combine(date, start_time))
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        qs = Booking.objects.filter(
            restaurant=restaurant,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt,
        )
        if exclude_booking_id:
            qs = qs.exclude(id=exclude_booking_id)
        booked = qs.aggregate(total=Sum("guests"))["total"] or 0
        available = max(0, restaurant.capacity - booked) if restaurant.capacity else 0
        return False, available

    @staticmethod
    def get_available_slots(
        restaurant: Restaurant,
        date: date,
        guests: int,
        duration_minutes: int = 90,
    ) -> List[str]:
        """Get list of available time slots for given date and guest count."""
        try:
            hours = restaurant.operating_hours.get(day_of_week=date.weekday())
        except ObjectDoesNotExist:
            start_t = time(10, 0)
            end_t = time(22, 0)
            is_closed = False
        else:
            start_t = hours.opening_time
            end_t = hours.closing_time
            is_closed = hours.is_closed

        if is_closed:
            return []

        slots = []
        current_dt = _aware(datetime.combine(date, start_t))

        if end_t <= start_t:
            close_dt = _aware(datetime.combine(date + timedelta(days=1), end_t))
        else:
            close_dt = _aware(datetime.combine(date, end_t))

        limit_dt = close_dt - timedelta(minutes=duration_minutes)

        while current_dt <= limit_dt:
            slot_time = current_dt.time()
            tables = TableAssigner.assign(
                restaurant, date, slot_time, guests, duration_minutes
            )
            if tables:
                slots.append(slot_time.strftime("%H:%M"))
            current_dt += timedelta(minutes=30)

        return slots

    @staticmethod
    def get_available_table_ids(
        restaurant: Restaurant,
        date: date,
        start_time: time,
        duration_minutes: int = 90,
        exclude_booking_id: Optional[int] = None,
    ) -> List[int]:
        """Returns a list of table IDs that are free at the given time."""
        tables = TableAssigner._available_tables(
            restaurant, date, start_time, duration_minutes,
            exclude_booking_id=exclude_booking_id,
        )
        return [t.id for t in tables]

    # ── Validation ─────────────────────────────────────────────────────────

    @staticmethod
    def validate_booking_data(
        user: settings.AUTH_USER_MODEL,
        restaurant: Restaurant,
        booking_date: date,
        start_time: time,
        guests: int,
        duration_minutes: int,
        exclude_booking_id: Optional[int] = None,
    ) -> None:
        """Validate booking data using the engine and raise ValidationError if invalid."""
        from django.core.exceptions import ValidationError as DjangoValidationError

        # 1. Core validation via engine (past, table, hours, overlap, capacity)
        result = ReservationValidator.validate(
            restaurant, booking_date, start_time, guests, duration_minutes,
            exclude_booking_id=exclude_booking_id,
        )
        if not result.is_valid:
            raise DjangoValidationError({"detail": "; ".join(result.errors)})

        # Skip user-specific checks for walk-ins (user=None)
        if user is None:
            return

        # 2. User-specific overlap check (same restaurant)
        start_dt = _aware(datetime.combine(booking_date, start_time))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        user_same_restaurant = Booking.objects.filter(
            user=user,
            restaurant=restaurant,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt,
        )
        if exclude_booking_id:
            user_same_restaurant = user_same_restaurant.exclude(id=exclude_booking_id)

        for existing in user_same_restaurant:
            raise DjangoValidationError(
                {"time": "У вас уже есть активная бронь в этом ресторане. "
                         "Чтобы забронировать снова, отмените предыдущую бронь."}
            )

        # 3. User-specific overlap check (other restaurants)
        user_all_bookings = Booking.objects.filter(
            user=user,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt,
        ).exclude(restaurant=restaurant).select_related('restaurant')
        if user_all_bookings.exists():
            existing = user_all_bookings.first()
            raise DjangoValidationError(
                {"time": f"У вас уже есть бронь на пересекающееся время "
                         f"в «{existing.restaurant.name}». Отмените её сначала."}
            )

        # 4. Active booking limit
        active_count = Booking.objects.filter(
            user=user,
            status__in=Booking.ACTIVE_STATUSES,
        ).count()
        if active_count >= 3:
            raise DjangoValidationError(
                {"non_field_errors": "Слишком много активных бронирований (максимум 3). "
                                     "Отмените существующие, чтобы создать новые."}
            )

    # ── Create ─────────────────────────────────────────────────────────────

    @staticmethod
    def create_booking(
        user: Optional[settings.AUTH_USER_MODEL],
        restaurant: Restaurant,
        booking_date: date,
        start_time: time,
        guests: int,
        duration_minutes: int = 90,
        preferred_table_id: Optional[int] = None,
        **booking_data,
    ) -> Booking:
        """Create a new booking with all validations and table allocation."""
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.db import IntegrityError

        BookingService.validate_booking_data(
            user, restaurant, booking_date, start_time, guests, duration_minutes
        )

        if not BookingService.acquire_booking_lock(
            restaurant.id, booking_date, start_time, duration_minutes
        ):
            raise DjangoValidationError(
                {"detail": "Это время сейчас бронируется другим пользователем. "
                           "Попробуйте снова через несколько секунд."}
            )

        try:
            with transaction.atomic():
                allocated_tables = TableAssigner.assign(
                    restaurant=restaurant,
                    booking_date=booking_date,
                    start_time=start_time,
                    guests=guests,
                    duration_minutes=duration_minutes,
                    preferred_table_id=preferred_table_id,
                )

                if not allocated_tables:
                    raise DjangoValidationError(
                        {"detail": "Нет доступных столов на выбранное время. "
                                   "Измените время/количество гостей или обновите карту столов."}
                    )

                deposit_required = 0.0
                initial_status = Booking.PENDING

                if restaurant.deposit_min_guests and guests >= restaurant.deposit_min_guests:
                    if restaurant.deposit_amount_per_guest:
                        deposit_required = restaurant.deposit_amount_per_guest * guests
                        initial_status = Booking.PAYMENT_PENDING

                booking = Booking.objects.create(
                    user=user,
                    restaurant=restaurant,
                    date=booking_date,
                    time=start_time,
                    duration_minutes=duration_minutes,
                    guests=guests,
                    status=initial_status,
                    deposit_required=deposit_required,
                    table=allocated_tables[0],
                    **booking_data,
                )
                booking.tables.set(allocated_tables)

                # CRM integration
                try:
                    from crm.services import CRMService
                    customer_phone = booking_data.get('user_phone')
                    if not customer_phone and user:
                        from core.utils import get_user_profile
                        _prof = get_user_profile(user)
                        customer_phone = getattr(_prof, 'phone', None) if _prof else None
                    if customer_phone:
                        CRMService.ensure_customer(
                            restaurant=restaurant,
                            phone=customer_phone,
                            name=booking_data.get('user_name') or (
                                user.get_full_name() if user else None
                            ),
                            email=user.email if user else None,
                        )
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(
                        f"Failed to ensure CRM customer for booking {booking.id}: {e}"
                    )

                NotificationService.notify_restaurant_new_booking(booking)
                return booking

        except IntegrityError:
            raise DjangoValidationError(
                {"detail": "Бронирование на это время уже существует. Попробуйте другое время."}
            )
        finally:
            BookingService.release_booking_lock(
                restaurant.id, booking_date, start_time, duration_minutes
            )

    # ── Confirm / Reject ───────────────────────────────────────────────────

    @staticmethod
    def confirm_booking(booking_id, actor=None):
        """Confirms a pending booking. Re-checks capacity."""
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=booking_id)
            if booking.status not in (Booking.PENDING, Booking.PAYMENT_PENDING):
                return None, f"Booking is in {booking.status} status, cannot confirm."

            is_ok, available = BookingService.check_capacity(
                booking.restaurant,
                booking.date,
                booking.time,
                booking.guests,
                booking.duration_minutes,
                exclude_booking_id=booking.id,
            )
            if not is_ok:
                return None, f"Capacity exceeded. Available: {available}, Needed: {booking.guests}"

            StatusMachine.transition(booking, Booking.CONFIRMED, actor=actor)
            NotificationService.notify_customer_booking_confirmed(booking)
            return booking, None

    @staticmethod
    def reject_booking(booking_id, actor=None):
        """Rejects a pending booking."""
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=booking_id)
            if booking.status != Booking.PENDING:
                return None, "Only pending bookings can be rejected."

            StatusMachine.transition(booking, Booking.REJECTED, actor=actor)
            NotificationService.notify_customer_booking_rejected(booking)
            return booking, None

    # ── Maintenance ────────────────────────────────────────────────────────

    @staticmethod
    def expire_stale_bookings(ttl_minutes=30):
        """Mark pending bookings older than TTL as expired."""
        cutoff = timezone.now() - timedelta(minutes=ttl_minutes)
        return Booking.objects.filter(
            status=Booking.PENDING,
            created_at__lt=cutoff,
        ).update(status=Booking.EXPIRED)

    @staticmethod
    def process_past_bookings():
        """Mark past approved bookings as COMPLETED or NO_SHOW."""
        now = timezone.now()
        completed = Booking.objects.filter(
            status=Booking.CONFIRMED,
            end_datetime__lt=now,
            is_checked_in=True,
        ).update(status=Booking.COMPLETED)

        cutoff = now - timedelta(minutes=30)
        no_shows = Booking.objects.filter(
            status=Booking.CONFIRMED,
            end_datetime__lt=cutoff,
            is_checked_in=False,
        ).update(status=Booking.NO_SHOW)

        return {"completed": completed, "no_shows": no_shows}


class WaitlistService:
    @staticmethod
    def promote_next(restaurant, date, time_val):
        """Find the oldest 'waiting' entry and notify."""
        from .models import WaitlistEntry

        entry = WaitlistEntry.objects.filter(
            restaurant=restaurant,
            date=date,
            time=time_val,
            status=WaitlistEntry.WAITING,
        ).order_by('created_at').first()

        if not entry:
            return None

        is_available, _ = BookingService.check_capacity(
            restaurant, date, time_val, entry.guests
        )
        if not is_available:
            return None

        entry.status = WaitlistEntry.NOTIFIED
        entry.notified_at = timezone.now()
        entry.save()

        if entry.user_id:
            NotificationService.notify_user(
                entry.user,
                "Место освободилось!",
                f"В ресторане {restaurant.name} освободился столик на {date} в {time_val}. "
                f"У вас есть 15 минут, чтобы подтвердить бронирование.",
                data={"type": "waitlist_promoted", "waitlist_id": entry.id},
            )
        return entry
