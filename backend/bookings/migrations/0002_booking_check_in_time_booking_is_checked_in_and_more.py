
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='check_in_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='is_checked_in',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='BookingSecurity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('qr_code_data', models.CharField(max_length=255, unique=True)),
                ('is_valid', models.BooleanField(default=True)),
                ('booking', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='security', to='bookings.booking')),
            ],
        ),
    ]
