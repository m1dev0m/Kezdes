                                               

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0016_remove_booking_booking_duration_gte_1_and_more'),
        ('restaurants', '0017_restaurantrequest_restaurants_status_411a0a_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='WaitlistEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('time', models.TimeField()),
                ('guests', models.PositiveIntegerField(default=2)),
                ('status', models.CharField(choices=[('waiting', 'В очереди'), ('notified', 'Уведомлён'), ('promoted', 'Бронь создана'), ('expired', 'Истекло'), ('cancelled', 'Отменено')], default='waiting', max_length=20)),
                ('notified_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('promoted_booking', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='waitlist_source', to='bookings.booking')),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='waitlist_entries', to='restaurants.restaurant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='waitlist_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['created_at'],
                'indexes': [models.Index(fields=['restaurant', 'date', 'time', 'status'], name='bookings_wa_restaur_99f1e9_idx'), models.Index(fields=['user', 'status'], name='bookings_wa_user_id_6dff6f_idx')],
                'constraints': [models.UniqueConstraint(condition=models.Q(('status__in', ['waiting', 'notified'])), fields=('user', 'restaurant', 'date', 'time'), name='unique_active_waitlist_per_slot')],
            },
        ),
    ]
