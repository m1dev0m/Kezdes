
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0012_alter_booking_user'),
        ('restaurants', '0016_table_restaurants_restaur_c2384e_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['restaurant', 'created_at'], name='bookings_bo_restaur_cf45c2_idx'),
        ),
    ]
