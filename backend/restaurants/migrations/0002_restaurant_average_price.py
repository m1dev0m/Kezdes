
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='restaurant',
            name='average_price',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
