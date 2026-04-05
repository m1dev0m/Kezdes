from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
class Restaurant(models.Model):
    PLAN_NONE = 'none'
    PLAN_PLUS = 'plus'
    PLAN_PRO = 'pro'
    PAYMENT_INACTIVE = 'inactive'
    PAYMENT_TRIAL = 'trial'
    PAYMENT_ACTIVE = 'active'
    PAYMENT_GRACE = 'grace'
    PAYMENT_PAST_DUE = 'past_due'
    PAYMENT_CANCELED = 'canceled'
    PLAN_ALIASES = {
        'starter': PLAN_NONE,
        'business': PLAN_PRO,
    }
    PLAN_LIMITS = {
        PLAN_NONE: {
            'tables': 10,
            'zones': 1,
            'staff': 0,
        },
        PLAN_PLUS: {
            'tables': 40,
            'zones': 5,
            'staff': 15,
        },
        PLAN_PRO: {
            'tables': None,
            'zones': None,
            'staff': None,
        },
    }
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
        (PLAN_NONE, 'Без подписки'),
        (PLAN_PLUS, 'Plus'),
        (PLAN_PRO, 'Pro'),
    ]
    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_INACTIVE, 'Не активна'),
        (PAYMENT_TRIAL, 'Тестовый период'),
        (PAYMENT_ACTIVE, 'Активна'),
        (PAYMENT_GRACE, 'Льготный период'),
        (PAYMENT_PAST_DUE, 'Просрочена'),
        (PAYMENT_CANCELED, 'Отменена'),
    ]
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_NONE)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_INACTIVE)
    current_period_starts_at = models.DateTimeField(null=True, blank=True)
    current_period_ends_at = models.DateTimeField(null=True, blank=True)
    grace_until = models.DateTimeField(null=True, blank=True)
    feature_flags = models.JSONField(default=dict, blank=True)
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

    def get_effective_plan(self) -> str:
        return self.PLAN_ALIASES.get(self.plan, self.plan or self.PLAN_NONE)

    def is_paid_plan(self) -> bool:
        return self.get_effective_plan() in {self.PLAN_PLUS, self.PLAN_PRO}

    def is_subscription_live(self) -> bool:
        if not self.is_paid_plan():
            return True
        if self.payment_status in {self.PAYMENT_ACTIVE, self.PAYMENT_TRIAL}:
            return True
        if self.grace_until and self.grace_until >= timezone.now():
            return True
        return False

    def get_subscription_state(self) -> str:
        if not self.is_paid_plan():
            return 'none'
        if self.grace_until and self.grace_until >= timezone.now():
            return 'grace'
        if self.is_subscription_live():
            return 'active'
        return 'limited'

    def get_plan_limits(self) -> dict[str, int | None]:
        plan = self.get_effective_plan()
        return self.PLAN_LIMITS.get(plan, self.PLAN_LIMITS[self.PLAN_PRO]).copy()

    def get_usage_snapshot(self) -> dict[str, int]:
        return {
            'tables': self.tables.count(),
            'zones': self.zones.count(),
            'staff': self.staff_profiles.filter(role__in=['manager', 'host']).count(),
        }

    def can_add_resource(self, resource: str, increment: int = 1) -> tuple[bool, str | None]:
        limits = self.get_plan_limits()
        usage = self.get_usage_snapshot()
        limit = limits.get(resource)
        if limit is None:
            return True, None
        current = usage.get(resource, 0)
        if current + increment <= limit:
            return True, None
        return (
            False,
            f"Лимит тарифа {self.get_plan_display()} по ресурсу '{resource}' исчерпан: {current}/{limit}.",
        )

    def get_onboarding_checklist(self) -> list[dict[str, object]]:
        usage = self.get_usage_snapshot()
        return [
            {
                'key': 'tables',
                'label': 'Добавьте столы',
                'done': usage['tables'] > 0,
                'description': 'Создайте хотя бы один стол и расставьте его на схеме зала.',
                'path': '/app/tables',
            },
            {
                'key': 'hours',
                'label': 'Настройте часы работы',
                'done': self.operating_hours.exists(),
                'description': 'Укажите расписание, чтобы публичное бронирование показывало реальные слоты.',
                'path': '/app/settings',
            },
            {
                'key': 'staff',
                'label': 'Пригласите staff',
                'done': usage['staff'] > 0,
                'description': 'Добавьте менеджера или хостес, чтобы команда могла работать в CRM.',
                'path': '/app/staff',
            },
            {
                'key': 'billing',
                'label': 'Проверьте подписку',
                'done': not self.is_paid_plan() or self.is_subscription_live(),
                'description': 'Без активной подписки Plus/Pro часть CRM-функций будет ограничена.',
                'path': '/app/billing',
            },
        ]

    def has_feature(self, feature: str) -> bool:
        """
        Simple feature-flag matrix per subscription plan.
        none: базовый операционный минимум — брони, схема зала и один зал с лимитами.
        plus: ежедневная операционная работа ресторана.
        pro: plus + продвинутая аналитика и автоматизации.
        """
        overrides = self.feature_flags or {}
        if isinstance(overrides.get(feature), bool):
            return overrides[feature]

        plan = self.get_effective_plan()
        none_features = {
            'bookings_basic',
            'chat_basic',
            'table_map',
            'zones',
        }
        plus_features = none_features | {
            'shifts',
            'staff_basic',
            'menu_basic',
            'orders_basic',
            'analytics_basic',
        }
        pro_features = plus_features | {
            'analytics_advanced',
            'automations',
        }
        if self.is_paid_plan() and not self.is_subscription_live():
            plan = self.PLAN_NONE
        if plan == self.PLAN_NONE:
            return feature in none_features
        if plan == self.PLAN_PLUS:
            return feature in plus_features
        return feature in pro_features

    def save(self, *args, **kwargs):
        self.plan = self.get_effective_plan()
        super().save(*args, **kwargs)


