from django.contrib import admin
from .models import Restaurant, RestaurantRequest, Table, Availability, Review, RestaurantInvoice, RestaurantAuditLog
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
    list_display = (
        'name',
        'status',
        'plan',
        'payment_status',
        'is_verified',
        'is_claimed',
        'owner',
        'subscription_features',
    )
    list_filter = ('status', 'plan', 'payment_status', 'is_verified', 'is_claimed', 'source')
    search_fields = ('name', 'address', 'phone')
    list_editable = ('status', 'plan', 'payment_status', 'is_verified', 'is_claimed')
    readonly_fields = ('subscription_features',)

    def subscription_features(self, obj):
        flags = []
        if obj.has_feature('bookings_basic'):
            flags.append('bookings')
        if obj.has_feature('table_map'):
            flags.append('tables')
        if obj.has_feature('analytics_basic'):
            flags.append('analytics')
        if obj.has_feature('automations'):
            flags.append('automations')
        return ', '.join(flags) or 'minimal'

    subscription_features.short_description = 'Features'

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


@admin.register(RestaurantInvoice)
class RestaurantInvoiceAdmin(admin.ModelAdmin):
    list_display = ('number', 'restaurant', 'plan', 'amount', 'currency', 'status', 'issued_at', 'due_at', 'paid_at')
    list_filter = ('plan', 'status', 'currency')
    search_fields = ('number', 'restaurant__name', 'note')


@admin.register(RestaurantAuditLog)
class RestaurantAuditLogAdmin(admin.ModelAdmin):
    list_display = ('restaurant', 'event_type', 'target_type', 'summary', 'actor', 'created_at')
    list_filter = ('event_type', 'target_type')
    search_fields = ('restaurant__name', 'summary', 'target_id')
    readonly_fields = ('restaurant', 'actor', 'event_type', 'target_type', 'target_id', 'summary', 'payload', 'created_at')
