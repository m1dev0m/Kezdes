
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_booking_check_in_time_booking_is_checked_in_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='special_requests',
            field=models.TextField(blank=True, null=True),
        ),
    ]
