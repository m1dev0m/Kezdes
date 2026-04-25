                                               

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0017_restaurantrequest_restaurants_status_411a0a_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='restaurant',
            name='deposit_amount_per_guest',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Сумма предоплаты за гостя', max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='restaurant',
            name='deposit_min_guests',
            field=models.PositiveIntegerField(blank=True, help_text='Мин. кол-во гостей для предоплаты', null=True),
        ),
        migrations.AddField(
            model_name='restaurant',
            name='reviews_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
