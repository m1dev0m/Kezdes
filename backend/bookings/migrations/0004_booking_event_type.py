
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0003_booking_special_requests'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='event_type',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
