from django.contrib import admin

from .models import Booking, BookingSecurity, ReservationHistory, WaitlistEntry


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "restaurant",
        "user_name",
        "user_phone",
        "date",
        "time",
        "guests",
        "status",
        "source",
    )
    list_filter = ("status", "source", "date", "restaurant")
    search_fields = ("user_name", "user_phone", "guest_email", "public_token", "restaurant__name")
    autocomplete_fields = ("restaurant", "user", "table", "shift")
    date_hierarchy = "date"


@admin.register(BookingSecurity)
class BookingSecurityAdmin(admin.ModelAdmin):
    list_display = ("booking", "qr_code_data", "is_valid")
    list_filter = ("is_valid",)
    search_fields = ("qr_code_data", "booking__id")
    autocomplete_fields = ("booking",)


@admin.register(ReservationHistory)
class ReservationHistoryAdmin(admin.ModelAdmin):
    list_display = ("reservation", "status", "event_type", "actor", "changed_at")
    list_filter = ("status", "event_type", "action", "changed_at")
    search_fields = ("reservation__id", "actor_label", "reservation__user_name", "reservation__user_phone")
    autocomplete_fields = ("reservation", "actor", "from_table", "to_table")
    readonly_fields = ("changed_at",)


@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "restaurant", "guest_name", "guest_phone", "date", "time", "guests", "status")
    list_filter = ("status", "date", "restaurant")
    search_fields = ("guest_name", "guest_phone", "guest_email", "public_token", "restaurant__name")
    autocomplete_fields = ("restaurant", "user", "promoted_booking")
    date_hierarchy = "date"
