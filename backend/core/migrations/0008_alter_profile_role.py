                                               

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_alter_profile_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='role',
            field=models.CharField(choices=[('global_admin', 'Глобальный Админ'), ('owner', 'Владелец'), ('manager', 'Менеджер'), ('host', 'Хостес'), ('customer', 'Гость')], default='customer', max_length=20),
        ),
    ]
