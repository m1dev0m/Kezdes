
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_alter_profile_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='role',
            field=models.CharField(choices=[('global_admin', 'Глобальный Админ'), ('restaurant_admin', 'Владелец Ресторана'), ('restaurant_owner', 'Владелец Ресторана'), ('organizer', 'Организатор'), ('worker', 'Сотрудник'), ('manager', 'Менеджер'), ('hostess', 'Хостес'), ('customer', 'Гость')], default='customer', max_length=20),
        ),
    ]
