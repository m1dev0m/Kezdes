                                    

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0012_restaurant_city_restaurant_status_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('bookings', '0018_booking_deposit_required_booking_guest_email_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='reservationhistory',
            name='event_type',
            field=models.CharField(default='status_change', max_length=50),
        ),
        migrations.AddField(
            model_name='reservationhistory',
            name='actor',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='booking_events', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='reservationhistory',
            name='from_status',
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
        migrations.AddField(
            model_name='reservationhistory',
            name='to_status',
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
        migrations.AddField(
            model_name='reservationhistory',
            name='from_table',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='booking_events_from', to='restaurants.table'),
        ),
        migrations.AddField(
            model_name='reservationhistory',
            name='to_table',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='booking_events_to', to='restaurants.table'),
        ),
    ]
