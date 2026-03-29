from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
class Restaurant(models.Model):
    SOURCE_CHOICES = [
        ('2gis', '2GIS'),
        ('manual', 'Manual'),
    ]
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True, null=True, blank=True)
    turnover_default_min = models.PositiveIntegerField(default=85)
    # Amenities
    has_namazhana = models.BooleanField(default=False)
    has_parking = models.BooleanField(default=False)
    has_kids_zone = models.BooleanField(default=False)
    has_wifi = models.BooleanField(default=False)
    has_terrace = models.BooleanField(default=False)
    # Service options
    deposit_required = models.BooleanField(default=False)
    birthday_service_available = models.BooleanField(default=False)
    wheelchair_accessible = models.BooleanField(default=False)
    max_party_size = models.PositiveIntegerField(null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    address = models.CharField(max_length=500)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    image_url = models.URLField(max_length=1000, blank=True, null=True)
    image = models.ImageField(upload_to='restaurants/', blank=True, null=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    status = models.CharField(max_length=50, default='active')
    city = models.CharField(max_length=255, blank=True, null=True)
    source_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    is_claimed = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='owned_restaurant'
    )
    capacity = models.PositiveIntegerField(null=True, blank=True)
    average_price = models.PositiveIntegerField(null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    reviews_count = models.PositiveIntegerField(default=0)
    price_level = models.IntegerField(default=1) 
    PLAN_CHOICES = [
        ('starter', 'Starter'),
        ('pro', 'Pro'),
        ('business', 'Business'),
    ]
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='starter')
    views_count = models.PositiveIntegerField(default=0)
    floor = models.CharField(max_length=50, blank=True, null=True, help_text="Этаж")
    entrance = models.CharField(max_length=50, blank=True, null=True, help_text="Вход/подъезд")
    extra_address_info = models.TextField(blank=True, null=True, help_text="Дополнительная информация (напр. код домофона)")
    
    # Deposit settings
    deposit_min_guests = models.PositiveIntegerField(null=True, blank=True, help_text="Мин. кол-во гостей для предоплаты")
    deposit_amount_per_guest = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Сумма предоплаты за гостя")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['rating']),
            models.Index(fields=['price_level']),
            models.Index(fields=['is_verified', 'is_claimed']),
        ]
        ordering = ['-is_verified', '-rating']

    def __str__(self):
        return self.name

    def has_feature(self, feature: str) -> bool:
        """
        Simple feature-flag matrix per тариф.
        starter: базовый функционал без продвинутой аналитики/карты.
        pro: включает карту столов и базовую аналитику.
        business: всё, включая расширенную аналитику/автоматизации.
        """
        plan = self.plan or 'starter'
        starter_features = {
            'bookings_basic',
            'chat_basic',
        }
        pro_features = starter_features | {
            'table_map',
            'analytics_basic',
        }
        business_features = pro_features | {
            'analytics_advanced',
            'automations',
        }
        if plan == 'starter':
            return feature in starter_features
        if plan == 'pro':
            return feature in pro_features
        return feature in business_features

class OpeningHours(models.Model):
    DAY_CHOICES = [
        (0, 'Понедельник'),
        (1, 'Вторник'),
        (2, 'Среда'),
        (3, 'Четверг'),
        (4, 'Пятница'),
        (5, 'Суббота'),
        (6, 'Воскресенье'),
    ]
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='operating_hours')
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    is_closed = models.BooleanField(default=False)

    class Meta:
        unique_together = ['restaurant', 'day_of_week']
        ordering = ['day_of_week']

    def __str__(self):
        return f"{self.restaurant.name} - {self.get_day_of_week_display()}"
class RestaurantRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    name = models.CharField(max_length=255)
    owner_name = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=255)
    address = models.CharField(max_length=500, blank=True, null=True)
    phone = models.CharField(max_length=50)
    email = models.EmailField()
    instagram = models.CharField(max_length=255, blank=True, null=True)
    admin_username = models.CharField(max_length=150, blank=True, null=True)
    admin_password = models.CharField(max_length=255, blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['owner', 'status']),
        ]
    def __str__(self):
        return f"{self.name} - {self.status}"

class Zone(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='zones')
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)
    grid_cols = models.PositiveIntegerField(default=8)
    grid_rows = models.PositiveIntegerField(default=6)

    class Meta:
        ordering = ['order']
        unique_together = ['restaurant', 'name']

    def __str__(self):
        return f"{self.name} - {self.restaurant.name}"

