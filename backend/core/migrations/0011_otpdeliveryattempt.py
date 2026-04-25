                                               

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_alter_profile_role'),
    ]

    operations = [
        migrations.CreateModel(
            name='OTPDeliveryAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(db_index=True, max_length=254)),
                ('channel', models.CharField(choices=[('email', 'Email')], default='email', max_length=20)),
                ('status', models.CharField(choices=[('sent', 'Sent'), ('failed', 'Failed')], max_length=20)),
                ('provider', models.CharField(default='django_mail', max_length=50)),
                ('error_message', models.TextField(blank=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['email', '-created_at'], name='core_otpdel_email_060b48_idx'), models.Index(fields=['status', '-created_at'], name='core_otpdel_status_079de8_idx')],
            },
        ),
    ]
