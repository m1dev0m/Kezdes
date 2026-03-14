
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_profile_restaurant_alter_profile_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='phone',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
    ]
