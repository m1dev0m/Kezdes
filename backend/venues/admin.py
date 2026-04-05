from django.contrib import admin

from .models import Amenity, ToikhanaFoodItem, ToikhanaServiceItem, Venue


@admin.register(ToikhanaFoodItem)
class ToikhanaFoodItemAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "price_per_person")
    search_fields = ("name", "description")


@admin.register(ToikhanaServiceItem)
class ToikhanaServiceItemAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "price", "is_included")
    list_filter = ("is_included",)
    search_fields = ("name",)


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "city", "min_capacity", "max_capacity", "rating", "review_count", "created_at")
    list_filter = ("city", "created_at")
    search_fields = ("name", "address", "description")
    filter_horizontal = ("food_options", "services")
    date_hierarchy = "created_at"


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)
