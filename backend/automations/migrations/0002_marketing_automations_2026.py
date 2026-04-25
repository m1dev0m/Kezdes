                                               

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('automations', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='automationlog',
            name='type',
            field=models.CharField(choices=[('reminder', 'Reminder (2 hours before)'), ('thank_you', 'Thank You (After Visit)'), ('inactivity', 'Inactivity (30 days)'), ('birthday', 'Birthday (7 days before)'), ('win_back', 'Win Back (30 days since last visit)'), ('review_request', 'Review Request (2 hours after visit)')], max_length=20),
        ),
    ]
