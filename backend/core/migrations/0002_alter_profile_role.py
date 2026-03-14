
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='role',
            field=models.CharField(choices=[('organizer', 'Организатор'), ('worker', 'Работник'), ('restaurant_admin', 'Админ ресторана')], default='organizer', max_length=20),
        ),
    ]
