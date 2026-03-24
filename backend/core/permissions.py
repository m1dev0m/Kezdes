from rest_framework import permissions

def _get_profile(user):
    if user and user.is_authenticated and hasattr(user, 'profile'):
        return user.profile
    return None

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
    Host: can view/assign tables via endpoints (read-level access).
    """
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_owner or p.is_manager or p.is_global_admin or (p.is_host and view.action in ['list', 'retrieve'])))

    def has_object_permission(self, request, view, obj):
        p = _get_profile(request.user)
        if not p:
            return False
        if view.action == 'destroy':
            return p.is_owner or p.is_global_admin
        if view.action in ['update', 'partial_update']:
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
