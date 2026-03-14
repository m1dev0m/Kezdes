
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0011_reservationhistory_booking_table_and_more'),
        ('crm', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveField(
            model_name='customer',
            name='visits',
        ),
        migrations.AddField(
            model_name='customer',
            name='visits_count',
            field=models.PositiveIntegerField(default=0, verbose_name='Visits Count'),
        ),
        migrations.CreateModel(
            name='CustomerNote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('is_important', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='internal_notes', to='crm.customer')),
            ],
        ),
        migrations.CreateModel(
            name='Visit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(auto_now_add=True)),
                ('spent_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=10)),
                ('feedback', models.TextField(blank=True, null=True)),
                ('staff_notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('booking', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='bookings.booking')),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='visit_history', to='crm.customer')),
            ],
        ),
    ]
