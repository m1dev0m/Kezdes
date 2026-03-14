from django.contrib import admin
from .models import Restaurant, RestaurantRequest, Table, Availability, Review
import string
import random
from django.contrib.auth.models import User

@admin.register(RestaurantRequest)
class RestaurantRequestAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'email', 'status', 'created_at')
    list_filter = ('status', 'city')
    search_fields = ('name', 'email', 'city', 'phone')
    actions = ['approve_requests', 'reject_requests']

    def save_model(self, request, obj, form, change):
        if change and 'status' in form.changed_data and obj.status == 'approved':
            from .models import RestaurantRequest
            self.approve_requests(request, RestaurantRequest.objects.filter(pk=obj.pk))
            super().save_model(request, obj, form, change)
        else:
            super().save_model(request, obj, form, change)

    @admin.action(description='Approve selected requests (Accept application & create restaurant)')
    def approve_requests(self, request, queryset):
        from .services import RestaurantService
        for req in queryset.filter(status='pending'):
            result, error = RestaurantService.approve_request(req.pk, admin_user=request.user)
            if error:
                self.message_user(request, f"Error approving {req.name}: {error}", level='error')
                
        self.message_user(request, "Selected requests have been processed.")

    @admin.action(description='Reject selected requests')
    def reject_requests(self, request, queryset):
        updated = queryset.filter(status='pending').update(status='rejected')
        self.message_user(request, f"{updated} requests have been rejected.")

@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'is_verified', 'is_claimed', 'owner')
    list_filter = ('is_verified', 'is_claimed', 'source')
    search_fields = ('name', 'address', 'phone')

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('number', 'restaurant', 'seats', 'is_active')
    list_filter = ('is_active', 'restaurant')

@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ('restaurant', 'date', 'available_seats', 'is_fully_booked')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('restaurant', 'user', 'rating', 'created_at')
