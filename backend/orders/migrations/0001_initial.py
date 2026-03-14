
import django.db.models.deletion
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('bookings', '0008_booking_budget_booking_pay_at_restaurant_and_more'),
        ('restaurants', '0006_restaurant_entrance_restaurant_extra_address_info_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MenuCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='menu_categories', to='restaurants.restaurant')),
            ],
            options={
                'ordering': ['order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='MenuItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('image', models.ImageField(blank=True, null=True, upload_to='menu_items/')),
                ('is_available', models.BooleanField(default=True)),
                ('is_active', models.BooleanField(default=True)),
                ('preparation_time', models.PositiveIntegerField(default=0, help_text='Preparation time in minutes')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='items', to='orders.menucategory')),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='menu_items', to='restaurants.restaurant')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('DRAFT', 'Draft'), ('CONFIRMED', 'Confirmed'), ('CANCELLED', 'Cancelled')], default='DRAFT', max_length=16)),
                ('payment_status', models.CharField(choices=[('UNPAID', 'Unpaid'), ('PAID', 'Paid')], default='UNPAID', max_length=16)),
                ('total_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reservation', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orders', to='bookings.booking')),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='orders', to='restaurants.restaurant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='orders', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='OrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('price_snapshot', models.DecimalField(decimal_places=2, max_digits=10)),
                ('menu_item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='order_items', to='orders.menuitem')),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='orders.order')),
            ],
        ),
        migrations.AddIndex(
            model_name='menucategory',
            index=models.Index(fields=['restaurant', 'is_active', 'order'], name='orders_menu_restaur_b17ff1_idx'),
        ),
        migrations.AddConstraint(
            model_name='menucategory',
            constraint=models.UniqueConstraint(condition=models.Q(('is_active', True)), fields=('restaurant', 'name'), name='uniq_active_category_name_per_restaurant'),
        ),
        migrations.AddIndex(
            model_name='menuitem',
            index=models.Index(fields=['restaurant', 'created_at'], name='orders_menu_restaur_2935cf_idx'),
        ),
        migrations.AddIndex(
            model_name='menuitem',
            index=models.Index(fields=['restaurant', 'is_active', 'is_available'], name='orders_menu_restaur_4fe375_idx'),
        ),
        migrations.AddIndex(
            model_name='menuitem',
            index=models.Index(fields=['category'], name='orders_menu_categor_80cec5_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['restaurant', 'created_at'], name='orders_orde_restaur_763bf4_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['user', 'created_at'], name='orders_orde_user_id_37fed6_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['status', 'created_at'], name='orders_orde_status_25e057_idx'),
        ),
        migrations.AddConstraint(
            model_name='order',
            constraint=models.UniqueConstraint(condition=models.Q(('reservation__isnull', False)), fields=('reservation',), name='uniq_order_per_reservation'),
        ),
        migrations.AddConstraint(
            model_name='order',
            constraint=models.UniqueConstraint(condition=models.Q(('reservation__isnull', True), ('status', 'DRAFT')), fields=('user', 'restaurant'), name='uniq_draft_order_per_user_restaurant'),
        ),
        migrations.AddConstraint(
            model_name='orderitem',
            constraint=models.UniqueConstraint(fields=('order', 'menu_item'), name='uniq_menu_item_per_order'),
        ),
    ]
