
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0005_rename_guest_count_booking_guests'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='event_title',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
