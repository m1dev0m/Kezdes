from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import filters
from rest_framework.filters import OrderingFilter
from django.db import models
from django.http import StreamingHttpResponse
import csv

from .models import Customer, CustomerNote, Visit, Lead
from .serializers import CustomerSerializer, CustomerNoteSerializer, VisitSerializer, LeadSerializer
from core.utils import get_user_restaurant
from core.viewsets import OptionalPaginationMixin


class CustomerViewSet(OptionalPaginationMixin, viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, OrderingFilter]
    search_fields = ['name', 'phone', 'email', 'tags']
    ordering_fields = ['last_visit', 'visits_count', 'total_spent', 'created_at', 'name']
    ordering = ['-last_visit', '-created_at']

    def get_queryset(self):
        return Customer.objects.filter(
            restaurant=self.request.user.profile.restaurant
        ).select_related('restaurant').prefetch_related('visit_history', 'internal_notes')

    def perform_create(self, serializer):
        user = self.request.user
        restaurant = get_user_restaurant(user)
        if restaurant:
            serializer.save(restaurant=restaurant)
        else:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "User is not associated with any restaurant."})

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        notes = request.data.get('notes')
        if notes is not None:
            note = instance.internal_notes.order_by('-updated_at').first()
            if note:
                note.content = notes
                note.save(update_fields=['content', 'updated_at'])
            else:
                CustomerNote.objects.create(customer=instance, author=request.user, content=notes)
        data = {k: v for k, v in request.data.items() if k != 'notes'}
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def export(self, request):
        """
        Export customers of current restaurant as CSV.
        """
        restaurant = get_user_restaurant(request.user)
        if not restaurant:
            return Response({"detail": "No restaurant associated."}, status=status.HTTP_400_BAD_REQUEST)

        qs = Customer.objects.filter(restaurant=restaurant).order_by('-last_visit')

        def row_iter():
            header = [
                'id', 'name', 'phone', 'email',
                'visits_count', 'total_spent', 'avg_check', 'last_visit',
                'date_of_birth', 'tags', 'created_at',
            ]
            yield header
            for c in qs.iterator():
                yield [
                    c.id,
                    c.name,
                    c.phone,
                    c.email or '',
                    c.visits_count,
                    str(c.total_spent),
                    str(c.avg_check),
                    c.last_visit.isoformat() if c.last_visit else '',
                    c.date_of_birth.isoformat() if c.date_of_birth else '',
                    c.tags or '',
                    c.created_at.isoformat() if c.created_at else '',
                ]

        def stream():
            pseudo_buffer = type("Buffer", (), {"write": lambda self, x: x})()
            writer = csv.writer(pseudo_buffer)
            for row in row_iter():
                yield writer.writerow(row)

        response = StreamingHttpResponse(stream(), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="customers.csv"'
        return response

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_note(self, request, pk=None):
        customer = self.get_object()
        serializer = CustomerNoteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(customer=customer, author=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def bookings(self, request, pk=None):
        """List bookings linked to this customer (same restaurant, matching phone)."""
        customer = self.get_object()
        from bookings.models import Booking
        from crm.services import normalize_phone
        
        customer_phone_normalized = normalize_phone(customer.phone)
        qs = (
            Booking.objects.filter(
                restaurant=customer.restaurant,
            )
            .exclude(user_phone__isnull=True)
            .exclude(user_phone__exact='')
            .select_related('restaurant', 'table', 'user')
            .prefetch_related('tables')
            .order_by('-date', '-time')[:100]
        )
        
        data = []
        for b in qs:
            booking_phone_normalized = normalize_phone(b.user_phone)
            if booking_phone_normalized == customer_phone_normalized:
                tables = []
                try:
                    tables = list(b.tables.all())
                except Exception:
                    tables = []
                table_numbers = [t.number for t in tables] if tables else ([] if not b.table_id else [b.table.number])

                data.append({
                    'id': b.id,
                    'date': b.date.isoformat() if b.date else None,
                    'time': b.time.strftime('%H:%M') if b.time else None,
                    'guests': b.guests,
                    'status': b.status,
                    'status_display': b.get_status_display(),
                    'restaurant_name': b.restaurant.name,
                    'duration_minutes': getattr(b, 'duration_minutes', None),
                    'budget': float(b.budget) if getattr(b, 'budget', None) is not None else None,
                    'is_checked_in': bool(getattr(b, 'is_checked_in', False)),
                    'check_in_time': (
                        b.check_in_time.isoformat()
                        if getattr(b, 'check_in_time', None) else None
                    ),
                    'table_numbers': table_numbers,
                    'guest_name': b.user_name or (b.user.get_full_name() if b.user else None),
                    'guest_phone': b.user_phone,
                })
        return Response(data)

class CustomerNoteViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CustomerNote.objects.filter(
            customer__restaurant=self.request.user.profile.restaurant
        ).select_related('customer', 'author')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class VisitViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = VisitSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Visit.objects.filter(
            customer__restaurant=self.request.user.profile.restaurant
        ).select_related('customer', 'booking')


class LeadViewSet(viewsets.ModelViewSet):
    """
    Public-facing marketing leads from pricing/contact forms.
    """
    serializer_class = LeadSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Only staff should be able to list leads; anonymous can only create.
        user = self.request.user
        if not user.is_authenticated:
            return Lead.objects.none()
        if not hasattr(user, "profile"):
            return Lead.objects.none()
        role = user.profile.role
        if role == "global_admin":
            return Lead.objects.all()
        if role in ("owner", "restaurant_admin"):
            from core.utils import get_user_restaurant
            restaurant = get_user_restaurant(user)
            if restaurant:
                return Lead.objects.filter(restaurant=restaurant)
        return Lead.objects.none()

    def perform_create(self, serializer):
        source = self.request.data.get('source') or 'pricing'
        serializer.save(source=source)
