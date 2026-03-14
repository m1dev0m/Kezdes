
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0006_restaurant_entrance_restaurant_extra_address_info_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='restaurant',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='restaurants/'),
        ),
    ]
