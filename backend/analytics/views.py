from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.utils import timezone
from datetime import timedelta
from collections import Counter
from bookings.models import Booking
from crm.models import Customer
from restaurants.models import Restaurant, RestaurantRequest
from django.contrib.auth.models import User
from django.db.models import Sum, Avg, Count, Q
from core.permissions import IsGlobalAdmin
from core.responses import api_error
from datetime import datetime


class DashboardAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        restaurant = None
        if hasattr(user, 'owned_restaurant'):
            restaurant = user.owned_restaurant
        elif hasattr(user, 'profile') and getattr(user.profile, 'restaurant', None):
            restaurant = user.profile.restaurant

        if not restaurant:
            return api_error("No associated restaurant.", 403)

        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)
        start_of_month = today.replace(day=1)

        month_qs = Booking.objects.filter(restaurant=restaurant, date__gte=start_of_month)
        today_qs = Booking.objects.filter(restaurant=restaurant, date=today)
        tomorrow_qs = Booking.objects.filter(restaurant=restaurant, date=tomorrow)

        bookings_today = today_qs.filter(
            status__in=['pending', 'approved', 'completed']
        ).count()

        bookings_tomorrow = tomorrow_qs.filter(
            status__in=['pending', 'approved', 'completed']
        ).count()

        pending_bookings_today = today_qs.filter(status__in=['pending']).count()

        bookings_month = month_qs.filter(
            status__in=['pending', 'approved', 'completed']
        ).count()

        now = timezone.now()
        upcoming_bookings = today_qs.filter(
            status__in=['pending', 'approved'],
            start_datetime__gt=now
        ).count()

        active_tables = restaurant.tables.filter(is_active=True).count()
        occupied_tables_qs = today_qs.filter(
            status__in=['pending', 'approved'],
            start_datetime__lte=now,
            end_datetime__gt=now
        ).prefetch_related('tables')
        occupied_table_ids = set()
        for b in occupied_tables_qs:
            if b.table_id:
                occupied_table_ids.add(b.table_id)
            for t in b.tables.all():
                occupied_table_ids.add(t.id)

        occupied_tables = len(occupied_table_ids)
        available_tables = max(0, active_tables - occupied_tables)

        capacity = restaurant.capacity or 1
        overlapping_guests = today_qs.filter(
            status__in=['pending', 'approved'],
            start_datetime__lte=now,
            end_datetime__gt=now,
        ).aggregate(total=Sum('guests'))['total'] or 0
        occupancy = min(int((overlapping_guests / capacity) * 100), 100)

        # Revenue: Use actual order totals if available, otherwise fallback to average estimate
        completed_month_qs = month_qs.filter(status='completed')
        completed_month_count = completed_month_qs.count()
        
        # Calculate revenue from linked orders
        from orders.models import Order
        order_revenue = Order.objects.filter(
            reservation__in=completed_month_qs,
            payment_status='PAID'
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        # For bookings without orders, use the average price estimate
        bookings_with_orders_ids = Order.objects.filter(
            reservation__in=completed_month_qs
        ).values_list('reservation_id', flat=True)
        
        bookings_without_orders_count = completed_month_qs.exclude(id__in=bookings_with_orders_ids).count()
        avg_price = restaurant.average_price or 5000
        estimated_revenue = bookings_without_orders_count * avg_price
        
        revenue = float(order_revenue) + float(estimated_revenue)

        approved_count = month_qs.filter(status='approved').count() + completed_month_count
        rejected_count = month_qs.filter(status='rejected').count()
        total_decided = approved_count + rejected_count
        confirmation_rate = round((approved_count / total_decided * 100) if total_decided > 0 else 0)

        all_customers = Booking.objects.filter(
            restaurant=restaurant,
            status__in=['approved', 'completed']
        ).values('user').annotate(visit_count=Count('id'))
        total_customers = all_customers.count()
        repeat_customers = all_customers.filter(visit_count__gte=2).count()
        repeat_customer_rate = round((repeat_customers / total_customers * 100) if total_customers > 0 else 0)

        # No-show analytics (month)
        no_show_month = month_qs.filter(status=Booking.NO_SHOW).count()
        decided_month = month_qs.filter(status__in=[Booking.COMPLETED, Booking.NO_SHOW]).count()
        no_show_rate = round((no_show_month / decided_month * 100) if decided_month > 0 else 0)

        # Simple channel breakdown: CRM vs Public
        from collections import Counter as _Counter

        channel_counter = _Counter()
        channel_qs = month_qs.filter(status__in=[
            Booking.PENDING,
            Booking.APPROVED,
            Booking.COMPLETED,
            Booking.NO_SHOW,
        ])
        for b in channel_qs.only('user_id'):
            if b.user_id:
                channel_counter['crm'] += 1
            else:
                channel_counter['public'] += 1

        channels = [
            {"id": "crm", "name": "CRM", "count": channel_counter.get('crm', 0)},
            {"id": "public", "name": "Public", "count": channel_counter.get('public', 0)},
        ]

        # 30‑day retention (users who вернулись в последние 30 дней)
        last_30 = today - timedelta(days=30)
        last_60 = today - timedelta(days=60)
        # Берём пользователей с визитами за 60 дней
        recent_users = Booking.objects.filter(
            restaurant=restaurant,
            date__gte=last_60,
            status__in=[Booking.APPROVED, Booking.COMPLETED, Booking.NO_SHOW],
            user__isnull=False,
        ).values('user').annotate(
            total_visits=Count('id'),
            visits_old=Count('id', filter=Q(date__lt=last_30)),
            visits_recent=Count('id', filter=Q(date__gte=last_30)),
        )

        retained_users = 0
        base_users = 0
        for row in recent_users:
            if row['visits_old'] > 0:
                base_users += 1
                if row['visits_recent'] > 0:
                    retained_users += 1

        retention_30_days = round((retained_users / base_users * 100) if base_users > 0 else 0)

        avg_guests_val = month_qs.filter(
            status__in=['approved', 'completed']
        ).aggregate(avg=Avg('guests'))['avg']
        avg_guests = round(avg_guests_val, 1) if avg_guests_val else 0

        weekly_chart = []
        day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            count = Booking.objects.filter(
                restaurant=restaurant,
                date=d,
                status__in=['pending', 'approved', 'completed']
            ).count()
            weekly_chart.append({
                "name": day_names[d.weekday()],
                "total": count,
            })

        last_30 = today - timedelta(days=30)
        recent_bookings = Booking.objects.filter(
            restaurant=restaurant,
            date__gte=last_30,
            status__in=['approved', 'completed']
        ).values_list('date', flat=True)

        weekday_counts = Counter()
        for d in recent_bookings:
            weekday_counts[d.weekday()] += 1

        daily_load = []
        for idx, name in enumerate(day_names):
            daily_load.append({
                "name": name,
                "bookings": weekday_counts.get(idx, 0),
            })

        data = {
            "bookings_today": bookings_today,
            "bookings_tomorrow": bookings_tomorrow,
            "pending_bookings_today": pending_bookings_today,
            "upcoming_bookings": upcoming_bookings,
            "occupied_tables": occupied_tables,
            "available_tables": available_tables,
            "active_tables": active_tables,
            "bookings_month": bookings_month,
            "occupancy_percent": occupancy,
            "revenue": revenue,
            "confirmation_rate": confirmation_rate,
            "repeat_customer_rate": repeat_customer_rate,
            "avg_guests": avg_guests,
            "weekly_chart": weekly_chart,
            "daily_load": daily_load,
            "new_requests": pending_bookings_today,
            "no_show_month": no_show_month,
            "no_show_rate": no_show_rate,
            "channels": channels,
            "retention_30_days": retention_30_days,
        }
        return Response(data)


class SystemAnalyticsView(APIView):
    permission_classes = [IsGlobalAdmin]

    def get(self, request):
        total_restaurants = Restaurant.objects.count()
        active_restaurants = Restaurant.objects.filter(is_verified=True).count()
        total_users = User.objects.count()
        total_bookings = Booking.objects.count()
        pending_requests = RestaurantRequest.objects.filter(status='pending').count()
        today = timezone.now().date()
        bookings_today = Booking.objects.filter(date=today).count()
        data = {
            "total_restaurants": total_restaurants,
            "active_restaurants": active_restaurants,
            "total_users": total_users,
            "total_bookings": total_bookings,
            "bookings_today": bookings_today,
            "pending_requests": pending_requests,
        }
        return Response(data)
