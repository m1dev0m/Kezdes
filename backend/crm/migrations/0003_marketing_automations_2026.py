                                               

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0002_remove_customer_visits_customer_visits_count_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='date_of_birth',
            field=models.DateField(blank=True, null=True),
        ),
    ]
