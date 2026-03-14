
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0003_alter_restaurant_owner'),
    ]

    operations = [
        migrations.AddField(
            model_name='restaurant',
            name='views_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
