from django.contrib import admin

from .models import Customer, Visit, CustomerNote, Lead


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("id", "restaurant", "name", "phone", "visits_count", "total_spent", "flag", "last_visit")
    list_filter = ("flag", "restaurant", "created_at")
    search_fields = ("name", "phone", "email", "restaurant__name", "tags")
    autocomplete_fields = ("restaurant",)
    date_hierarchy = "created_at"


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "booking", "date", "spent_amount", "created_at")
    list_filter = ("date", "created_at")
    search_fields = ("customer__name", "customer__phone", "booking__id")
    autocomplete_fields = ("customer", "booking")
    date_hierarchy = "created_at"


@admin.register(CustomerNote)
class CustomerNoteAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "author", "is_important", "created_at", "updated_at")
    list_filter = ("is_important", "created_at", "updated_at")
    search_fields = ("customer__name", "content", "author__username")
    autocomplete_fields = ("customer", "author")
    date_hierarchy = "created_at"


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "phone", "city", "restaurants_count", "source", "created_at")
    list_filter = ("city", "source", "created_at")
    search_fields = ("name", "phone", "comment")
    date_hierarchy = "created_at"
