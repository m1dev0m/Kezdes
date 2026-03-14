
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0009_restaurantrequest_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='table',
            name='height',
            field=models.FloatField(default=60.0, help_text='Height in pixels'),
        ),
        migrations.AddField(
            model_name='table',
            name='rotation',
            field=models.FloatField(default=0.0, help_text='Rotation in degrees'),
        ),
        migrations.AddField(
            model_name='table',
            name='table_type',
            field=models.CharField(choices=[('rectangle', 'Прямоугольный'), ('circle', 'Круглый'), ('square', 'Квадратный')], default='rectangle', max_length=20),
        ),
        migrations.AddField(
            model_name='table',
            name='width',
            field=models.FloatField(default=60.0, help_text='Width in pixels'),
        ),
        migrations.AddField(
            model_name='table',
            name='x',
            field=models.FloatField(default=0.0, help_text='X position in floor plan'),
        ),
        migrations.AddField(
            model_name='table',
            name='y',
            field=models.FloatField(default=0.0, help_text='Y position in floor plan'),
        ),
    ]
