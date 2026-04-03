from django.contrib import admin

from .models import OTPDeliveryAttempt, OTPVerification, Profile, PushToken


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "restaurant", "phone")
    list_filter = ("role",)
    search_fields = ("user__username", "user__email", "phone")


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "device_name", "created_at")
    search_fields = ("user__username", "token", "device_name")


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ("email", "is_verified", "created_at")
    list_filter = ("is_verified",)
    search_fields = ("email",)


@admin.register(OTPDeliveryAttempt)
class OTPDeliveryAttemptAdmin(admin.ModelAdmin):
    list_display = ("email", "channel", "status", "provider", "created_at")
    list_filter = ("channel", "status", "provider")
    search_fields = ("email", "error_message")
    readonly_fields = ("email", "channel", "status", "provider", "error_message", "metadata", "created_at")
