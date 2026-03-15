from __future__ import annotations

import random
import statistics
import string
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date, datetime, time as dtime, timedelta
from typing import Any

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import close_old_connections
from django.db import models
from django.db import connection
from django.db.utils import OperationalError
from django.utils import timezone
from rest_framework.test import APIClient

from bookings.models import Booking
from restaurants.models import Restaurant, Table


def _rand_phone(i: int) -> str:
    return f"+7700{(1000000 + i):07d}"  # +7700XXXXXXX


def _rand_name() -> str:
    first = ["Aruzhan", "Aigerim", "Dana", "Madi", "Dias", "Arman", "Serik", "Nurlan", "Alina", "Timur"]
    last = ["S.", "K.", "T.", "A.", "N.", "D."]
    return f"{random.choice(first)} {random.choice(last)}"


def _rand_username(prefix: str, i: int) -> str:
    salt = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{prefix}_{i}_{salt}"


def _ceil_dt_to_quarter(dt: datetime) -> datetime:
    minute = (dt.minute + 14) // 15 * 15
    if minute == 60:
        dt = dt.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    else:
        dt = dt.replace(minute=minute, second=0, microsecond=0)
    return dt


def _pick_time_slots(base_date: date, count: int) -> list[dtime]:
    """Create a set of intentionally overlapping slots."""
    start = datetime.combine(base_date, dtime(18, 0))
    slots: list[dtime] = []
    for _ in range(count):
        # heavily bias to overlapping: 18:00-20:00
        minutes = random.choice([0, 15, 30, 45, 60, 75, 90, 105, 120])
        dt = _ceil_dt_to_quarter(start + timedelta(minutes=minutes))
        slots.append(dt.time())
    return slots


def _booking_start_end(b: Booking) -> tuple[datetime, datetime]:
    start_dt = b.start_datetime
    if start_dt is None:
        start_dt = datetime.combine(b.date, b.time)
        if timezone.is_naive(start_dt):
            start_dt = timezone.make_aware(start_dt)
    end_dt = b.end_datetime
    if end_dt is None:
        end_dt = start_dt + timedelta(minutes=b.duration_minutes or 90)
    return start_dt, end_dt


@dataclass
class RequestResult:
    ok: bool
    status_code: int
    duration_ms: float
    error: str | None = None
    booking_id: int | None = None


