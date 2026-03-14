from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0003_marketing_automations_2026'),
    ]

    operations = [
        migrations.CreateModel(
            name='Lead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('phone', models.CharField(max_length=50)),
                ('city', models.CharField(max_length=255, blank=True)),
                ('restaurants_count', models.PositiveIntegerField(default=1)),
                ('source', models.CharField(max_length=100, blank=True)),
                ('comment', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now, db_index=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]

