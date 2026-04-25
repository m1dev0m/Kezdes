                                               

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0024_booking_booking_duration_max_480_and_more'),
        ('restaurants', '0026_restaurant_birthday_service_available_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='booking',
            name='unique_active_booking_per_slot',
        ),
        migrations.AddField(
            model_name='booking',
            name='shift',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='restaurants.shift'),
        ),
        migrations.AddField(
            model_name='booking',
            name='source',
            field=models.CharField(choices=[('web', 'Web'), ('telegram', 'Telegram'), ('phone', 'Phone'), ('admin', 'Admin'), ('walk_in', 'Walk-in')], default='web', max_length=20),
        ),
        migrations.AddField(
            model_name='reservationhistory',
            name='action',
            field=models.CharField(choices=[('created', 'Created'), ('confirmed', 'Confirmed'), ('seated', 'Seated'), ('completed', 'Completed'), ('cancelled', 'Cancelled'), ('no_show', 'No Show'), ('table_assigned', 'Table Assigned'), ('notes_updated', 'Notes Updated')], default='status_change', max_length=30),
        ),
        migrations.AddField(
            model_name='reservationhistory',
            name='actor_label',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='reservationhistory',
            name='payload',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['status', 'created_at'], name='bookings_bo_status_72dd85_idx'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['start_datetime', 'end_datetime'], name='bookings_bo_start_d_8008ab_idx'),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.UniqueConstraint(condition=models.Q(('status__in', ['pending', 'confirmed', 'payment_pending', 'seated'])), fields=('user', 'restaurant', 'date', 'time'), name='unique_active_booking_per_slot'),
        ),
    ]
