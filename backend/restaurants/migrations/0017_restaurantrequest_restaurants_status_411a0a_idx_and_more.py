
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0016_table_restaurants_restaur_c2384e_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddIndex(
            model_name='restaurantrequest',
            index=models.Index(fields=['status', '-created_at'], name='restaurants_status_411a0a_idx'),
        ),
        migrations.AddIndex(
            model_name='restaurantrequest',
            index=models.Index(fields=['owner', 'status'], name='restaurants_owner_i_2ec596_idx'),
        ),
    ]
