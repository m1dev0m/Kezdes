
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0004_restaurant_views_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='restaurant',
            name='closing_time',
            field=models.TimeField(blank=True, help_text='Время закрытия ресторана', null=True),
        ),
        migrations.AddField(
            model_name='restaurant',
            name='opening_time',
            field=models.TimeField(blank=True, help_text='Время открытия ресторана', null=True),
        ),
    ]
