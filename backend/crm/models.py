from django.db import models
from django.db.models import Max
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from restaurants.models import Restaurant
from django.conf import settings
from django.utils import timezone


class Customer(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True, null=True)
    visits_count = models.PositiveIntegerField(default=0, verbose_name="Visits Count")
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    avg_check = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    last_visit = models.DateTimeField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    tags = models.CharField(
        max_length=255,
        blank=True,
        help_text="Comma-separated tags like VIP, influencer, family, etc.",
    )
    FLAG_CHOICES = [
        ('vip', 'VIP'),
        ('problem', 'Problem'),
        ('new', 'New'),
        ('regular', 'Regular'),
    ]
    flag = models.CharField(max_length=20, choices=FLAG_CHOICES, default='new', blank=True)
    no_show_count = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ['restaurant', 'phone']
        ordering = ['-last_visit']

    def __str__(self):
        return f"{self.name} - {self.phone}"

    def recalculate_stats(self):
        from django.db.models import Sum, Count, Avg
        stats = self.visit_history.aggregate(
            total=Sum('spent_amount'),
            count=Count('id'),
            latest=Max('created_at')
        )
        self.visits_count = stats['count'] or 0
        self.total_spent = stats['total'] or 0
        self.last_visit = stats['latest']
        if self.visits_count > 0:
            self.avg_check = self.total_spent / self.visits_count
        else:
            self.avg_check = 0
        self.save(update_fields=['visits_count', 'total_spent', 'avg_check', 'last_visit'])


class Visit(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='visit_history')
    booking = models.OneToOneField('bookings.Booking', on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField(auto_now_add=True)
    spent_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    feedback = models.TextField(blank=True, null=True)
    staff_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Visit by {self.customer.name} on {self.date}"

class CustomerNote(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='internal_notes')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    is_important = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note for {self.customer.name} by {self.author.username}"


@receiver(post_save, sender=Visit)
def update_customer_stats_on_visit_save(sender, instance, created, **kwargs):
    if created:
        instance.customer.recalculate_stats()


@receiver(post_delete, sender=Visit)
def update_customer_stats_on_visit_delete(sender, instance, **kwargs):
    instance.customer.recalculate_stats()


class Lead(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    city = models.CharField(max_length=255, blank=True)
    restaurants_count = models.PositiveIntegerField(default=1)
    source = models.CharField(max_length=100, blank=True)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.name} ({self.phone})"
