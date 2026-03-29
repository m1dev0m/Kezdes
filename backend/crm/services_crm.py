"""
CRM Service - handles customer creation and visit tracking from bookings
"""
from django.db import transaction
from crm.models import Customer, Visit
from bookings.models import Booking
from crm.services import CRMService as CanonicalCRMService, normalize_phone


class CRMService:
    @staticmethod
    def get_or_create_customer_from_booking(booking: Booking) -> Customer:
        """
        Create or update customer record from booking data.
        Returns the customer instance.
        """
        restaurant = booking.restaurant
        
        phone = booking.user_phone
        if not phone and booking.user and hasattr(booking.user, 'profile'):
            phone = booking.user.profile.phone
        
        if not phone:
            phone = f"unknown_{booking.id}"
        
        name = booking.user_name
        if not name and booking.user:
            name = booking.user.get_full_name() or booking.user.username
        if not name:
            name = f"Guest {booking.id}"
        
        email = None
        if booking.user:
            email = booking.user.email
        
        customer = CanonicalCRMService.ensure_customer(
            restaurant=restaurant,
            phone=normalize_phone(phone),
            name=name,
            email=email,
        )
        return customer

    @staticmethod
    @transaction.atomic
    def complete_booking_and_track_visit(booking: Booking) -> Visit:
        """
        Mark booking as completed and create a visit record.
        Call this when the booking is marked as completed (guest has visited).
        """
        customer = CRMService.get_or_create_customer_from_booking(booking)

        CanonicalCRMService.record_visit(
            restaurant=booking.restaurant,
            phone=customer.phone,
            name=customer.name,
            email=customer.email,
            booking=booking,
            spent_amount=booking.budget or 0,
        )

        return Visit.objects.get(customer=customer, booking=booking)

    @staticmethod
    def update_customer_stats(customer: Customer):
        """
        Recalculate customer statistics from their bookings.
        """
        bookings = Booking.objects.filter(
            user=customer.user,
            restaurant=customer.restaurant,
            status__in=[Booking.APPROVED, Booking.COMPLETED]
        )
        
        customer.visits_count = bookings.count()
        
        total = bookings.aggregate(total=models.Sum('budget'))['total'] or 0
        customer.total_spent = total
        
        if customer.visits_count > 0:
            customer.avg_check = customer.total_spent / customer.visits_count
        
        last_booking = bookings.order_by('-created_at').first()
        if last_booking:
            customer.last_visit = last_booking.created_at
        
        customer.save(update_fields=['visits_count', 'total_spent', 'avg_check', 'last_visit'])
