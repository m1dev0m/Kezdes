
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0014_remove_restaurant_closing_time_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='restaurant',
            name='latitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='restaurant',
            name='longitude',
            field=models.FloatField(blank=True, null=True),
        ),
    ]
