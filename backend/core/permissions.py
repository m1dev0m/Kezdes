from rest_framework import permissions


class IsRestaurantAdmin(permissions.BasePermission):
    """
    Allows access only to restaurant owners (owner role).
    Owner can: create/edit/delete tables, manage reservations, view customers, edit restaurant
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role in ('restaurant_admin', 'owner')
        )


class IsGlobalAdmin(permissions.BasePermission):
    """
    Allows access only to global admin (platform administrator).
    Can: approve/reject restaurants, view all restaurants, view all bookings, block users, manage system
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role == 'global_admin'
        )


class IsRestaurantOrGlobalAdmin(permissions.BasePermission):
    """Allows access to restaurant owners and global admins."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'profile')
            and request.user.profile.role in ('restaurant_admin', 'owner', 'global_admin')
        )


class IsManager(permissions.BasePermission):
    """
    Allows access to restaurant managers.
    Manager can: view reservations, confirm/cancel reservations, manage tables
    Cannot: delete restaurant, change owner
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role in ('manager', 'owner', 'restaurant_admin', 'global_admin')
        )


class IsHost(permissions.BasePermission):
    """
    Allows access to hosts/receptionists.
    Host can: view reservations, check-in guests, create manual reservations, change tables
    Cannot: change restaurant settings, delete tables
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role in ('host', 'hostess', 'manager', 'owner', 'restaurant_admin', 'global_admin')
        )


class CanManageTables(permissions.BasePermission):
    """
    Permission to manage tables.
    Owner: can create, edit, delete tables
    Manager: can create, edit tables (no delete)
    Host: can only view and assign tables
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role in ('owner', 'restaurant_admin', 'manager', 'global_admin')
        )

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        role = request.user.profile.role
        # Only owners/admins can delete
        if view.action == 'destroy':
            return role in ('owner', 'restaurant_admin', 'global_admin')
        return role in ('owner', 'restaurant_admin', 'manager', 'global_admin')


class CanManageReservations(permissions.BasePermission):
    """
    Permission to manage reservations.
    Owner, Manager, Host: can view, confirm, cancel reservations
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role in ('owner', 'restaurant_admin', 'manager', 'host', 'hostess', 'global_admin')
        )


class CanViewCustomers(permissions.BasePermission):
    """
    Permission to view customers.
    Owner and Manager can view customer data.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role in ('owner', 'restaurant_admin', 'manager', 'global_admin')
        )


class CanEditRestaurant(permissions.BasePermission):
    """
    Permission to edit restaurant settings.
    Only Owner can edit restaurant details.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role in ('owner', 'restaurant_admin', 'global_admin')
        )


class IsRestaurantStaff(permissions.BasePermission):
    """
    Generic permission for any restaurant staff member.
    Owner, Manager, Host can access restaurant-specific features.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role in (
                'owner', 'restaurant_admin', 'restaurant_owner',
                'manager', 'host', 'hostess', 'worker', 'global_admin'
            ) and (
                request.user.profile.role == 'global_admin' or
                request.user.profile.restaurant is not None
            )
        )
