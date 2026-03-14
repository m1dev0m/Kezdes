
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_profile_phone'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='role',
            field=models.CharField(choices=[('global_admin', 'Глобальный Админ'), ('restaurant_admin', 'Владелец Ресторана'), ('organizer', 'Организатор'), ('worker', 'Сотрудник'), ('manager', 'Менеджер'), ('hostess', 'Хостес'), ('customer', 'Гость')], default='customer', max_length=20),
        ),
    ]
