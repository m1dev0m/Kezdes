
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0011_add_request_admin_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='restaurant',
            name='city',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='restaurant',
            name='status',
            field=models.CharField(default='active', max_length=50),
        ),
        migrations.AddField(
            model_name='restaurantrequest',
            name='owner',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='table',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
    ]
