
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contractors', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='contractor',
            name='pricing_info',
            field=models.TextField(blank=True, help_text='Дополнительная информация о стоимости'),
        ),
        migrations.AddField(
            model_name='contractor',
            name='user',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='contractor_profile', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='contractor',
            name='category',
            field=models.CharField(choices=[('photographer', 'Фотограф'), ('videographer', 'Видеограф'), ('host', 'Ведущий (Тамада)'), ('music', 'Музыка'), ('decorator', 'Декоратор'), ('catering', 'Кейтеринг')], max_length=50),
        ),
        migrations.AlterField(
            model_name='contractor',
            name='description',
            field=models.TextField(blank=True, help_text='Расскажите о себе'),
        ),
    ]