class Table(models.Model):
    TABLE_TYPE_CHOICES = [
        ('rectangle', 'Прямоугольный'),
        ('circle', 'Круглый'),
        ('square', 'Квадратный'),
    ]
    STATUS_CHOICES = [
        ('free', 'Свободен'),
        ('reserved', 'Забронирован'),
        ('occupied', 'Занят'),
        ('cleaning', 'Уборка'),
    ]
    CAPACITY_MAX = 20

    restaurant = models.ForeignKey(
        Restaurant, on_delete=models.CASCADE, related_name='tables',
        null=False,
    )
    zone = models.ForeignKey('Zone', on_delete=models.SET_NULL, null=True, blank=True, related_name='tables')
    # Primary fields — used everywhere in code and tests
    number = models.CharField(max_length=50, help_text="Table label, e.g. '1', 'A1', 'VIP-1'")
    seats = models.PositiveIntegerField(help_text="Max guests (1–20)")
    # Canonical aliases kept in sync via save()
    name = models.CharField(max_length=50, blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='free')
    grid_x = models.PositiveIntegerField(default=0)
    grid_y = models.PositiveIntegerField(default=0)
    grid_w = models.PositiveIntegerField(default=1)
    grid_h = models.PositiveIntegerField(default=1)
    x = models.FloatField(null=True, blank=True, default=None)
    y = models.FloatField(null=True, blank=True, default=None)
    width = models.FloatField(default=60.0)
    height = models.FloatField(default=60.0)
    rotation = models.FloatField(default=0.0)
    table_type = models.CharField(max_length=20, choices=TABLE_TYPE_CHOICES, default='rectangle')
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        unique_together = ['restaurant', 'number']
        indexes = [
            models.Index(fields=['restaurant', 'status']),
            models.Index(fields=['restaurant', 'is_active']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(seats__gte=1),
                name='table_seats_gte_1',
            ),
            models.CheckConstraint(
                condition=models.Q(seats__lte=20),
                name='table_seats_lte_20',
            ),
            models.CheckConstraint(
                condition=models.Q(restaurant__isnull=False),
                name='table_restaurant_not_null',
            ),
        ]

    def __str__(self):
        return f"Table {self.number} ({self.seats} seats) - {self.restaurant.name}"

    def clean(self):
        if self.restaurant_id is None:
            raise ValidationError({"restaurant": "Table must be linked to a restaurant."})

        if self.seats <= 0:
            raise ValidationError({"capacity": "capacity must be > 0"})
        if self.seats > self.CAPACITY_MAX:
            raise ValidationError({"capacity": f"capacity must be <= {self.CAPACITY_MAX}"})

    def save(self, *args, **kwargs):
        # If created via name/capacity (API path), sync to number/seats
        if self.name and not self.number:
            self.number = self.name
        if self.capacity and not self.seats:
            self.seats = self.capacity
        # Always keep aliases in sync
        self.name = self.number
        self.capacity = self.seats
        self.full_clean()
        super().save(*args, **kwargs)

class Shift(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='shifts')
    name = models.CharField(max_length=100)
    starts_at = models.TimeField()
    ends_at = models.TimeField()
    days_of_week = models.JSONField(default=list)

    class Meta:
        ordering = ['starts_at']

    def __str__(self):
        return f"{self.name} ({self.starts_at} - {self.ends_at})"

class Availability(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='availabilities')
    date = models.DateField()
    available_seats = models.PositiveIntegerField()
    is_fully_booked = models.BooleanField(default=False)
    class Meta:
        unique_together = ['restaurant', 'date']
        verbose_name_plural = "Availabilities"
    def __str__(self):
        return f"{self.restaurant.name} - {self.date}"
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg
class Review(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ['restaurant', 'user']
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.user.username} - {self.restaurant.name} ({self.rating})"
@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def update_restaurant_rating(sender, instance, **kwargs):
    restaurant = instance.restaurant
    avg_rating = Review.objects.filter(restaurant=restaurant).aggregate(Avg('rating'))['rating__avg']
    restaurant.rating = avg_rating or 0.0
    restaurant.save()

from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=RestaurantRequest)
def send_restaurant_request_emails(sender, instance, created, **kwargs):
    update_fields = kwargs.get("update_fields")
    if created:
        # Notify Global Admin about a new restaurant request
        subject = f"Новая заявка на регистрацию ресторана: {instance.name}"
        message = (
            f"Новая заявка на регистрацию ресторана!\n\n"
            f"Название: {instance.name}\n"
            f"Город: {instance.city}\n"
            f"Имя: {instance.owner_name or 'Не указано'}\n"
            f"Телефон: {instance.phone}\n"
            f"Email: {instance.email}\n"
            f"Проверьте панель администратора для подробностей."
        )
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.GLOBAL_ADMIN_EMAIL],
                fail_silently=False,
            )
        except Exception as e:
            logger.warning(f"Failed to email global admin about new restaurant request {instance.id}: {e}")

    # If it's not newly created, check if status changed to approved
    # Wait, we need the old state to be 100% accurate, but for MVP checking if it's approved is sufficient
    # Alternatively we can just check if instance.status == 'approved'.
    # A complete solution would check if it just changed to approved, but this is simple.
    
    if (
        not created
        and instance.status == 'approved'
        and update_fields is not None
        and 'status' in update_fields
    ):
        # Send confirmation email to restaurant owner
        subject = f"Ваша заявка одобрена: {instance.name}"
        message = (
            f"Здравствуйте, {instance.owner_name or 'партнер'}!\n\n"
            f"Ваша заявка на ресторан '{instance.name}' была успешно одобрена.\n"
            f"Теперь вы имеете полный доступ к панели управления вашим рестораном в Kezdes.\n"
            f"Спасибо, что выбрали нас!"
        )
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.warning(f"Failed to email owner about approval for restaurant request {instance.id}: {e}")
