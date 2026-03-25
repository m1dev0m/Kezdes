from datetime import datetime, timedelta, time
from django.core.exceptions import ObjectDoesNotExist
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from django.db.models import Sum
from restaurants.models import Table
from .models import Booking

def make_aware_if_needed(dt):
    if dt is not None and settings.USE_TZ and timezone.is_naive(dt):
        return timezone.make_aware(dt)
    return dt

class BookingService:
    LOCK_GRANULARITY_MINUTES = 15

    @staticmethod
    def is_within_operating_hours(restaurant, date, request_time, duration_minutes=90):
        """
        Check if the requested time slot falls within restaurant operating hours for that day.
        Handles overnight hours (e.g. 18:00 - 02:00).
        """
        day_of_week = date.weekday()
        try:
            hours = restaurant.operating_hours.get(day_of_week=day_of_week)
        except ObjectDoesNotExist:
            return True

        if hours.is_closed:
            return False

        start_dt = make_aware_if_needed(datetime.combine(date, request_time))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        open_dt = make_aware_if_needed(datetime.combine(date, hours.opening_time))
        if hours.closing_time <= hours.opening_time:
            close_dt = make_aware_if_needed(datetime.combine(date + timedelta(days=1), hours.closing_time))
        else:
            close_dt = make_aware_if_needed(datetime.combine(date, hours.closing_time))

        return open_dt <= start_dt and end_dt <= close_dt

    @staticmethod
    def _lock_keys_for_range(restaurant_id, start_dt, end_dt):
        keys = []
        cursor = start_dt
        step = timedelta(minutes=BookingService.LOCK_GRANULARITY_MINUTES)
        while cursor < end_dt:
            keys.append(
                f"lock:booking:{restaurant_id}:{cursor.date().isoformat()}:{cursor.time().strftime('%H%M')}"
            )
            cursor += step
        return keys

    @staticmethod
    def find_best_tables(
        restaurant,
        date,
        start_time,
        guests,
        duration_minutes=90,
        preferred_table_id=None,
        exclude_booking_id=None,
    ):
        """
        Allocates one or more tables for a reservation.
        Prioritizes single tables, then combinations of tables to minimize unused capacity.
        """
        if not BookingService.is_within_operating_hours(restaurant, date, start_time, duration_minutes):
            return []

        start_dt = make_aware_if_needed(datetime.combine(date, start_time))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        # 1) Identify occupied tables in this slot (FK + legacy M2M) with minimal queries.
        overlapping_bookings = Booking.objects.filter(
            restaurant=restaurant,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt,
        ).values('id', 'table_id')

        if exclude_booking_id:
            overlapping_bookings = overlapping_bookings.exclude(id=exclude_booking_id)

        booking_ids = []
        occupied_fk_ids = set()
        for item in overlapping_bookings:
            booking_ids.append(item['id'])
            table_id = item.get('table_id')
            if table_id:
                occupied_fk_ids.add(table_id)

        occupied_m2m_ids = set()
        if booking_ids:
            occupied_m2m_ids = set(
                Booking.tables.through.objects.filter(
                    booking_id__in=booking_ids
                ).values_list('table_id', flat=True)
            )

        occupied_table_ids = occupied_fk_ids | occupied_m2m_ids

        # 2) Get all active, available tables for this restaurant
        available_tables = list(
            Table.objects.filter(restaurant=restaurant, is_active=True)
            .exclude(id__in=occupied_table_ids)
            .order_by("seats", "id")
        )

        if not available_tables:
            return []

        # 3. Handle preferred table
        if preferred_table_id:
            for t in available_tables:
                if str(t.id) == str(preferred_table_id):
                    if t.seats >= guests:
                        return [t]
                    # If preferred table is too small, we might still need others, 
                    # but usually preferred is for specific single tables.
                    break
            return [] # If preferred is taken or too small alone (for now)

        # 4. Try to find the best single table
        suitable_single = [t for t in available_tables if t.seats >= guests]
        if suitable_single:
            # Return the one with smallest sufficient capacity
            return [suitable_single[0]]

        # 5. Try to combine tables to minimize unused capacity.
        # Guests are capped at 20 (serializer), so a bounded DP is enough.
        total_capacity = sum(t.seats for t in available_tables)
        if total_capacity < guests:
            return []

        max_table_seats = max(t.seats for t in available_tables)
        max_sum = guests + max_table_seats

        best_for_sum = {0: []}
        for t in available_tables:
            for seat_sum, combo in list(best_for_sum.items()):
                new_sum = seat_sum + t.seats
                if new_sum > max_sum:
                    continue
                new_combo = combo + [t]
                existing = best_for_sum.get(new_sum)
                if existing is None or len(new_combo) < len(existing):
                    best_for_sum[new_sum] = new_combo

        best_combo = None
        best_sum = None
        for seat_sum, combo in best_for_sum.items():
            if seat_sum < guests:
                continue
            if best_sum is None:
                best_sum = seat_sum
                best_combo = combo
                continue
            if seat_sum < best_sum or (seat_sum == best_sum and len(combo) < len(best_combo)):
                best_sum = seat_sum
                best_combo = combo

        if best_combo:
            return best_combo

        # Fallback: greedy (should be rare)
        available_sorted = sorted(available_tables, key=lambda x: x.seats, reverse=True)
        combination = []
        running = 0
        for t in available_sorted:
            combination.append(t)
            running += t.seats
            if running >= guests:
                return combination

        return []

    @staticmethod
    def check_capacity(restaurant, date, start_time, guests, duration_minutes=90, exclude_booking_id=None):
        """
        Check if the restaurant has enough global capacity for a given slot.
        """
        start_dt = make_aware_if_needed(datetime.combine(date, start_time))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        qs = Booking.objects.filter(
            restaurant=restaurant,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt
        )
        if exclude_booking_id:
            qs = qs.exclude(id=exclude_booking_id)

        overlapping_guests = qs.aggregate(total=Sum("guests"))["total"] or 0

        # Include guests that are "NOTIFIED" from waitlist and have their slot reserved
        from .models import WaitlistEntry
        notified_waitlist_guests = WaitlistEntry.objects.filter(
            restaurant=restaurant,
            date=date,
            time=start_time,
            status=WaitlistEntry.NOTIFIED
        ).aggregate(Sum('guests'))['guests__sum'] or 0
        
        overlapping_guests += notified_waitlist_guests

        if restaurant.capacity and overlapping_guests + guests > restaurant.capacity:
            return False, restaurant.capacity - overlapping_guests
        return True, 0

    @staticmethod
    def get_available_slots(restaurant, date, guests, duration_minutes=90):
        day_of_week = date.weekday()
        try:
            hours = restaurant.operating_hours.get(day_of_week=day_of_week)
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
        current_dt = make_aware_if_needed(datetime.combine(date, start_t))
        
        if end_t <= start_t:
             close_dt = make_aware_if_needed(datetime.combine(date + timedelta(days=1), end_t))
        else:
             close_dt = make_aware_if_needed(datetime.combine(date, end_t))
             
        limit_dt = close_dt - timedelta(minutes=duration_minutes) 

        while current_dt <= limit_dt:
            slot_time = current_dt.time()
            tables = BookingService.find_best_tables(
                restaurant, date, slot_time, guests, duration_minutes
            )
            if tables:
                slots.append(slot_time.strftime("%H:%M"))
            
            current_dt += timedelta(minutes=30)
            
        return slots

    @staticmethod
    def get_available_table_ids(restaurant, date, start_time, duration_minutes=90, exclude_booking_id=None):
        """Returns a list of table IDs that are free at the given time."""
        if not BookingService.is_within_operating_hours(restaurant, date, start_time, duration_minutes):
            return []

        start_dt = make_aware_if_needed(datetime.combine(date, start_time))
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        overlapping_bookings = Booking.objects.filter(
            restaurant=restaurant,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lt=end_dt,
            end_datetime__gt=start_dt
        )

        if exclude_booking_id:
            overlapping_bookings = overlapping_bookings.exclude(id=exclude_booking_id)

        occupied_fk_ids = set(overlapping_bookings.exclude(table_id=None).values_list('table_id', flat=True))

        booking_ids = list(overlapping_bookings.values_list('id', flat=True))
        occupied_m2m_ids = set()
        if booking_ids:
            occupied_m2m_ids = set(
                Booking.tables.through.objects.filter(booking_id__in=booking_ids).values_list('table_id', flat=True)
            )

        occupied_table_ids = occupied_fk_ids | occupied_m2m_ids

        available_table_ids = Table.objects.filter(
            restaurant=restaurant,
            is_active=True
        ).exclude(id__in=occupied_table_ids).values_list('id', flat=True)

        return list(available_table_ids)

    @staticmethod
    def acquire_booking_lock(restaurant_id, date, time_val, duration_minutes=90, timeout=30):
        """
        Distributed lock for a reservation time range (prevents overlaps under concurrency).
        """
        import time as time_module
        start_dt = make_aware_if_needed(datetime.combine(date, time_val))
        end_dt = start_dt + timedelta(minutes=duration_minutes or 90)
        keys = BookingService._lock_keys_for_range(restaurant_id, start_dt, end_dt)

        # Retry for up to 5 seconds
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
    def release_booking_lock(restaurant_id, date, time_val, duration_minutes=90):
        start_dt = make_aware_if_needed(datetime.combine(date, time_val))
        end_dt = start_dt + timedelta(minutes=duration_minutes or 90)
        keys = BookingService._lock_keys_for_range(restaurant_id, start_dt, end_dt)
        for key in keys:
            cache.delete(key)

    @staticmethod
    def confirm_booking(booking_id, actor=None):
        """
        Confirms a pending booking. Re-checks capacity (including waitlisted).
        """
        from core.notifications import NotificationService
        from django.db import transaction

        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=booking_id)
            if booking.status != Booking.PENDING and booking.status != Booking.PAYMENT_PENDING:
                return None, f"Booking is in {booking.status} status, cannot confirm."

            # Use our unified capacity check
            is_ok, available = BookingService.check_capacity(
                booking.restaurant, 
                booking.date, 
                booking.time, 
                booking.guests, 
                booking.duration_minutes,
                exclude_booking_id=booking.id
            )

            if not is_ok:
                return None, f"Capacity exceeded. Available: {available}, Needed: {booking.guests}"

            booking.transition_to(Booking.CONFIRMED, actor=actor)
            NotificationService.notify_customer_booking_confirmed(booking)
            return booking, None

    @staticmethod
    def reject_booking(booking_id, actor=None):
        """
        Rejects a pending booking.
        """
        from core.notifications import NotificationService
        
        booking = Booking.objects.get(pk=booking_id)
        if booking.status != Booking.PENDING:
            return None, "Only pending bookings can be rejected."

        booking.transition_to(Booking.REJECTED, actor=actor)
        NotificationService.notify_customer_booking_rejected(booking)
        return booking, None


    @staticmethod
    def expire_stale_bookings(ttl_minutes=30):
        """Mark pending bookings older than TTL as expired."""
        cutoff = timezone.now() - timedelta(minutes=ttl_minutes)
        expired_count = Booking.objects.filter(
            status=Booking.PENDING,
            created_at__lt=cutoff
        ).update(status=Booking.EXPIRED)
        return expired_count

    @staticmethod
    def process_past_bookings():
        """
        Mark past approved bookings as 'COMPLETED' (if checked in) or 'NO_SHOW' (if not).
        Should be called by a cron job or background task.
        """
        now = timezone.now()
        # 1. Approved + Past end time + Checked in -> COMPLETED
        completed = Booking.objects.filter(
            status=Booking.CONFIRMED,
            end_datetime__lt=now,
            is_checked_in=True
        ).update(status=Booking.COMPLETED)

        # 2. Approved + Past end time + NOT Checked in -> NO_SHOW (with a grace period of 30 mins)
        cutoff = now - timedelta(minutes=30)
        no_shows = Booking.objects.filter(
            status=Booking.CONFIRMED,
            end_datetime__lt=cutoff,
            is_checked_in=False
        ).update(status=Booking.NO_SHOW)

        return {"completed": completed, "no_shows": no_shows}


class WaitlistService:
    @staticmethod
    def promote_next(restaurant, date, time_val):
        """
        Find the oldest 'waiting' entry for this slot and notify the user.
        Re-checks capacity before promoting to avoid notifying for a still-full slot.
        Returns the WaitlistEntry that was notified, or None.
        """
        from .models import WaitlistEntry
        from core.notifications import NotificationService

        entry = WaitlistEntry.objects.filter(
            restaurant=restaurant,
            date=date,
            time=time_val,
            status=WaitlistEntry.WAITING,
        ).order_by('created_at').first()

        if not entry:
            return None

        # Re-check capacity before promoting
        is_available, _ = BookingService.check_capacity(
            restaurant, date, time_val, entry.guests
        )
        if not is_available:
            return None

        entry.status = WaitlistEntry.NOTIFIED
        entry.notified_at = timezone.now()
        entry.save()

        NotificationService.notify_user(
            entry.user,
            "Место освободилось!",
            f"В ресторане {restaurant.name} освободился столик на {date} в {time_val}. "
            f"У вас есть 15 минут, чтобы подтвердить бронирование.",
            data={"type": "waitlist_promoted", "waitlist_id": entry.id},
        )
        return entry
