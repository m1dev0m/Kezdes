
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0007_booking_duration_hours_alter_booking_status_and_more'),
        ('restaurants', '0006_restaurant_entrance_restaurant_extra_address_info_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='budget',
            field=models.PositiveIntegerField(blank=True, help_text='Примерный бюджет события', null=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='pay_at_restaurant',
            field=models.BooleanField(default=False, help_text='Оплатить в ресторане'),
        ),
        migrations.AlterField(
            model_name='booking',
            name='status',
            field=models.CharField(choices=[('pending', 'Ожидает подтверждения'), ('approved', 'Подтверждено'), ('rejected', 'Отклонено'), ('cancelled_by_user', 'Отменено пользователем'), ('cancelled_by_restaurant', 'Отменено рестораном'), ('expired', 'Истекло'), ('completed', 'Завершено'), ('no_show', 'Неявка')], default='pending', max_length=30),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.UniqueConstraint(condition=models.Q(('status__in', ['pending', 'approved'])), fields=('user', 'restaurant', 'date', 'time'), name='unique_active_booking_per_slot'),
        ),
    ]
