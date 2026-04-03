from datetime import datetime, timedelta
import random
import string

from django.contrib.auth.models import User
from django.db import models, transaction
from django.db.models import Case, IntegerField, Prefetch, Value, When
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_time
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from bookings.models import Booking
from core.permissions import (
    CanManageTables,
    HasRestaurantFeature,
    IsGlobalAdmin,
    IsRestaurantOrGlobalAdmin,
    IsRestaurantStaff,
)
from core.models import Profile
from orders.models import MenuCategory, MenuItem
from orders.serializers import PublicMenuCategorySerializer, PublicMenuItemSerializer
from core.responses import api_error

from .models import Availability, Restaurant, RestaurantRequest, Review, Table, Zone, Shift
from .serializers import (
    AvailabilitySerializer,
    RestaurantAuditLogSerializer,
    RestaurantInvoiceSerializer,
    RestaurantRequestSerializer,
    RestaurantSerializer,
    RestaurantSubscriptionSerializer,
    ReviewSerializer,
    StaffSerializer,
    TableAPISerializer,
    TableSerializer,
    ZoneSerializer,
    ShiftSerializer,
)
from .audit import log_restaurant_event


from core.viewsets import OptionalPaginationMixin, TenantModelViewSet


class RestaurantViewSet(OptionalPaginationMixin, viewsets.ModelViewSet):
    queryset = Restaurant.objects.select_related("owner").prefetch_related(
        "operating_hours",
        "tables",
        Prefetch("reviews", queryset=Review.objects.select_related("user")),
    )
    serializer_class = RestaurantSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "address", "city"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRestaurantOrGlobalAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = Restaurant.objects.select_related("owner").prefetch_related(
            "operating_hours",
            "tables",
            Prefetch("reviews", queryset=Review.objects.select_related("user")),
        )
        user = self.request.user

        if self.action == "list":
            my_restaurants_only = self.request.query_params.get("my_restaurants") == "true"
            
            if my_restaurants_only and user.is_authenticated:
                queryset = queryset.filter(owner=user)
            else:
                # Public discovery should never expose restaurants that still 403 on detail/book flows.
                queryset = queryset.filter(is_verified=True)

        city = self.request.query_params.get("city")
        if city:
            queryset = queryset.filter(city__icontains=city)

        from django.db.models import Avg, Count
        queryset = queryset.annotate(
            priority=Case(
                When(
                    is_claimed=True,
                    owner__isnull=False,
                    average_price__isnull=False,
                    capacity__isnull=False,
                    then=Value(1),
                ),
                default=Value(2),
                output_field=IntegerField(),
            ),
            calculated_rating=Avg('reviews__rating'),
            total_reviews=Count('reviews')
        ).order_by("priority", "-calculated_rating")

        return queryset.distinct()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.is_verified:
            is_owner = request.user.is_authenticated and instance.owner == request.user
            is_global_admin = (
                request.user.is_authenticated
                and getattr(request.user, "profile", None)
                and request.user.profile.role == "global_admin"
            )
            if not is_owner and not is_global_admin:
                return api_error("Restaurant is pending verification.", status.HTTP_403_FORBIDDEN)

        if not request.user.is_authenticated or instance.owner != request.user:
            Restaurant.objects.filter(pk=instance.pk).update(views_count=models.F('views_count') + 1)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        if Restaurant.objects.filter(owner=self.request.user).exists():
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"detail": "You already have a restaurant."})
        serializer.save(owner=self.request.user, is_claimed=True)

    @action(detail=False, methods=["get", "patch"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        try:
            restaurant = Restaurant.objects.get(owner=request.user)
        except Restaurant.DoesNotExist:
            return api_error("Restaurant not found", status.HTTP_404_NOT_FOUND)

        if request.method == "PATCH":
            serializer = self.get_serializer(restaurant, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = self.get_serializer(restaurant)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def subscription(self, request):
        from core.utils import get_user_restaurant

        restaurant = get_user_restaurant(request.user)
        if not restaurant:
            return api_error("Restaurant not found", status.HTTP_404_NOT_FOUND)
        restaurant = (
            Restaurant.objects.select_related("owner")
            .prefetch_related("invoices")
            .get(pk=restaurant.pk)
        )
        serializer = RestaurantSubscriptionSerializer(restaurant)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated], url_path="subscription/audit")
    def subscription_audit(self, request):
        from core.utils import get_user_restaurant

        restaurant = get_user_restaurant(request.user)
        if not restaurant:
            return api_error("Restaurant not found", status.HTTP_404_NOT_FOUND)
        logs = restaurant.audit_logs.select_related("actor")[:25]
        return Response(RestaurantAuditLogSerializer(logs, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated], url_path="subscription/invoices")
    def subscription_invoices(self, request):
        from core.utils import get_user_restaurant

        restaurant = get_user_restaurant(request.user)
        if not restaurant:
            return api_error("Restaurant not found", status.HTTP_404_NOT_FOUND)
        invoices = restaurant.invoices.all()[:25]
        return Response(RestaurantInvoiceSerializer(invoices, many=True).data)

    @action(detail=False, methods=["get"], url_path=r'by-slug/(?P<slug>[-\w]+)', permission_classes=[permissions.AllowAny])
    def by_slug(self, request, slug=None):
        try:
            restaurant = (
                Restaurant.objects.select_related("owner")
                .prefetch_related(
                    "operating_hours",
                    "tables",
                    Prefetch("reviews", queryset=Review.objects.select_related("user")),
                )
                .get(slug=slug)
            )
            if not restaurant.is_verified:
                is_owner = request.user.is_authenticated and restaurant.owner == request.user
                is_global_admin = (
                    request.user.is_authenticated
                    and getattr(request.user, "profile", None)
                    and request.user.profile.role == "global_admin"
                )
                if not is_owner and not is_global_admin:
                    return api_error("Restaurant is pending verification.", status.HTTP_403_FORBIDDEN)
            serializer = self.get_serializer(restaurant)
            return Response(serializer.data)
        except Restaurant.DoesNotExist:
            return api_error("Restaurant not found.", status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated], url_path="favorites")
    def favorites(self, request):
        """MVP: return empty list. Favorites can be implemented later with a user-restaurant relation."""
        return Response([])

    @action(detail=True, methods=["delete"], permission_classes=[permissions.IsAuthenticated], url_path="favorite")
    def favorite(self, request, pk=None):
        """MVP: no-op delete so frontend does not 404."""
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def claim(self, request, pk=None):
        restaurant = self.get_object()
        if restaurant.is_claimed:
            return api_error("Already claimed", status.HTTP_400_BAD_REQUEST)
        if getattr(request.user, "profile", None) and request.user.profile.role not in ("restaurant_admin", "restaurant_owner", "owner"):
            return api_error("Only restaurant admins can claim venues", status.HTTP_403_FORBIDDEN)
        restaurant.owner = request.user
        restaurant.is_claimed = True
        restaurant.save()
        return Response({"status": "claimed"})

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.IsAuthenticated])
    def availability(self, request, pk=None):
        restaurant = self.get_object()
        if request.method == "GET":
            avail = restaurant.availabilities.all()
            serializer = AvailabilitySerializer(avail, many=True)
            return Response(serializer.data)
        if restaurant.owner != request.user:
            return api_error("Not owner", status.HTTP_403_FORBIDDEN)
        serializer = AvailabilitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(restaurant=restaurant)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def menu(self, request, pk=None):
        restaurant = self.get_object()
        categories = MenuCategory.objects.filter(restaurant=restaurant, is_active=True).order_by("order", "id")
        items = (
            MenuItem.objects.filter(restaurant=restaurant, is_active=True)
            .select_related("category")
            .order_by("category_id", "-created_at")
        )
        cat_data = PublicMenuCategorySerializer(categories, many=True).data
        item_data = PublicMenuItemSerializer(items, many=True, context={"request": request}).data

        items_by_cat: dict[int, list] = {}
        uncategorized: list = []
        for it in item_data:
            cat_id = it.get("category")
            if cat_id:
                items_by_cat.setdefault(int(cat_id), []).append(it)
            else:
                uncategorized.append(it)

        categories_out = []
        for c in cat_data:
            cid = int(c["id"])
            categories_out.append({**c, "items": items_by_cat.get(cid, [])})

        return Response(
            {
                "restaurant_id": restaurant.id,
                "categories": categories_out,
                "uncategorized_items": uncategorized,
            }
        )

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def reviews(self, request, pk=None):
        restaurant = self.get_object()
        if request.method == "GET":
            reviews = restaurant.reviews.all()
            serializer = ReviewSerializer(reviews, many=True)
            return Response(serializer.data)
        if Review.objects.filter(restaurant=restaurant, user=request.user).exists():
            return api_error("Вы уже оставили отзыв для этого ресторана.", status.HTTP_400_BAD_REQUEST)
        serializer = ReviewSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(restaurant=restaurant, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RestaurantRequestViewSet(OptionalPaginationMixin, viewsets.ModelViewSet):
    """
    Application flow for restaurants.

    - Authenticated restaurant owners create/update their own applications.
    - Global admins can list, filter, approve, and reject applications.
    """

    queryset = RestaurantRequest.objects.select_related("owner").order_by("-created_at")
    serializer_class = RestaurantRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _is_global_admin(self, user):
        profile = getattr(user, 'profile', None)
        return bool(profile and profile.role == 'global_admin')

    def get_permissions(self):
        if self.action in ["list", "approve", "reject"]:
            return [IsGlobalAdmin()]
        if self.action == "create":
            return [permissions.AllowAny()]
        if self.action in ["mine"]:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        # Public onboarding: allow submitting an application and minting tokens for the created owner.
        if request.user and request.user.is_authenticated:
            return super().create(request, *args, **kwargs)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.contrib.auth.models import User

        email = serializer.validated_data.get('email')
        password = serializer.validated_data.get('admin_password')
        if not email or not password:
            return api_error("Email and password are required.", status.HTTP_400_BAD_REQUEST)

        base_username = serializer.validated_data.get('admin_username') or email.split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        if User.objects.filter(email=email).exists():
            return api_error("User with this email already exists. Please log in.", status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        if hasattr(user, 'profile'):
            user.profile.role = 'owner'
            user.profile.save(update_fields=['role'])

        instance = serializer.save(owner=user, admin_username=username)

        refresh = RefreshToken.for_user(user)
        out = self.get_serializer(instance).data
        out['access'] = str(refresh.access_token)
        out['refresh'] = str(refresh)
        return Response(out, status=status.HTTP_201_CREATED)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user and user.is_authenticated and hasattr(user, 'profile'):
            context["restaurant"] = getattr(user.profile, "restaurant", None)
        else:
            context["restaurant"] = None
        return context

    def get_queryset(self):
        qs = super().get_queryset()

        # Owners can only access their own requests for detail/update/delete.
        if self.action in ["retrieve", "update", "partial_update", "destroy"] and not self._is_global_admin(self.request.user):
            qs = qs.filter(owner=self.request.user)

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._is_global_admin(request.user):
            if instance.owner_id != request.user.id:
                return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
            if instance.status != "pending":
                return api_error("Only pending applications can be edited.", status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._is_global_admin(request.user):
            if instance.owner_id != request.user.id:
                return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
            if instance.status != "pending":
                return api_error("Only pending applications can be edited.", status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._is_global_admin(request.user):
            if instance.owner_id != request.user.id:
                return api_error("Permission denied", status.HTTP_403_FORBIDDEN)
            if instance.status != "pending":
                return api_error("Only pending applications can be deleted.", status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        """
        Attach current user as owner and default email/credentials on create.
        """
        user = self.request.user
        email = serializer.validated_data.get("email") or getattr(user, "email", "") or ""
        serializer.save(
            owner=user,
            email=email,
            admin_username=serializer.validated_data.get("admin_username") or user.username,
        )

    @action(detail=False, methods=["get"])
    def mine(self, request):
        """
        Return the latest application for the current user (if any).
        Used by restaurant owners to see their request status.
        """
        user = request.user
        req = (
            RestaurantRequest.objects.filter(owner=user)
            .order_by("-created_at")
            .first()
        )
        if not req:
            return api_error("No application found.", status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(req)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsGlobalAdmin])
    def approve(self, request, pk=None):
        from .services import RestaurantService
        
        result, error = RestaurantService.approve_request(pk, admin_user=request.user)
        if error:
            return api_error(error, status.HTTP_400_BAD_REQUEST)
            
        return Response(
            {
                "status": "approved",
                "message": "Restaurant approved.",
                "restaurant_id": result["restaurant"].id,
                "created_new_user": result["created_new_user"],
                "credentials": result["credentials"],
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[IsGlobalAdmin])
    def reject(self, request, pk=None):
        req = self.get_object()
        req.status = "rejected"
        req.save()
        return Response({"status": "rejected"})


class TableViewSet(OptionalPaginationMixin, TenantModelViewSet):
    queryset = Table.objects.select_related('restaurant').all()
    serializer_class = TableAPISerializer
    permission_classes = [CanManageTables, HasRestaurantFeature]
    required_feature = "table_map"
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['name', 'capacity', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        user = self.request.user
        from core.utils import get_user_restaurant
        restaurant = get_user_restaurant(user)
        if not restaurant:
            return Table.objects.none()

        qs = Table.objects.select_related("restaurant", "zone").filter(restaurant=restaurant)
        active = self.request.query_params.get('active')
        if active is not None:
            qs = qs.filter(is_active=active.lower() in ('true', '1', 'yes'))
        zone_id = self.request.query_params.get('zone_id')
        if zone_id:
            qs = qs.filter(zone_id=zone_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        from core.utils import get_user_restaurant
        restaurant = get_user_restaurant(user)
        if not restaurant:
            raise PermissionDenied("You don't have a restaurant to attach tables to.")
        allowed, message = restaurant.can_add_resource('tables')
        if not allowed:
            log_restaurant_event(
                restaurant,
                actor=user,
                event_type='plan_limit_blocked',
                target_type='table',
                summary=message or 'Table limit reached.',
                payload={'resource': 'tables'},
            )
            raise ValidationError({"detail": message})
        table = serializer.save(restaurant=restaurant)
        log_restaurant_event(
            restaurant,
            actor=user,
            event_type='table_created',
            target_type='table',
            target_id=table.id,
            summary=f"Создан стол {table.number}.",
            payload={'table_id': table.id, 'name': table.number},
        )

    def update(self, request, *args, **kwargs):
        table = self.get_object()
        self._check_ownership(table)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        table = self.get_object()
        self._check_ownership(table)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        table = self.get_object()
        self._check_ownership(table)

        active_bookings = Booking.objects.filter(
            status__in=Booking.ACTIVE_STATUSES,
            restaurant=table.restaurant,
        ).filter(models.Q(table=table) | models.Q(tables=table)).exists()
        if active_bookings:
            return api_error(
                "Cannot delete table with active bookings. "
                "Cancel or complete bookings first.",
                status.HTTP_400_BAD_REQUEST,
            )

        log_restaurant_event(
            table.restaurant,
            actor=request.user,
            event_type='table_deleted',
            target_type='table',
            target_id=table.id,
            summary=f"Удалён стол {table.number}.",
            payload={'table_id': table.id, 'name': table.number},
        )
        return super().destroy(request, *args, **kwargs)

    def _check_ownership(self, table):
        """Verify the table belongs to the current user's restaurant."""
        from core.utils import get_user_restaurant
        restaurant = get_user_restaurant(self.request.user)
        if restaurant is None or table.restaurant_id != restaurant.id:
            raise PermissionDenied("This table does not belong to your restaurant.")

    @action(detail=False, methods=["get"])
    def status(self, request):
        # Tenant enforced by get_queryset from TenantModelViewSet
        tables = self.get_queryset().select_related('restaurant')

        user = self.request.user
        from core.utils import get_user_restaurant
        restaurant = get_user_restaurant(user)
            
        if not restaurant:
             return api_error("Restaurant not found", status.HTTP_404_NOT_FOUND)

        date_str = request.query_params.get("date")
        time_str = request.query_params.get("time")

        from bookings.services import make_aware_if_needed
        target_date = parse_date(date_str) if date_str else timezone.now().date()
        try:
            target_time = parse_time(time_str) if time_str else timezone.now().time()
        except (ValueError, TypeError):
            target_time = None

        if not target_date or not target_time:
            return api_error("Invalid date/time format.", status.HTTP_400_BAD_REQUEST)

        target_dt = make_aware_if_needed(datetime.combine(target_date, target_time))

        active_bookings = Booking.objects.filter(
            restaurant=restaurant,
            status__in=Booking.ACTIVE_STATUSES,
            start_datetime__lte=target_dt,
            end_datetime__gt=target_dt
        ).prefetch_related('tables')

        table_status_map: dict[int, str] = {}
        table_booking_map: dict[int, dict] = {}
        for booking in active_bookings:
            status_val = "occupied" if booking.is_checked_in else "reserved"
            booking_data = {
                "id": booking.id,
                "guest_name": booking.user_name or (booking.user.get_full_name() if booking.user else "Гость"),
                "guests": booking.guests,
                "time": str(booking.time),
                "duration_minutes": booking.duration_minutes
            }
            if booking.table_id:
                table_status_map[booking.table_id] = status_val
                table_booking_map[booking.table_id] = booking_data
            for t in booking.tables.all():
                table_status_map[t.id] = status_val
                table_booking_map[t.id] = booking_data

        response_data = []
        for table in tables:
            row = TableSerializer(table).data
            row["status"] = table_status_map.get(table.id, "free")
            if row["status"] != "free":
                row["current_booking"] = table_booking_map.get(table.id)
            response_data.append(row)
        return Response(response_data)

    @action(detail=True, methods=["patch"])
    def update_status(self, request, pk=None):
        """Allow manager+ to change table status (free/occupied/reserved/cleaning)."""
        table = self.get_object()
        new_status = request.data.get("status")
        valid_statuses = [s[0] for s in Table.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {"detail": f"Invalid status. Must be one of: {valid_statuses}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        table.status = new_status
        table.save(update_fields=["status"])
        return Response(TableSerializer(table).data)


class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    permission_classes = [permissions.IsAuthenticated, HasRestaurantFeature]
    required_feature = "staff_basic"

    def get_queryset(self):
        user = self.request.user
        from core.utils import get_user_restaurant
        restaurant = get_user_restaurant(user)
        if not restaurant:
            return User.objects.none()
        return User.objects.filter(
            profile__restaurant=restaurant,
            profile__role__in=["manager", "host"],
        )

    def perform_create(self, serializer):
        user = self.request.user
        from core.utils import get_user_restaurant
        restaurant = get_user_restaurant(user)
        if not restaurant:
            raise PermissionDenied("You don't have a restaurant to attach staff to.")
        allowed, message = restaurant.can_add_resource('staff')
        if not allowed:
            log_restaurant_event(
                restaurant,
                actor=user,
                event_type='plan_limit_blocked',
                target_type='staff',
                summary=message or 'Staff limit reached.',
                payload={'resource': 'staff'},
            )
            raise ValidationError({"detail": message})
        staff_user = serializer.save()
        staff_user.profile.restaurant = restaurant
        staff_user.profile.save()
        log_restaurant_event(
            restaurant,
            actor=user,
            event_type='staff_created',
            target_type='staff',
            target_id=staff_user.id,
            summary=f"Добавлен сотрудник {staff_user.username}.",
            payload={'role': staff_user.profile.role},
        )

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        restaurant_id = self.kwargs.get('restaurant_pk') or self.request.query_params.get('restaurant')
        if restaurant_id:
            return Review.objects.filter(restaurant_id=restaurant_id).select_related('user')
        # Fallback: only show reviews for the user's own restaurant (staff) or none
        user = self.request.user
        if user.is_authenticated:
            from core.utils import get_user_restaurant
            restaurant = get_user_restaurant(user)
            if restaurant:
                return Review.objects.filter(restaurant=restaurant).select_related('user')
        return Review.objects.none()

    def perform_create(self, serializer):
        restaurant_id = self.kwargs.get('restaurant_pk')
        if not restaurant_id:
            restaurant_id = self.request.data.get('restaurant')
            
        restaurant = Restaurant.objects.get(id=restaurant_id)

        booking_id = self.request.data.get('booking_id')
        booking = None
        if booking_id:
            booking = Booking.objects.filter(
                id=booking_id,
                user=self.request.user,
                restaurant=restaurant,
                status=Booking.COMPLETED,
            ).first()
            if not booking:
                raise PermissionDenied("Review can only be attached to your completed reservation.")
        else:
            booking = (
                Booking.objects.filter(
                    user=self.request.user,
                    restaurant=restaurant,
                    status=Booking.COMPLETED,
                )
                .order_by('-date', '-time')
                .first()
            )
            if not booking:
                raise PermissionDenied("Only guests with a completed visit can leave a review.")

        serializer.save(
            user=self.request.user, 
            restaurant=restaurant,
            booking=booking
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        
        is_restaurant_admin = False
        if hasattr(user, 'profile'):
            if user.profile.role in ('restaurant_admin', 'restaurant_owner', 'manager') and instance.restaurant.owner == user:
                is_restaurant_admin = True
            elif getattr(user.profile, 'restaurant', None) == instance.restaurant:
                is_restaurant_admin = True
                
        if not is_restaurant_admin and not getattr(user.profile, 'role', '') == 'global_admin':
            return Response({"detail": "Only restaurant staff can reply to reviews."}, status=status.HTTP_403_FORBIDDEN)
            
        return super().partial_update(request, *args, **kwargs)

class ZoneViewSet(viewsets.ModelViewSet):
    serializer_class = ZoneSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    required_feature = "zones"

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticatedOrReadOnly()]
        return [permissions.IsAuthenticated(), HasRestaurantFeature()]

    def get_queryset(self):
        qs = Zone.objects.all()
        restaurant_id = self.request.query_params.get('restaurant_id')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        else:
            user = self.request.user
            if user.is_authenticated:
                from core.utils import get_user_restaurant
                restaurant = get_user_restaurant(user)
                if restaurant:
                    qs = qs.filter(restaurant=restaurant)
                else:
                    qs = Zone.objects.none()
            else:
                 qs = Zone.objects.none()
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        from core.utils import get_user_restaurant
        restaurant = get_user_restaurant(user)
        if not restaurant:
            raise PermissionDenied("You don't have a restaurant to attach zones to.")
        allowed, message = restaurant.can_add_resource('zones')
        if not allowed:
            log_restaurant_event(
                restaurant,
                actor=user,
                event_type='plan_limit_blocked',
                target_type='zone',
                summary=message or 'Zone limit reached.',
                payload={'resource': 'zones'},
            )
            raise ValidationError({"detail": message})
        zone = serializer.save(restaurant=restaurant)
        log_restaurant_event(
            restaurant,
            actor=user,
            event_type='zone_created',
            target_type='zone',
            target_id=zone.id,
            summary=f"Создана зона {zone.name}.",
            payload={'zone_id': zone.id},
        )

class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    required_feature = "shifts"

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticatedOrReadOnly()]
        return [permissions.IsAuthenticated(), HasRestaurantFeature()]

    def get_queryset(self):
        qs = Shift.objects.all()
        restaurant_id = self.request.query_params.get('restaurant_id')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        else:
            user = self.request.user
            if user.is_authenticated:
                from core.utils import get_user_restaurant
                restaurant = get_user_restaurant(user)
                if restaurant:
                    qs = qs.filter(restaurant=restaurant)
                else:
                    qs = Shift.objects.none()
            else:
                 qs = Shift.objects.none()
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        from core.utils import get_user_restaurant
        restaurant = get_user_restaurant(user)
        if not restaurant:
            raise PermissionDenied("You don't have a restaurant to attach shifts to.")
        serializer.save(restaurant=restaurant)
