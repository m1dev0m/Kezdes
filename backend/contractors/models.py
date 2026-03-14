from django.db import models
class Contractor(models.Model):
    CATEGORY_CHOICES = [
        ('photographer', 'Фотограф'),
        ('videographer', 'Видеограф'),
        ('host', 'Ведущий (Тамада)'),
        ('music', 'Музыка'),
        ('decorator', 'Декоратор'),
        ('catering', 'Кейтеринг'),
    ]
    CITY_CHOICES = [
        ('Алматы', 'Алматы'),
        ('Астана', 'Астана'),
        ('Шымкент', 'Шымкент'),
        ('Актобе', 'Актобе'),
        ('Тараз', 'Тараз'),
        ('Павлодар', 'Павлодар'),
    ]
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE, null=True, blank=True, related_name='contractor_profile')
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=50, choices=CITY_CHOICES)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    price_from = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pricing_info = models.TextField(blank=True, help_text="Дополнительная информация о стоимости")
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)
    review_count = models.IntegerField(default=0)
    image_url = models.URLField(max_length=1024, blank=True)
    description = models.TextField(blank=True, help_text="Расскажите о себе")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.name} ({self.category} - {self.city})"
