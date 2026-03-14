
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('crm', '0001_initial'),
        ('restaurants', '0009_restaurantrequest_table'),
    ]

    operations = [
        migrations.CreateModel(
            name='AutomationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('reminder', 'Reminder (2 hours before)'), ('thank_you', 'Thank You (After Visit)'), ('inactivity', 'Inactivity (30 days)')], max_length=20)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='automation_logs', to='crm.customer')),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='automation_logs', to='restaurants.restaurant')),
            ],
        ),
    ]
