from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from .models import AutomationLog
from bookings.models import Booking
from crm.models import Customer
from core.notifications import NotificationService


@shared_task
def process_review_requests():
    two_hours_ago = timezone.now() - timedelta(hours=2)
                                                            
    twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
    
    recent_bookings = Booking.objects.filter(
        status='completed',
        date__gte=twenty_four_hours_ago.date(),
        date__lte=two_hours_ago.date(),
                                                      
    ).select_related('user', 'restaurant')

    for booking in recent_bookings:
                                                                                                 
        customer = Customer.objects.filter(restaurant=booking.restaurant, phone=booking.user.phone if booking.user else booking.guest_phone).first()
        if not customer:
            continue

        already_sent = AutomationLog.objects.filter(
            customer=customer,
            restaurant=booking.restaurant,
            type='review_request',
            created_at__gte=twenty_four_hours_ago
        ).exists()

        if already_sent:
            continue

        log = AutomationLog.objects.create(
            restaurant=booking.restaurant,
            customer=customer,
            type='review_request',
            status='sent',
            sent_at=timezone.now()
        )

        title = f"Как вам в {booking.restaurant.name}?"
        body = "Оставьте отзыв о вашем недавнем визите, чтобы помочь нам стать лучше!"
        data = {"url": f"/restaurant/{booking.restaurant.id}/reviews/new?booking_id={booking.id}", "type": "review_request"}
        
        NotificationService.notify_user(booking.user, title, body, data)


@shared_task
def process_win_back():
    thirty_days_ago = timezone.now().date() - timedelta(days=30)
    
    customers = Customer.objects.filter(last_visit__date=thirty_days_ago)
    
    for customer in customers:
        already_sent = AutomationLog.objects.filter(
            customer=customer,
            restaurant=customer.restaurant,
            type='win_back',
            created_at__date=timezone.now().date()
        ).exists()
        
        if already_sent:
            continue
            
        AutomationLog.objects.create(
            restaurant=customer.restaurant,
            customer=customer,
            type='win_back',
            status='sent',
            sent_at=timezone.now()
        )
        
                                         
        user = None
        if hasattr(customer, 'visit_history'):
            last_visit = customer.visit_history.order_by('-date').first()
            if last_visit and last_visit.booking and last_visit.booking.user:
                user = last_visit.booking.user

        if user:
            title = f"Мы соскучились, {customer.name}!"
            body = f"Вы давно не были в {customer.restaurant.name}. Забронируйте столик сейчас!"
            data = {"url": f"/restaurant/{customer.restaurant.id}/book", "type": "win_back"}
            NotificationService.notify_user(user, title, body, data)


@shared_task
def process_birthdays():
    target_date = timezone.now().date() + timedelta(days=7)
    
                                               
    customers = Customer.objects.filter(
        date_of_birth__month=target_date.month,
        date_of_birth__day=target_date.day
    )
    
    for customer in customers:
        already_sent = AutomationLog.objects.filter(
            customer=customer,
            restaurant=customer.restaurant,
            type='birthday',
            created_at__year=timezone.now().year
        ).exists()
        
        if already_sent:
            continue

        AutomationLog.objects.create(
            restaurant=customer.restaurant,
            customer=customer,
            type='birthday',
            status='sent',
            sent_at=timezone.now()
        )
        
                                         
        user = None
        if hasattr(customer, 'visit_history'):
            last_visit = customer.visit_history.order_by('-date').first()
            if last_visit and last_visit.booking and last_visit.booking.user:
                user = last_visit.booking.user

        if user:
            title = f"С наступающим днем рождения, {customer.name}! 🎉"
            body = f"Отметьте праздник в {customer.restaurant.name}. Забронируйте столик заранее!"
            data = {"url": f"/restaurant/{customer.restaurant.id}/book", "type": "birthday"}
            NotificationService.notify_user(user, title, body, data)


@shared_task
def process_no_show_and_followups():
    now = timezone.now()
    grace_minutes = 20
    cutoff = now - timedelta(minutes=grace_minutes)

                     
    auto_candidates = Booking.objects.filter(
        status=Booking.APPROVED,
        start_datetime__lte=cutoff,
        end_datetime__gte=cutoff - timedelta(hours=4),
        is_checked_in=False,
    ).select_related('user', 'restaurant')

    auto_marked_ids = []
    for booking in auto_candidates:
        try:
            booking.transition_to(Booking.NO_SHOW)
            auto_marked_ids.append(booking.id)
        except Exception:
                                                        
            continue

                              
    since = now - timedelta(hours=24)
    no_show_recent = Booking.objects.filter(
        status=Booking.NO_SHOW,
        start_datetime__gte=since - timedelta(hours=4),
        start_datetime__lte=now,
    ).select_related('user', 'restaurant')

    for booking in no_show_recent:
        if not booking.user_id:
            continue

        customer = Customer.objects.filter(
            restaurant=booking.restaurant,
            phone=getattr(booking.user.profile, 'phone', None) or booking.user_phone,
        ).first()
        if not customer:
            continue

        already_sent = AutomationLog.objects.filter(
            customer=customer,
            restaurant=booking.restaurant,
            type='no_show_followup',
            created_at__gte=since,
        ).exists()
        if already_sent:
            continue

        AutomationLog.objects.create(
            restaurant=booking.restaurant,
            customer=customer,
            type='no_show_followup',
            status='sent',
            sent_at=now,
        )

        title = f"Ждём вас в {booking.restaurant.name}"
        body = "Вы не дошли до бронирования. Если хотите, мы поможем найти другое время."
        data = {
            "booking_id": booking.id,
            "type": "no_show_followup",
            "url": f"/restaurant/{booking.restaurant.id}/book",
        }
        NotificationService.notify_user(booking.user, title, body, data)
