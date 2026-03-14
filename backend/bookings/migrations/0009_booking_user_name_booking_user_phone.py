
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0008_booking_budget_booking_pay_at_restaurant_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='user_name',
            field=models.CharField(blank=True, help_text='Имя клиента (для ручного ввода)', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='user_phone',
            field=models.CharField(blank=True, help_text='Телефон клиента (для ручного ввода)', max_length=50, null=True),
        ),
    ]
