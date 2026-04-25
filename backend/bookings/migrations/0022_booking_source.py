                                               

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0021_remove_booking_unique_active_booking_per_slot_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='source',
            field=models.CharField(choices=[('web', 'Web'), ('telegram', 'Telegram'), ('admin', 'Admin'), ('phone', 'Phone')], default='web', max_length=20),
        ),
    ]
