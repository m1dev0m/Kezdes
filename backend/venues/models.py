from django.db import models
class ToikhanaFoodItem(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price_per_person = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    def __str__(self):
        return self.name
class ToikhanaServiceItem(models.Model):
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_included = models.BooleanField(default=False)
    def __str__(self):
        return self.name
class Venue(models.Model):
    CITY_CHOICES = [
        ('Алматы', 'Алматы'),
        ('Астана', 'Астана'),
        ('Шымкент', 'Шымкент'),
        ('Актобе', 'Актобе'),
        ('Тараз', 'Тараз'),
        ('Павлодар', 'Павлодар'),
    ]
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=50, choices=CITY_CHOICES)
    address = models.CharField(max_length=511)
    min_capacity = models.IntegerField(default=10)
    max_capacity = models.IntegerField(default=1000)
    price_budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price_medium = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price_premium = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price_luxury = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)
    review_count = models.IntegerField(default=0)
    image_url = models.URLField(max_length=1024, blank=True)
    description = models.TextField(blank=True)
    food_options = models.ManyToManyField(ToikhanaFoodItem, blank=True, related_name='venues')
    services = models.ManyToManyField(ToikhanaServiceItem, blank=True, related_name='venues')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.name} ({self.city})"
class Amenity(models.Model):
    name = models.CharField(max_length=100, unique=True)
    venues = models.ManyToManyField(Venue, related_name='amenities')
    def __str__(self):
        return self.name