class Command(BaseCommand):
    help = "In-process load test for reservations: seed restaurants/tables/guests and simulate concurrent booking requests."

    def add_arguments(self, parser):
        parser.add_argument("--restaurants", type=int, default=10)
        parser.add_argument("--tables-min", type=int, default=5)
        parser.add_argument("--tables-max", type=int, default=15)
        parser.add_argument("--guests", type=int, default=100)
        parser.add_argument("--requests", type=int, default=40)
        parser.add_argument("--concurrency", type=int, default=10)
        parser.add_argument("--arrival-window-seconds", type=float, default=5.0)
        parser.add_argument("--date", type=str, default=None, help="YYYY-MM-DD (default: tomorrow)")
        parser.add_argument(
            "--report-file",
            type=str,
            default=None,
            help="Write the full report to a file path (prevents truncated stdout).",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete previously seeded load-test entities (by name prefix) before seeding.",
        )

    def handle(self, *args, **options):
        original_allowed_hosts = list(getattr(settings, "ALLOWED_HOSTS", []))
        try:
            if "*" not in original_allowed_hosts:
                settings.ALLOWED_HOSTS = list(dict.fromkeys(original_allowed_hosts + ["testserver", "localhost", "127.0.0.1"]))

            restaurants_n: int = options["restaurants"]
            tables_min: int = options["tables_min"]
            tables_max: int = options["tables_max"]
            guests_n: int = options["guests"]
            requests_n: int = options["requests"]
            concurrency: int = options["concurrency"]
            arrival_window_seconds: float = options["arrival_window_seconds"]
            reset: bool = options["reset"]

            if restaurants_n <= 0:
                raise ValueError("--restaurants must be > 0")
            if tables_min <= 0 or tables_max < tables_min:
                raise ValueError("Invalid --tables-min/--tables-max")
            if guests_n <= 0:
                raise ValueError("--guests must be > 0")
            if requests_n <= 0:
                raise ValueError("--requests must be > 0")
            if concurrency <= 0:
                raise ValueError("--concurrency must be > 0")

            if options.get("date"):
                base_date = datetime.strptime(options["date"], "%Y-%m-%d").date()
            else:
                base_date = timezone.localdate() + timedelta(days=1)

            prefix = "LOADTEST"

            if reset:
                self._reset(prefix)

            self.stdout.write(self.style.NOTICE("[1/4] Seeding restaurants/tables/guests..."))
            restaurants = self._seed_restaurants(prefix, restaurants_n)
            tables_by_restaurant = self._seed_tables(prefix, restaurants, tables_min, tables_max)
            guests = self._seed_guests(prefix, guests_n)

            # Precompute target slots to force overlaps
            slots = _pick_time_slots(base_date, requests_n)

            self.stdout.write(self.style.NOTICE("[2/4] Running concurrent reservation traffic simulation..."))
            results = self._run_traffic(
                base_date=base_date,
                slots=slots,
                restaurants=restaurants,
                tables_by_restaurant=tables_by_restaurant,
                guests=guests,
                requests_n=requests_n,
                concurrency=concurrency,
                arrival_window_seconds=arrival_window_seconds,
            )

            self.stdout.write(self.style.NOTICE("[3/4] Validating core invariants (no overlaps / capacity / duplicates)..."))
            validation_errors = self._validate_invariants(restaurants, base_date)

            self.stdout.write(self.style.NOTICE("[4/4] Report"))
            report_file: str | None = options.get("report_file")
            self._print_report(
                results,
                validation_errors,
                restaurants=len(restaurants),
                tables=sum(len(v) for v in tables_by_restaurant.values()),
                guests=len(guests),
                report_file=report_file,
            )

            if validation_errors:
                raise SystemExit(2)

        finally:
            settings.ALLOWED_HOSTS = original_allowed_hosts

    def _reset(self, prefix: str) -> None:
        restaurants_qs = Restaurant.objects.filter(name__startswith=f"{prefix} ")
        restaurant_ids = list(restaurants_qs.values_list("id", flat=True))
        if restaurant_ids:
            # Delete dependent bookings first
            Booking.objects.filter(restaurant_id__in=restaurant_ids).delete()
            # Delete tables
            Table.objects.filter(restaurant_id__in=restaurant_ids).delete()
            # Detach owner->restaurant relation (profile) if present
            owners = User.objects.filter(owned_restaurant__id__in=restaurant_ids)
            for u in owners:
                if hasattr(u, "profile") and getattr(u.profile, "restaurant_id", None) in restaurant_ids:
                    u.profile.restaurant_id = None
                    u.profile.save(update_fields=["restaurant"])
            restaurants_qs.delete()

        User.objects.filter(username__startswith=f"{prefix.lower()}_").delete()

    def _seed_restaurants(self, prefix: str, n: int) -> list[Restaurant]:
        restaurants: list[Restaurant] = []
        for i in range(n):
            owner = User.objects.create_user(
                username=_rand_username(prefix.lower() + "_owner", i),
                email=f"{prefix.lower()}_owner_{i}@test.local",
                password="pass1234",
            )
            if hasattr(owner, "profile"):
                owner.profile.role = "restaurant_admin"
                owner.profile.save()

            r = Restaurant.objects.create(
                name=f"{prefix} Restaurant {i+1}",
                address=f"{prefix} Address {i+1}",
                city=random.choice(["Almaty", "Astana", "Shymkent"]),
                is_verified=True,
                is_claimed=True,
                owner=owner,
                capacity=random.choice([20, 30, 40, 50, 60]),
            )
            if hasattr(owner, "profile"):
                owner.profile.restaurant = r
                owner.profile.save(update_fields=["restaurant"])

            restaurants.append(r)
        return restaurants

    def _seed_tables(
        self,
        prefix: str,
        restaurants: list[Restaurant],
        tables_min: int,
        tables_max: int,
    ) -> dict[int, list[Table]]:
        out: dict[int, list[Table]] = {}
        for r in restaurants:
            count = random.randint(tables_min, tables_max)
            tables: list[Table] = []
            for i in range(count):
                tables.append(
                    Table.objects.create(
                        restaurant=r,
                        number=f"{prefix[:4]}-{r.id}-{i+1}",
                        seats=random.choice([2, 2, 4, 4, 6, 8]),
                        is_active=True,
                        status="free",
                        x=float(random.randint(0, 500)),
                        y=float(random.randint(0, 500)),
                    )
                )
            out[r.id] = tables
        return out

    def _seed_guests(self, prefix: str, n: int) -> list[User]:
        guests: list[User] = []
        for i in range(n):
            u = User.objects.create_user(
                username=_rand_username(prefix.lower() + "_guest", i),
                email=f"{prefix.lower()}_guest_{i}@test.local",
                password="pass1234",
            )
            if hasattr(u, "profile"):
                u.profile.role = "customer"
                u.profile.phone = _rand_phone(i)
                u.profile.save()
            guests.append(u)
        return guests

    def _run_traffic(
        self,
        *,
        base_date: date,
        slots: list[dtime],
        restaurants: list[Restaurant],
        tables_by_restaurant: dict[int, list[Table]],
        guests: list[User],
        requests_n: int,
        concurrency: int,
        arrival_window_seconds: float,
    ) -> list[RequestResult]:
        # Pre-generate request payloads
        payloads: list[dict[str, Any]] = []
        for i in range(requests_n):
            r = random.choice(restaurants)
            slot = slots[i]
            guest = random.choice(guests)
            guest_count = random.randint(1, 8)

            # Randomly try to force specific table selection ~50% of the time
            table_id = None
            if random.random() < 0.5:
                table_id = random.choice(tables_by_restaurant[r.id]).id

            payload: dict[str, Any] = {
                "restaurant": r.id,
                "date": base_date.strftime("%Y-%m-%d"),
                "time": slot.strftime("%H:%M"),
                "guests": guest_count,
                "user_name": _rand_name(),
                "user_phone": _rand_phone(1000 + i),
            }
            if table_id is not None:
                payload["table_id"] = table_id

            payloads.append({"user": guest, "payload": payload})

        def worker(item: dict[str, Any]) -> RequestResult:
            close_old_connections()
            try:
                if connection.vendor == "sqlite":
                    with connection.cursor() as cursor:
                        cursor.execute("PRAGMA busy_timeout = 5000")
                        cursor.execute("PRAGMA journal_mode = WAL")
            except Exception:
                pass
            user: User = item["user"]
            payload: dict[str, Any] = item["payload"]

            if arrival_window_seconds > 0:
                time.sleep(random.random() * arrival_window_seconds)

            client = APIClient()
            client.force_authenticate(user=user)

            start = time.perf_counter()
            try:
                last_exc: Exception | None = None
                for attempt in range(3):
                    try:
                        resp = client.post("/api/v1/bookings/", payload, format="json")
                        dur_ms = (time.perf_counter() - start) * 1000.0
                        if 200 <= resp.status_code < 300:
                            return RequestResult(ok=True, status_code=resp.status_code, duration_ms=dur_ms, booking_id=resp.data.get("id"))
                        return RequestResult(
                            ok=False,
                            status_code=resp.status_code,
                            duration_ms=dur_ms,
                            error=str(getattr(resp, "data", None) or resp.content),
                        )
                    except OperationalError as e:
                        last_exc = e
                        if "database is locked" not in str(e).lower():
                            raise
                        time.sleep(0.05 * (2**attempt) + random.random() * 0.05)
                dur_ms = (time.perf_counter() - start) * 1000.0
                return RequestResult(ok=False, status_code=0, duration_ms=dur_ms, error=repr(last_exc) if last_exc else "OperationalError")
            except Exception as e:
                dur_ms = (time.perf_counter() - start) * 1000.0
                return RequestResult(ok=False, status_code=0, duration_ms=dur_ms, error=repr(e))
            finally:
                close_old_connections()

        results: list[RequestResult] = []
        with ThreadPoolExecutor(max_workers=concurrency) as ex:
            futures = [ex.submit(worker, item) for item in payloads]
            for f in as_completed(futures):
                results.append(f.result())
        return results

    def _validate_invariants(self, restaurants: list[Restaurant], base_date: date) -> list[str]:
        errors: list[str] = []

        qs = (
            Booking.objects.filter(
                restaurant__in=restaurants,
                date=base_date,
            )
            .select_related("restaurant", "table")
            .prefetch_related("tables")
        )

        active = list(qs.filter(status__in=Booking.ACTIVE_STATUSES))

        # A) No overlaps per physical table across ACTIVE_STATUSES
        per_table: dict[int, list[Booking]] = {}
        for b in active:
            ids = set()
            if b.table_id:
                ids.add(b.table_id)
            for t in b.tables.all():
                ids.add(t.id)
            for tid in ids:
                per_table.setdefault(tid, []).append(b)

        for tid, bookings in per_table.items():
            bookings_sorted = sorted(bookings, key=lambda x: _booking_start_end(x)[0])
            prev_end: datetime | None = None
            prev_id: int | None = None
            for b in bookings_sorted:
                start_dt, end_dt = _booking_start_end(b)
                if prev_end and start_dt < prev_end:
                    errors.append(
                        f"OVERLAP: table_id={tid} booking={prev_id} overlaps booking={b.id} ({prev_end.isoformat()} > {start_dt.isoformat()})"
                    )
                    break
                prev_end = end_dt
                prev_id = b.id

        # B) Capacity respected (sum guests for overlapping in slot should not exceed restaurant.capacity)
        #    We validate this in a coarse way: for each active booking window, sum guests overlapping.
        for r in restaurants:
            if not r.capacity:
                continue
            r_bookings = [b for b in active if b.restaurant_id == r.id]
            for b in r_bookings:
                start_dt, end_dt = _booking_start_end(b)
                overlapping = [
                    x for x in r_bookings
                    if _booking_start_end(x)[0] < end_dt and _booking_start_end(x)[1] > start_dt
                ]
                total_guests = sum(int(x.guests or 0) for x in overlapping)
                if total_guests > r.capacity:
                    errors.append(
                        f"CAPACITY: restaurant_id={r.id} capacity={r.capacity} exceeded with {total_guests} guests (booking_id={b.id})"
                    )
                    break

        # C) No duplicate active booking per (user, restaurant, date, time)
        dups = (
            Booking.objects.filter(
                restaurant__in=restaurants,
                date=base_date,
                status__in=Booking.ACTIVE_STATUSES,
                user__isnull=False,
            )
            .values("user_id", "restaurant_id", "date", "time")
            .annotate(cnt=models.Count("id"))
            .filter(cnt__gt=1)
        )
        for row in dups:
            errors.append(
                "DUPLICATE_ACTIVE: "
                f"user_id={row['user_id']} restaurant_id={row['restaurant_id']} date={row['date']} time={row['time']} cnt={row['cnt']}"
            )

        return errors

    def _print_report(
        self,
        results: list[RequestResult],
        validation_errors: list[str],
        *,
        restaurants: int,
        tables: int,
        guests: int,
        report_file: str | None,
    ) -> None:
        ok = [r for r in results if r.ok]
        failed = [r for r in results if not r.ok]

        codes: dict[int, int] = {}
        for r in results:
            codes[r.status_code] = codes.get(r.status_code, 0) + 1

        latencies = [r.duration_ms for r in results]
        latencies_sorted = sorted(latencies)

        def pct(p: float) -> float:
            if not latencies_sorted:
                return 0.0
            idx = int(round((p / 100.0) * (len(latencies_sorted) - 1)))
            return latencies_sorted[max(0, min(idx, len(latencies_sorted) - 1))]

        lines: list[str] = []
        lines.append(f"Seeded: restaurants={restaurants} tables={tables} guests={guests}")
        lines.append(f"Requests: {len(results)}")
        lines.append(f"Successful: {len(ok)}")
        lines.append(f"Failed: {len(failed)}")
        lines.append(f"Status codes: {dict(sorted(codes.items(), key=lambda kv: kv[0]))}")
        lines.append("")

        if latencies:
            lines.append("Latency (ms):")
            lines.append(f"  min={min(latencies):.1f}")
            lines.append(f"  avg={statistics.mean(latencies):.1f}")
            lines.append(f"  p50={pct(50):.1f}")
            lines.append(f"  p95={pct(95):.1f}")
            lines.append(f"  max={max(latencies):.1f}")

        if failed:
            sample = failed[:5]
            lines.append("")
            lines.append("Sample errors (up to 5):")
            for r in sample:
                lines.append(f"  status={r.status_code} err={r.error}")

        if validation_errors:
            lines.append("")
            lines.append("VALIDATION FAILURES:")
            for e in validation_errors[:20]:
                lines.append(f"  {e}")
            if len(validation_errors) > 20:
                lines.append(f"  ... ({len(validation_errors) - 20} more)")
        else:
            lines.append("")
            lines.append("Validation: OK (no overlaps/capacity/duplicate-active detected)")

        report = "\n".join(lines) + "\n"
        if report_file:
            with open(report_file, "w", encoding="utf-8") as f:
                f.write(report)
            self.stdout.write(self.style.SUCCESS(f"Report written to: {report_file}"))
            self.stdout.write(self.style.SUCCESS(lines[-1]))
            return

        self.stdout.write(report)
