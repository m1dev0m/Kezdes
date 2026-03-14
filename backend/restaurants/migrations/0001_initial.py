
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Restaurant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('address', models.CharField(max_length=500)),
                ('latitude', models.DecimalField(decimal_places=6, max_digits=9)),
                ('longitude', models.DecimalField(decimal_places=6, max_digits=9)),
                ('phone', models.CharField(blank=True, max_length=50, null=True)),
                ('image_url', models.URLField(blank=True, max_length=1000, null=True)),
                ('source', models.CharField(choices=[('2gis', '2GIS'), ('manual', 'Manual')], default='manual', max_length=20)),
                ('source_id', models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ('is_claimed', models.BooleanField(default=False)),
                ('is_verified', models.BooleanField(default=False)),
                ('capacity', models.PositiveIntegerField(blank=True, null=True)),
                ('rating', models.DecimalField(decimal_places=2, default=0.0, max_digits=3)),
                ('price_level', models.IntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='owned_restaurants', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-is_verified', '-rating'],
            },
        ),
        migrations.CreateModel(
            name='Availability',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('available_seats', models.PositiveIntegerField()),
                ('is_fully_booked', models.BooleanField(default=False)),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='availabilities', to='restaurants.restaurant')),
            ],
            options={
                'verbose_name_plural': 'Availabilities',
            },
        ),
        migrations.AddIndex(
            model_name='restaurant',
            index=models.Index(fields=['latitude', 'longitude'], name='restaurants_latitud_bcb1fb_idx'),
        ),
        migrations.AddIndex(
            model_name='restaurant',
            index=models.Index(fields=['rating'], name='restaurants_rating_677477_idx'),
        ),
        migrations.AddIndex(
            model_name='restaurant',
            index=models.Index(fields=['price_level'], name='restaurants_price_l_0a568a_idx'),
        ),
        migrations.AddIndex(
            model_name='restaurant',
            index=models.Index(fields=['is_verified', 'is_claimed'], name='restaurants_is_veri_cb3f9b_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='availability',
            unique_together={('restaurant', 'date')},
        ),
    ]
