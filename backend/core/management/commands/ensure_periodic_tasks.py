import json

from django.core.management.base import BaseCommand
from django_celery_beat.models import IntervalSchedule, PeriodicTask


TASK_DEFINITIONS = (
    {
        "name": "Expire stale bookings",
        "task": "bookings.tasks.expire_stale_bookings",
        "every": 5,
        "period": IntervalSchedule.MINUTES,
        "kwargs": {"ttl_minutes": 30},
    },
    {
        "name": "Expire stale waitlist entries",
        "task": "bookings.tasks.expire_stale_waitlist_entries",
        "every": 5,
        "period": IntervalSchedule.MINUTES,
        "kwargs": {"ttl_minutes": 15},
    },
    {
        "name": "Auto mark no-shows",
        "task": "bookings.tasks.auto_mark_no_shows",
        "every": 10,
        "period": IntervalSchedule.MINUTES,
        "kwargs": {"grace_minutes": 20},
    },
)


class Command(BaseCommand):
    help = "Ensure required Celery beat periodic tasks exist for production/runtime automation."

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for definition in TASK_DEFINITIONS:
            schedule, _ = IntervalSchedule.objects.get_or_create(
                every=definition["every"],
                period=definition["period"],
            )
            _, task_created = PeriodicTask.objects.update_or_create(
                name=definition["name"],
                defaults={
                    "task": definition["task"],
                    "interval": schedule,
                    "enabled": True,
                    "kwargs": json.dumps(definition["kwargs"], sort_keys=True),
                },
            )
            if task_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Periodic tasks ensured: created={created}, updated={updated}, total={len(TASK_DEFINITIONS)}"
            )
        )
