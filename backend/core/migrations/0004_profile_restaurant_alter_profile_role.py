
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_pushtoken'),
        ('restaurants', '0009_restaurantrequest_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='restaurant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='staff_profiles', to='restaurants.restaurant'),
        ),
        migrations.AlterField(
            model_name='profile',
            name='role',
            field=models.CharField(choices=[('global_admin', 'Глобальный Админ'), ('restaurant_admin', 'Владелец Ресторана'), ('manager', 'Менеджер'), ('hostess', 'Хостес'), ('customer', 'Гость')], default='customer', max_length=20),
        ),
    ]
