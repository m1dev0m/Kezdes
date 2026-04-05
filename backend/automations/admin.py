from django.contrib import admin

from .models import AutomationLog


@admin.register(AutomationLog)
class AutomationLogAdmin(admin.ModelAdmin):
    list_display = ("id", "restaurant", "customer", "type", "status", "sent_at", "created_at")
    list_filter = ("type", "status", "created_at")
    search_fields = ("restaurant__name", "customer__name")
    autocomplete_fields = ("restaurant", "customer")
    date_hierarchy = "created_at"
