
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0012_restaurant_city_restaurant_status_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='table',
            name='status',
            field=models.CharField(choices=[('free', 'Свободен'), ('reserved', 'Забронирован'), ('occupied', 'Занят'), ('cleaning', 'Уборка')], default='free', max_length=20),
        ),
    ]
