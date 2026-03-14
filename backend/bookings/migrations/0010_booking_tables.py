
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0009_booking_user_name_booking_user_phone'),
        ('restaurants', '0010_table_height_table_rotation_table_table_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='tables',
            field=models.ManyToManyField(blank=True, related_name='bookings', to='restaurants.table'),
        ),
    ]
