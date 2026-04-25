                                               

import uuid

import bookings.models
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def backfill_waitlist_public_tokens(apps, schema_editor):
    WaitlistEntry = apps.get_model('bookings', 'WaitlistEntry')
    for entry in WaitlistEntry.objects.filter(public_token__isnull=True).only('id'):
        entry.public_token = uuid.uuid4().hex
        entry.save(update_fields=['public_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0026_booking_public_token'),
        ('restaurants', '0026_restaurant_birthday_service_available_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='waitlistentry',
            name='unique_active_waitlist_per_slot',
        ),
        migrations.AddField(
            model_name='waitlistentry',
            name='guest_email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='waitlistentry',
            name='guest_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='waitlistentry',
            name='guest_phone',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='waitlistentry',
            name='public_token',
            field=models.CharField(blank=True, editable=False, max_length=32, null=True),
        ),
        migrations.AlterField(
            model_name='waitlistentry',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='waitlist_entries', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(backfill_waitlist_public_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='waitlistentry',
            name='public_token',
            field=models.CharField(db_index=True, default=bookings.models.generate_waitlist_public_token, editable=False, max_length=32, unique=True),
        ),
        migrations.AddConstraint(
            model_name='waitlistentry',
            constraint=models.UniqueConstraint(condition=models.Q(('status__in', ['waiting', 'notified']), ('user__isnull', False)), fields=('user', 'restaurant', 'date', 'time'), name='unique_active_waitlist_per_slot_user'),
        ),
        migrations.AddConstraint(
            model_name='waitlistentry',
            constraint=models.UniqueConstraint(condition=models.Q(('status__in', ['waiting', 'notified']), ('user__isnull', True)), fields=('guest_phone', 'restaurant', 'date', 'time'), name='unique_active_waitlist_per_slot_guest_phone'),
        ),
    ]
