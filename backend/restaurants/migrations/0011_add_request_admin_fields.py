
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0010_table_height_table_rotation_table_table_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='restaurantrequest',
            name='address',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='restaurantrequest',
            name='admin_password',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='restaurantrequest',
            name='admin_username',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name='restaurantrequest',
            name='owner_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
