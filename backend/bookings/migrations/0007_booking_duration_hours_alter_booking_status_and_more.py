
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0006_booking_event_title'),
        ('restaurants', '0005_restaurant_closing_time_restaurant_opening_time'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='duration_hours',
            field=models.PositiveIntegerField(default=2),
        ),
        migrations.AlterField(
            model_name='booking',
            name='status',
            field=models.CharField(choices=[('pending', 'Ожидает подтверждения'), ('confirmed', 'Подтверждено'), ('rejected', 'Отклонено'), ('cancelled', 'Отменено'), ('expired', 'Истекло')], default='pending', max_length=20),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['restaurant', 'date', 'status'], name='bookings_bo_restaur_2a9cbd_idx'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['user', 'status'], name='bookings_bo_user_id_69a5d5_idx'),
        ),
    ]
