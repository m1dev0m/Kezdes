
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0013_table_status'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='restaurant',
            name='closing_time',
        ),
        migrations.RemoveField(
            model_name='restaurant',
            name='opening_time',
        ),
        migrations.CreateModel(
            name='OpeningHours',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day_of_week', models.IntegerField(choices=[(0, 'Понедельник'), (1, 'Вторник'), (2, 'Среда'), (3, 'Четверг'), (4, 'Пятница'), (5, 'Суббота'), (6, 'Воскресенье')])),
                ('opening_time', models.TimeField()),
                ('closing_time', models.TimeField()),
                ('is_closed', models.BooleanField(default=False)),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='operating_hours', to='restaurants.restaurant')),
            ],
            options={
                'ordering': ['day_of_week'],
                'unique_together': {('restaurant', 'day_of_week')},
            },
        ),
    ]
