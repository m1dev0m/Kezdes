
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('restaurants', '0009_restaurantrequest_table'),
    ]

    operations = [
        migrations.CreateModel(
            name='Customer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('phone', models.CharField(max_length=50)),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('visits', models.PositiveIntegerField(default=0)),
                ('total_spent', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('avg_check', models.DecimalField(decimal_places=2, default=0.0, max_digits=10)),
                ('last_visit', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='customers', to='restaurants.restaurant')),
            ],
            options={
                'ordering': ['-last_visit'],
                'unique_together': {('restaurant', 'phone')},
            },
        ),
    ]
