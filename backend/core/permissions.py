from rest_framework import permissions
from core.utils import get_user_profile

def _get_profile(user):
    return get_user_profile(user)

class IsRestaurantAdmin(permissions.BasePermission):
    """Allows access only to restaurant owners."""
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and p.is_owner)

class IsGlobalAdmin(permissions.BasePermission):
    """Allows access only to platform global admins."""
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and p.is_global_admin)

class IsRestaurantOrGlobalAdmin(permissions.BasePermission):
    """Allows access to restaurant owners and global admins."""
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_owner or p.is_global_admin))

class IsManager(permissions.BasePermission):
    """Allows access to restaurant managers, owners, and global admins."""
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_manager or p.is_owner or p.is_global_admin))

class IsHost(permissions.BasePermission):
    """Allows access to hosts, managers, owners, and global admins."""
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_host or p.is_manager or p.is_owner or p.is_global_admin))

class CanManageTables(permissions.BasePermission):
    """
    Permission to manage tables.
    Owner/GlobalAdmin: can create, edit, delete tables.
    Manager: can create, edit tables (no delete).
    Host: read-only access (list/retrieve/status).
    """
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        if not p:
            return False
        if p.is_global_admin or p.is_owner or p.is_manager:
            return True
        if p.is_host and view.action in ['list', 'retrieve', 'status']:
            return True
        return False

    def has_object_permission(self, request, view, obj):
        p = _get_profile(request.user)
        if not p:
            return False
        if view.action == 'destroy':
            return p.is_owner or p.is_global_admin
        if view.action in ['update', 'partial_update', 'update_status']:
            return p.is_owner or p.is_manager or p.is_global_admin
        # Default read access for all staff
        return p.is_staff_member or p.is_global_admin

class CanManageReservations(permissions.BasePermission):
    """Allows any staff member (Owner, Manager, Host, GlobalAdmin) to manage reservations."""
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        if not p:
            return False
        if p.is_global_admin:
            return True
        if not p.is_staff_member:
            return False
        from core.utils import get_user_restaurant
        return get_user_restaurant(request.user) is not None

class CanViewCustomers(permissions.BasePermission):
    """Allows Owner, Manager, GlobalAdmin to view CRM customers."""
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_owner or p.is_manager or p.is_global_admin))

class CanEditRestaurant(permissions.BasePermission):
    """Only Owner and GlobalAdmin can edit restaurant settings."""
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_owner or p.is_global_admin))

class IsRestaurantStaff(permissions.BasePermission):
    """Generic permission validating the user is staff OR a global admin."""
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        if not p:
            return False
        if p.is_global_admin:
            return True
        # For staff members, ensure they actually have a restaurant assigned (or are owners who own one)
        from core.utils import get_user_restaurant
        if p.is_staff_member and get_user_restaurant(request.user) is not None:
            return True
        return False


class HasRestaurantFeature(permissions.BasePermission):
    """
    Validates that the user's restaurant subscription includes the requested feature.
    Set `required_feature` on the view.
    """
    message = "Эта функция недоступна без подходящей подписки."

    def has_permission(self, request, view):
        p = _get_profile(request.user)
        if not p:
            return False
        if p.is_global_admin:
            return True
        from core.utils import get_user_restaurant
        restaurant = get_user_restaurant(request.user)
        if restaurant is None:
            self.message = "No associated restaurant."
            return False
        feature = getattr(view, 'required_feature', None)
        if not feature:
            return True
        if restaurant.has_feature(feature):
            return True
        self.message = (
            f"Тариф ресторана '{restaurant.get_plan_display()}' не включает функцию '{feature}'. "
            "Переключите подписку на Plus или Pro в Django admin."
        )
        return False
