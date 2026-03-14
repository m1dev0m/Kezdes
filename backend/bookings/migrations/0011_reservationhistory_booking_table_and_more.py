
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0010_booking_tables'),
        ('restaurants', '0012_restaurant_city_restaurant_status_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReservationHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(max_length=30)),
                ('changed_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-changed_at'],
            },
        ),
        migrations.AddField(
            model_name='booking',
            name='table',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bookings', to='restaurants.table'),
        ),
        migrations.AlterField(
            model_name='booking',
            name='tables',
            field=models.ManyToManyField(blank=True, related_name='legacy_bookings', to='restaurants.table'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['table', 'date', 'time'], name='bookings_bo_table_i_40c721_idx'),
        ),
        migrations.AddField(
            model_name='reservationhistory',
            name='reservation',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='history', to='bookings.booking'),
        ),
    ]