class RestaurantInvoice(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PAID = 'paid'
    STATUS_FAILED = 'failed'
    STATUS_VOID = 'void'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Ожидает оплаты'),
        (STATUS_PAID, 'Оплачен'),
        (STATUS_FAILED, 'Не оплачен'),
        (STATUS_VOID, 'Аннулирован'),
    ]

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='invoices')
    plan = models.CharField(max_length=20, choices=Restaurant.PLAN_CHOICES)
    number = models.CharField(max_length=64, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default='KZT')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    issued_at = models.DateTimeField(default=timezone.now)
    due_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-issued_at']
        indexes = [
            models.Index(fields=['restaurant', '-issued_at']),
            models.Index(fields=['restaurant', 'status']),
        ]

    def __str__(self):
        return f"{self.number} - {self.restaurant.name}"


class RestaurantAuditLog(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='audit_logs')
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='restaurant_audit_logs',
    )
    event_type = models.CharField(max_length=50)
    target_type = models.CharField(max_length=50, default='restaurant')
    target_id = models.CharField(max_length=64, blank=True)
    summary = models.CharField(max_length=255)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['restaurant', '-created_at']),
            models.Index(fields=['event_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.restaurant.name} · {self.event_type}"

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


class FloorMapShape(models.Model):
    SHAPE_RECTANGLE = 'rectangle'
    SHAPE_CIRCLE = 'circle'
    SHAPE_LABEL = 'label'
    SHAPE_LINE = 'line'
    SHAPE_CHOICES = [
        (SHAPE_RECTANGLE, 'Rectangle'),
        (SHAPE_CIRCLE, 'Circle'),
        (SHAPE_LABEL, 'Label'),
        (SHAPE_LINE, 'Line'),
    ]

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='floor_shapes')
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name='floor_shapes')
    name = models.CharField(max_length=100, blank=True, default='')
    shape_type = models.CharField(max_length=20, choices=SHAPE_CHOICES, default=SHAPE_RECTANGLE)
    x = models.FloatField(default=24.0)
    y = models.FloatField(default=24.0)
    width = models.FloatField(default=140.0)
    height = models.FloatField(default=80.0)
    rotation = models.FloatField(default=0.0)
    fill_color = models.CharField(max_length=20, default='#F8FAFC')
    stroke_color = models.CharField(max_length=20, default='#CBD5E1')
    text_color = models.CharField(max_length=20, default='#334155')
    z_index = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['z_index', 'id']
        indexes = [
            models.Index(fields=['restaurant', 'z_index']),
            models.Index(fields=['restaurant', 'is_visible']),
        ]

    def __str__(self):
        title = self.name or self.get_shape_type_display()
        return f"{self.restaurant.name} · {title}"

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
from django.db.models.signals import post_save, post_delete, pre_save
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


@receiver(pre_save, sender=Restaurant)
def capture_restaurant_subscription_state(sender, instance, **kwargs):
    if not instance.pk:
        instance._subscription_audit_previous = None
        return
    try:
        previous = Restaurant.objects.only(
            'status',
            'plan',
            'payment_status',
            'current_period_ends_at',
            'grace_until',
        ).get(pk=instance.pk)
        instance._subscription_audit_previous = {
            'status': previous.status,
            'plan': previous.plan,
            'payment_status': previous.payment_status,
            'current_period_ends_at': previous.current_period_ends_at.isoformat() if previous.current_period_ends_at else None,
            'grace_until': previous.grace_until.isoformat() if previous.grace_until else None,
        }
    except Restaurant.DoesNotExist:
        instance._subscription_audit_previous = None


@receiver(post_save, sender=Restaurant)
def log_restaurant_subscription_state(sender, instance, created, **kwargs):
    if created:
        RestaurantAuditLog.objects.create(
            restaurant=instance,
            event_type='restaurant_created',
            summary=f"Создан ресторан {instance.name}.",
            payload={'plan': instance.plan, 'payment_status': instance.payment_status},
        )
        return

    previous = getattr(instance, '_subscription_audit_previous', None)
    if previous is None:
        return

    current = {
        'status': instance.status,
        'plan': instance.plan,
        'payment_status': instance.payment_status,
        'current_period_ends_at': instance.current_period_ends_at.isoformat() if instance.current_period_ends_at else None,
        'grace_until': instance.grace_until.isoformat() if instance.grace_until else None,
    }
    if current == previous:
        return

    RestaurantAuditLog.objects.create(
        restaurant=instance,
        event_type='subscription_updated',
        summary='Обновлены статус ресторана или параметры подписки.',
        payload={
            'before': previous,
            'after': current,
        },
    )

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
