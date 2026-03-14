
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0013_booking_bookings_bo_restaur_cf45c2_idx'),
        ('restaurants', '0017_restaurantrequest_restaurants_status_411a0a_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['restaurant', 'date', 'time', 'status'], name='bookings_bo_restaur_9ca38e_idx'),
        ),
        migrations.AddIndex(
            model_name='reservationhistory',
            index=models.Index(fields=['reservation', '-changed_at'], name='bookings_re_reserva_d60753_idx'),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(condition=models.Q(('guests__gte', 1)), name='booking_guests_gte_1'),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(condition=models.Q(('duration_hours__gte', 1)), name='booking_duration_gte_1'),
        ),
    ]
