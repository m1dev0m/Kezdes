
import bookings.models
import django.contrib.postgres.constraints
from django.conf import settings
from django.db import migrations, models


def add_exclusion_constraint(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    Booking = apps.get_model("bookings", "Booking")
    constraint = django.contrib.postgres.constraints.ExclusionConstraint(
        name="exclude_overlapping_bookings",
        condition=models.Q(("status__in", ["pending", "approved"])),
        expressions=[
            (bookings.models.TsRange("start_datetime", "end_datetime"), "&&"),
            ("table", "="),
        ],
    )
    schema_editor.add_constraint(Booking, constraint)


def remove_exclusion_constraint(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    Booking = apps.get_model("bookings", "Booking")
    constraint = django.contrib.postgres.constraints.ExclusionConstraint(
        name="exclude_overlapping_bookings",
        condition=models.Q(("status__in", ["pending", "approved"])),
        expressions=[
            (bookings.models.TsRange("start_datetime", "end_datetime"), "&&"),
            ("table", "="),
        ],
    )
    schema_editor.remove_constraint(Booking, constraint)


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0015_install_btree_gist'),
        ('restaurants', '0017_restaurantrequest_restaurants_status_411a0a_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='booking',
            name='booking_duration_gte_1',
        ),
        migrations.AddField(
            model_name='booking',
            name='duration_minutes',
            field=models.PositiveIntegerField(default=90, help_text='Длительность бронирования в минутах'),
        ),
        migrations.AddField(
            model_name='booking',
            name='end_datetime',
            field=models.DateTimeField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='start_datetime',
            field=models.DateTimeField(blank=True, editable=False, null=True),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(condition=models.Q(('duration_minutes__gte', 15)), name='booking_duration_min_15'),
        ),
        migrations.RemoveField(
            model_name='booking',
            name='duration_hours',
        ),
    ]
