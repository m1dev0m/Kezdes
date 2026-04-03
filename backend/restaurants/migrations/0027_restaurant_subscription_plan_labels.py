from django.db import migrations, models


def forwards(apps, schema_editor):
    Restaurant = apps.get_model('restaurants', 'Restaurant')
    mapping = {
        'starter': 'none',
        'pro': 'plus',
        'business': 'pro',
    }
    for old_value, new_value in mapping.items():
        Restaurant.objects.filter(plan=old_value).update(plan=new_value)


def backwards(apps, schema_editor):
    Restaurant = apps.get_model('restaurants', 'Restaurant')
    mapping = {
        'none': 'starter',
        'plus': 'pro',
        'pro': 'business',
    }
    for old_value, new_value in mapping.items():
        Restaurant.objects.filter(plan=old_value).update(plan=new_value)


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0026_restaurant_birthday_service_available_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='restaurant',
            name='plan',
            field=models.CharField(
                choices=[('none', 'Без подписки'), ('plus', 'Plus'), ('pro', 'Pro')],
                default='none',
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards, backwards),
    ]
