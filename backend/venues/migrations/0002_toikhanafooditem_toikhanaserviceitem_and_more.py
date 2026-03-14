
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ToikhanaFoodItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('price_per_person', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
            ],
        ),
        migrations.CreateModel(
            name='ToikhanaServiceItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('price', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('is_included', models.BooleanField(default=False)),
            ],
        ),
        migrations.AddField(
            model_name='venue',
            name='food_options',
            field=models.ManyToManyField(blank=True, related_name='venues', to='venues.toikhanafooditem'),
        ),
        migrations.AddField(
            model_name='venue',
            name='services',
            field=models.ManyToManyField(blank=True, related_name='venues', to='venues.toikhanaserviceitem'),
        ),
    ]
