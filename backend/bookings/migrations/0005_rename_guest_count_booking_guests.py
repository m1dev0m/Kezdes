
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0004_booking_event_type'),
    ]

    operations = [
        migrations.RenameField(
            model_name='booking',
            old_name='guest_count',
            new_name='guests',
        ),
    ]
