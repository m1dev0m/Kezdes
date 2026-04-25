                                               

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0028_restaurant_current_period_ends_at_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='FloorMapShape',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, default='', max_length=100)),
                ('shape_type', models.CharField(choices=[('rectangle', 'Rectangle'), ('circle', 'Circle'), ('label', 'Label'), ('line', 'Line')], default='rectangle', max_length=20)),
                ('x', models.FloatField(default=24.0)),
                ('y', models.FloatField(default=24.0)),
                ('width', models.FloatField(default=140.0)),
                ('height', models.FloatField(default=80.0)),
                ('rotation', models.FloatField(default=0.0)),
                ('fill_color', models.CharField(default='#F8FAFC', max_length=20)),
                ('stroke_color', models.CharField(default='#CBD5E1', max_length=20)),
                ('text_color', models.CharField(default='#334155', max_length=20)),
                ('z_index', models.IntegerField(default=0)),
                ('is_visible', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='floor_shapes', to='restaurants.restaurant')),
                ('zone', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='floor_shapes', to='restaurants.zone')),
            ],
            options={
                'ordering': ['z_index', 'id'],
                'indexes': [models.Index(fields=['restaurant', 'z_index'], name='restaurants_restaur_a20833_idx'), models.Index(fields=['restaurant', 'is_visible'], name='restaurants_restaur_a806eb_idx')],
            },
        ),
    ]
