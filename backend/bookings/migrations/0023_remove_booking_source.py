                                    

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0022_booking_source"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="booking",
            name="source",
        ),
    ]

