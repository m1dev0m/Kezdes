from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class Profile(models.Model):
    ROLE_CHOICES = [
        ('global_admin', 'Глобальный Админ'),
        ('owner', 'Владелец'),
        ('manager', 'Менеджер'),
        ('host', 'Хостес'),
        ('customer', 'Гость'),
        ('pending', 'Ожидает выбора роли'),
    ]
    
                                                      
    ROLE_MAPPING = {
        'restaurant_admin': 'owner',
        'restaurant_owner': 'owner',
        'restaurant_staff': 'host',
        'hostess': 'host',
        'worker': 'host',
        'organizer': 'customer',
    }
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=20, blank=True, null=True)
    restaurant = models.ForeignKey('restaurants.Restaurant', on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_profiles')

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"
    
    @property
    def is_owner(self):
        return self.role == 'owner'
    
    @property
    def is_manager(self):
        return self.role == 'manager'
    
    @property
    def is_host(self):
        return self.role == 'host'
    
    @property
    def is_global_admin(self):
        return self.role == 'global_admin'
    
    @property
    def is_staff_member(self):
        return self.role in ('owner', 'manager', 'host')
    
    @property
    def restaurant_verified(self):
        
        if self.role == 'owner' and self.restaurant:
            return self.restaurant.is_verified
        return False


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    profile, _ = Profile.objects.get_or_create(user=instance)
    profile.save()


                                                     
from django.db.models.signals import pre_save

@receiver(pre_save, sender=Profile)
def normalize_profile_role(sender, instance, **kwargs):
    if instance.role in Profile.ROLE_MAPPING:
        instance.role = Profile.ROLE_MAPPING[instance.role]


class PushToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_tokens')
    token = models.CharField(max_length=255, unique=True)
    device_name = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.token[:10]}"

class OTPVerification(models.Model):
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.email} - {self.code}"

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        if self.code:
            self.code = self.code.strip()
        super().save(*args, **kwargs)

    def is_expired(self, expires_minutes=None):
        if not self.created_at:
            return False
        minutes = expires_minutes if expires_minutes is not None else getattr(
            settings, "OTP_EXPIRE_MINUTES", 10
        )
        return self.created_at <= timezone.now() - timedelta(minutes=minutes)

    def mark_verified(self):
        if not self.is_verified:
            self.is_verified = True
            self.save(update_fields=["is_verified"])


class OTPDeliveryAttempt(models.Model):
    CHANNEL_EMAIL = "email"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    CHANNEL_CHOICES = [
        (CHANNEL_EMAIL, "Email"),
    ]
    STATUS_CHOICES = [
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
    ]

    email = models.EmailField(db_index=True)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default=CHANNEL_EMAIL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    provider = models.CharField(max_length=50, default="django_mail")
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.email} · {self.status}"
