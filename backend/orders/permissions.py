from rest_framework import permissions
from core.utils import get_user_profile


class IsRestaurantAdmin(permissions.BasePermission):
    """
    Restricts access to canonical restaurant owner role only.

    (Re-declared locally to avoid tight coupling to core.permissions implementation details.)
    """

    def has_permission(self, request, view):
        profile = get_user_profile(request.user)
        return bool(
            request.user
            and request.user.is_authenticated
            and profile
            and profile.is_owner
        )
