from rest_framework import permissions
from core.utils import get_user_profile

def _get_profile(user):
    return get_user_profile(user)

class IsRestaurantAdmin(permissions.BasePermission):
    
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and p.is_owner)

class IsGlobalAdmin(permissions.BasePermission):
    
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and p.is_global_admin)

class IsRestaurantOrGlobalAdmin(permissions.BasePermission):
    
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_owner or p.is_global_admin))

class IsManager(permissions.BasePermission):
    
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_manager or p.is_owner or p.is_global_admin))

class IsHost(permissions.BasePermission):
    
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_host or p.is_manager or p.is_owner or p.is_global_admin))

class CanManageTables(permissions.BasePermission):
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
                                           
        return p.is_staff_member or p.is_global_admin

class CanManageReservations(permissions.BasePermission):
    
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
    
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_owner or p.is_manager or p.is_global_admin))

class CanEditRestaurant(permissions.BasePermission):
    
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        return bool(p and (p.is_owner or p.is_global_admin))

class IsRestaurantStaff(permissions.BasePermission):
    
    def has_permission(self, request, view):
        p = _get_profile(request.user)
        if not p:
            return False
        if p.is_global_admin:
            return True
                                                                                                        
        from core.utils import get_user_restaurant
        if p.is_staff_member and get_user_restaurant(request.user) is not None:
            return True
        return False


class HasRestaurantFeature(permissions.BasePermission):
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
