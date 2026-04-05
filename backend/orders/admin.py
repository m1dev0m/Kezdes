from django.contrib import admin

from .models import MenuCategory, MenuItem, Order, OrderItem


@admin.register(MenuCategory)
class MenuCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "restaurant", "name", "order", "is_active")
    list_filter = ("is_active", "restaurant")
    search_fields = ("name", "restaurant__name")
    autocomplete_fields = ("restaurant",)


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ("id", "restaurant", "name", "category", "price", "is_available", "is_active", "created_at")
    list_filter = ("is_available", "is_active", "restaurant", "category")
    search_fields = ("name", "description", "restaurant__name", "category__name")
    autocomplete_fields = ("restaurant", "category")
    date_hierarchy = "created_at"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "restaurant", "user", "reservation", "status", "payment_status", "total_amount", "created_at")
    list_filter = ("status", "payment_status", "restaurant", "created_at")
    search_fields = ("id", "user__username", "restaurant__name")
    autocomplete_fields = ("restaurant", "user", "reservation")
    date_hierarchy = "created_at"


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "menu_item", "quantity", "price_snapshot")
    search_fields = ("order__id", "menu_item__name")
    autocomplete_fields = ("order", "menu_item")
