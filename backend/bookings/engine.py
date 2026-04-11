"""
Reservation Engine — core booking logic.

Responsibilities:
  1. ReservationValidator  — overlap / capacity / table-existence checks
  2. TableAssigner         — smallest-suitable-table selection
  3. StatusMachine         — enforced status transitions
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Dict, List, Optional, Set, Tuple

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q, QuerySet, Sum
from django.utils import timezone

from restaurants.models import Restaurant, Table
from bookings.models import Booking, ReservationHistory


# ── helpers ────────────────────────────────────────────────────────────────────

def _aware(dt: datetime) -> datetime:
    """Return a timezone-aware datetime when USE_TZ is on."""
    if settings.USE_TZ and timezone.is_naive(dt):
        return timezone.make_aware(dt)
    return dt


# ════════════════════════════════════════════════════════════════════════════════
# 1. RESERVATION VALIDATOR
# ════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str] = field(default_factory=list)

    def raise_if_invalid(self) -> None:
        if not self.is_valid:
            raise ValidationError("; ".join(self.errors))


class ReservationValidator:
    """Unified validation for a reservation request."""

    # ── public API ─────────────────────────────────────────────────────────

    @classmethod
    def validate(
        cls,
        restaurant: Restaurant,
        booking_date: date,
        start_time: time,
        guests: int,
        duration_minutes: int = 90,
        *,
        table_id: Optional[int] = None,
        exclude_booking_id: Optional[int] = None,
    ) -> ValidationResult:
        """
        Run ALL checks and return a combined result.

        Checks (in order):
          1. date / time not in the past
          2. table exists and belongs to restaurant  (when table_id given)
             + table-specific overlap when table_id is given
          3. operating hours
          4. capacity
          5. table availability (any table fits) when no table_id

        Note: Overlap is enforced PER-TABLE by TableAssigner, not restaurant-wide.
        Multiple bookings CAN coexist at the same time on different tables.
        """
        errors: List[str] = []

        # 1 ── past-date / past-time
        past_err = cls._check_not_past(booking_date, start_time)
        if past_err:
            errors.append(past_err)

        # 2 ── table existence + per-table overlap
        if table_id is not None:
            tbl_err = cls._check_table_exists(table_id, restaurant, guests)
            if tbl_err:
                errors.append(tbl_err)
            else:
                # Check if THIS specific table is already booked
                tbl_overlap = cls._check_table_overlap(
                    restaurant, table_id, booking_date, start_time,
                    duration_minutes, exclude_booking_id=exclude_booking_id,
                )
                if tbl_overlap:
                    errors.append(tbl_overlap)

        # 3 ── operating hours
        hours_err = cls._check_operating_hours(restaurant, booking_date, start_time, duration_minutes)
        if hours_err:
            errors.append(hours_err)

        # 4 ── capacity
        cap_err = cls._check_capacity(
            restaurant, booking_date, start_time, guests, duration_minutes,
            exclude_booking_id=exclude_booking_id,
        )
        if cap_err:
            errors.append(cap_err)

        # 5 ── at least one table must be available (when no specific table requested)
        if table_id is None:
            table_err = cls._check_any_table_available(
                restaurant, booking_date, start_time, guests,
                duration_minutes, exclude_booking_id=exclude_booking_id,
            )
            if table_err:
                errors.append(table_err)

        return ValidationResult(is_valid=len(errors) == 0, errors=errors)

    # ── individual checks ──────────────────────────────────────────────────

    @classmethod
    def _check_not_past(cls, booking_date: date, start_time: time) -> Optional[str]:
        if booking_date < date.today():
            return "Нельзя создать бронирование на прошедшую дату."
        if booking_date == date.today() and start_time < timezone.now().time():
            return "Нельзя забронировать на прошедшее время сегодня."
        return None

    @classmethod
    def _check_table_exists(
        cls, table_id: int, restaurant: Restaurant, guests: int
    ) -> Optional[str]:
        """
        Verify the table:
          - belongs to the restaurant
          - is active
          - has enough seats
        """
        try:
            table = Table.objects.get(id=table_id)
        except Table.DoesNotExist:
            return f"Стол с id={table_id} не найден."

        if table.restaurant_id != restaurant.id:
            return f"Стол {table.number} не принадлежит этому ресторану."

        if not table.is_active:
            return f"Стол {table.number} недоступен (неактивен)."

        if table.seats < guests:
            return (
                f"Стол {table.number} вмещает {table.seats} чел., "
                f"а запрошено {guests}."
            )

        return None

    @classmethod
    def _check_operating_hours(
        cls,
        restaurant: Restaurant,
        booking_date: date,
        start_time: time,
        duration_minutes: int,
    ) -> Optional[str]:
        try:
            hours = restaurant.operating_hours.get(day_of_week=booking_date.weekday())
        except Exception:
            return None  # no hours configured → assume open

        if hours.is_closed:
            return "Ресторан закрыт в этот день."

        start_dt = _aware(datetime.combine(booking_date, start_time))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        open_dt = _aware(datetime.combine(booking_date, hours.opening_time))
        if hours.closing_time <= hours.opening_time:
            close_dt = _aware(
                datetime.combine(booking_date + timedelta(days=1), hours.closing_time)
            )
        else:
            close_dt = _aware(datetime.combine(booking_date, hours.closing_time))

        if not (open_dt <= start_dt and end_dt <= close_dt):
            return "Бронирование недоступно на выбранное время (вне часов работы)."

        return None

    @classmethod
    def _check_overlap(
        cls,
        restaurant: Restaurant,
        booking_date: date,
        start_time: time,
        duration_minutes: int,
        *,
        exclude_booking_id: Optional[int] = None,
    ) -> Optional[str]:
        """
        Detect ANY active booking whose time range overlaps the requested slot.
        This is a restaurant-wide check (used for capacity context, not blocking).
        """
        start_dt = _aware(datetime.combine(booking_date, start_time))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        qs = Booking.objects.filter(
            restaurant=restaurant,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt,
        )
        if exclude_booking_id:
            qs = qs.exclude(id=exclude_booking_id)

        count = qs.count()
        if count > 0:
            return (
                f"Обнаружено {count} активных бронирований, "
                f"пересекающихся с запрошенным временем."
            )
        return None

    @classmethod
    def _check_table_overlap(
        cls,
        restaurant: Restaurant,
        table_id: int,
        booking_date: date,
        start_time: time,
        duration_minutes: int,
        *,
        exclude_booking_id: Optional[int] = None,
    ) -> Optional[str]:
        """
        Check if a SPECIFIC table has overlapping bookings.
        """
        from bookings.models import Booking as Bk
        start_dt = _aware(datetime.combine(booking_date, start_time))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        qs = Bk.objects.filter(
            restaurant=restaurant,
            table_id=table_id,
            status__in=Bk.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt,
        )
        if exclude_booking_id:
            qs = qs.exclude(id=exclude_booking_id)

        if qs.exists():
            table = Table.objects.get(id=table_id)
            return f"Стол {table.number} уже забронирован на это время."
        return None

    @classmethod
    def _check_any_table_available(
        cls,
        restaurant: Restaurant,
        booking_date: date,
        start_time: time,
        guests: int,
        duration_minutes: int,
        *,
        exclude_booking_id: Optional[int] = None,
    ) -> Optional[str]:
        """
        Check that at least one suitable table is available for the slot.
        Uses TableAssigner to find best match.
        """
        from bookings.engine import TableAssigner
        tables = TableAssigner.assign(
            restaurant, booking_date, start_time, guests, duration_minutes,
            exclude_booking_id=exclude_booking_id,
        )
        if not tables:
            return (
                "Нет доступных столов на выбранное время. "
                "Измените время/количество гостей."
            )
        return None

    @classmethod
    def _check_capacity(
        cls,
        restaurant: Restaurant,
        booking_date: date,
        start_time: time,
        guests: int,
        duration_minutes: int = 90,
        *,
        exclude_booking_id: Optional[int] = None,
    ) -> Optional[str]:
        """
        Check global restaurant capacity for the slot.
        Returns error string when capacity is exceeded.
        """
        if not restaurant.capacity:
            return None  # no capacity set → skip

        start_dt = _aware(datetime.combine(booking_date, start_time))
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

        if booked + guests > restaurant.capacity:
            available = max(0, restaurant.capacity - booked)
            return (
                f"Превышена вместимость ресторана. "
                f"Доступно мест: {available}, запрошено: {guests}."
            )
        return None


# ════════════════════════════════════════════════════════════════════════════════
# 2. TABLE ASSIGNER
# ════════════════════════════════════════════════════════════════════════════════

class TableAssigner:
    """
    Find the best table (or combination) for a reservation.

    Priority:
      1. If preferred_table_id given → use it (if available & fits)
      2. Smallest single table that fits all guests
      3. Best combination of tables (minimise unused seats)
    """

    @classmethod
    def assign(
        cls,
        restaurant: Restaurant,
        booking_date: date,
        start_time: time,
        guests: int,
        duration_minutes: int = 90,
        *,
        preferred_table_id: Optional[int] = None,
        exclude_booking_id: Optional[int] = None,
    ) -> List[Table]:
        """
        Returns a list of Table objects (1 or more) or empty list if impossible.
        """
        available = cls._available_tables(
            restaurant, booking_date, start_time, duration_minutes,
            exclude_booking_id=exclude_booking_id,
        )

        if not available:
            return []

        # 1 ── preferred table
        if preferred_table_id:
            for t in available:
                if t.id == preferred_table_id:
                    if t.seats >= guests:
                        return [t]
                    break  # preferred too small → fall through
            return []  # preferred not found or too small → explicit fail

        # 2 ── smallest single table
        single = cls._best_single(available, guests)
        if single:
            return [single]

        # 3 ── combination
        combo = cls._best_combination(available, guests)
        if combo:
            return combo

        return []

    # ── internals ──────────────────────────────────────────────────────────

    @staticmethod
    def _available_tables(
        restaurant: Restaurant,
        booking_date: date,
        start_time: time,
        duration_minutes: int,
        *,
        exclude_booking_id: Optional[int] = None,
    ) -> List[Table]:
        """Active tables NOT occupied during the slot, ordered by seats."""
        start_dt = _aware(datetime.combine(booking_date, start_time))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        overlapping = Booking.objects.filter(
            restaurant=restaurant,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt,
        )
        if exclude_booking_id:
            overlapping = overlapping.exclude(id=exclude_booking_id)

        occupied: Set[int] = set()
        fk_ids = overlapping.exclude(table_id=None).values_list("table_id", flat=True)
        occupied.update(fk_ids)

        booking_ids = list(overlapping.values_list("id", flat=True))
        if booking_ids:
            m2m_ids = Booking.tables.through.objects.filter(
                booking_id__in=booking_ids
            ).values_list("table_id", flat=True)
            occupied.update(m2m_ids)

        return list(
            Table.objects.filter(restaurant=restaurant, is_active=True)
            .exclude(id__in=occupied)
            .order_by("seats", "id")
        )

    @staticmethod
    def _best_single(available: List[Table], guests: int) -> Optional[Table]:
        """Return the smallest table with seats >= guests, or None."""
        for t in available:  # already sorted by seats
            if t.seats >= guests:
                return t
        return None

    @staticmethod
    def _best_combination(available: List[Table], guests: int) -> List[Table]:
        """
        Bounded DP to find the combination of tables with minimum total seats
        that covers `guests`.  Returns empty list when impossible.
        """
        total = sum(t.seats for t in available)
        if total < guests:
            return []

        # best_for_sum[seats] = shortest list of tables achieving exactly `seats`
        best_for_sum: Dict[int, List[Table]] = {0: []}
        cap = guests + max(t.seats for t in available)

        for t in available:
            for seats, combo in list(best_for_sum.items()):
                new_seats = seats + t.seats
                if new_seats > cap:
                    continue
                new_combo = combo + [t]
                existing = best_for_sum.get(new_seats)
                if existing is None or len(new_combo) < len(existing):
                    best_for_sum[new_seats] = new_combo

        best: Optional[Tuple[int, List[Table]]] = None
        for seats, combo in best_for_sum.items():
            if seats < guests:
                continue
            if best is None or seats < best[0] or (
                seats == best[0] and len(combo) < len(best[1])
            ):
                best = (seats, combo)

        return best[1] if best else []


# ════════════════════════════════════════════════════════════════════════════════
# 3. STATUS MACHINE
# ════════════════════════════════════════════════════════════════════════════════

# Canonical transitions:  from_status → [allowed_to_statuses]
TRANSITIONS: Dict[str, List[str]] = {
    Booking.PENDING:               [Booking.CONFIRMED, Booking.PAYMENT_PENDING,
                                    Booking.REJECTED, Booking.EXPIRED,
                                    Booking.CANCELLED_BY_USER],
    Booking.PAYMENT_PENDING:       [Booking.CONFIRMED, Booking.EXPIRED,
                                    Booking.CANCELLED_BY_USER],
    Booking.CONFIRMED:             [Booking.SEATED, Booking.COMPLETED,
                                    Booking.NO_SHOW,
                                    Booking.CANCELLED_BY_USER,
                                    Booking.CANCELLED_BY_RESTAURANT],
    Booking.SEATED:                [Booking.COMPLETED, Booking.NO_SHOW],
    Booking.REJECTED:              [],
    Booking.CANCELLED_BY_USER:     [],
    Booking.CANCELLED_BY_RESTAURANT: [],
    Booking.EXPIRED:               [],
    Booking.COMPLETED:             [],
    Booking.NO_SHOW:               [],
}


class StatusMachine:
    """
    Enforce allowed status transitions.

    Usage:
        StatusMachine.transition(booking, Booking.CONFIRMED, actor=request.user)
    """

    @classmethod
    def transition(
        cls,
        booking: Booking,
        new_status: str,
        *,
        actor=None,
    ) -> Booking:
        """
        Transition `booking` to `new_status`.

        Raises ValidationError when the transition is not allowed.
        """
        allowed = TRANSITIONS.get(booking.status, [])
        if new_status not in allowed:
            raise ValidationError(
                f"Недопустимый переход: {booking.get_status_display()} → {new_status}. "
                f"Допустимые: {', '.join(allowed) if allowed else 'нет'}"
            )

        old_status = booking.status
        old_table = booking.table

        with transaction.atomic():
            booking.status = new_status
            booking.save(update_fields=["status", "updated_at"])

            ReservationHistory.objects.create(
                reservation=booking,
                status=new_status,
                event_type="status_change",
                actor=actor,
                from_status=old_status,
                to_status=new_status,
                from_table=old_table,
                to_table=booking.table,
            )
            
            import logging
            logger = logging.getLogger('bookings.transitions')
            logger.info(
                "Booking transition",
                extra={
                    "event": "booking_status_transition",
                    "booking_id": booking.id,
                    "restaurant_id": booking.restaurant_id,
                    "from_status": old_status,
                    "to_status": new_status,
                    "actor_id": actor.id if actor else None,
                    "guests": booking.guests,
                }
            )

        return booking

    @classmethod
    def allowed_transitions(cls, current_status: str) -> List[str]:
        """Return list of statuses reachable from `current_status`."""
        return list(TRANSITIONS.get(current_status, []))

    @classmethod
    def is_terminal(cls, status: str) -> bool:
        """True when no further transitions are possible."""
        return len(TRANSITIONS.get(status, [])) == 0
