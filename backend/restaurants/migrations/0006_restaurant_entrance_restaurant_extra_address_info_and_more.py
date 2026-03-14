
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0005_restaurant_closing_time_restaurant_opening_time'),
    ]

    operations = [
        migrations.AddField(
            model_name='restaurant',
            name='entrance',
            field=models.CharField(blank=True, help_text='Вход/подъезд', max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='restaurant',
            name='extra_address_info',
            field=models.TextField(blank=True, help_text='Дополнительная информация (напр. код домофона)', null=True),
        ),
        migrations.AddField(
            model_name='restaurant',
            name='floor',
            field=models.CharField(blank=True, help_text='Этаж', max_length=50, null=True),
        ),
    ]
