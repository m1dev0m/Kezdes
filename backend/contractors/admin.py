from django.contrib import admin

from .models import Contractor


@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "city", "price_from", "rating", "review_count", "created_at")
    list_filter = ("category", "city", "created_at")
    search_fields = ("name", "description", "pricing_info")
    autocomplete_fields = ("user",)
    date_hierarchy = "created_at"
