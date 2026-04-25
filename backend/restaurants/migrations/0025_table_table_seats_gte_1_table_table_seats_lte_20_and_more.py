                                               

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0024_remove_restaurant_bot_token'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='table',
            constraint=models.CheckConstraint(condition=models.Q(('seats__gte', 1)), name='table_seats_gte_1'),
        ),
        migrations.AddConstraint(
            model_name='table',
            constraint=models.CheckConstraint(condition=models.Q(('seats__lte', 20)), name='table_seats_lte_20'),
        ),
        migrations.AddConstraint(
            model_name='table',
            constraint=models.CheckConstraint(condition=models.Q(('restaurant__isnull', False)), name='table_restaurant_not_null'),
        ),
    ]
