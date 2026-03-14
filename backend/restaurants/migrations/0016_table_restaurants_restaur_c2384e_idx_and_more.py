
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0015_alter_restaurant_latitude_alter_restaurant_longitude'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='table',
            index=models.Index(fields=['restaurant', 'status'], name='restaurants_restaur_c2384e_idx'),
        ),
        migrations.AddIndex(
            model_name='table',
            index=models.Index(fields=['restaurant', 'is_active'], name='restaurants_restaur_174289_idx'),
        ),
    ]
