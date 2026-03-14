
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Venue',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('city', models.CharField(choices=[('Алматы', 'Алматы'), ('Астана', 'Астана'), ('Шымкент', 'Шымкент'), ('Актобе', 'Актобе'), ('Тараз', 'Тараз'), ('Павлодар', 'Павлодар')], max_length=50)),
                ('address', models.CharField(max_length=511)),
                ('min_capacity', models.IntegerField(default=10)),
                ('max_capacity', models.IntegerField(default=1000)),
                ('price_budget', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('price_medium', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('price_premium', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('price_luxury', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('rating', models.DecimalField(decimal_places=1, default=5.0, max_digits=3)),
                ('review_count', models.IntegerField(default=0)),
                ('image_url', models.URLField(blank=True, max_length=1024)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='Amenity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('venues', models.ManyToManyField(related_name='amenities', to='venues.venue')),
            ],
        ),
    ]
