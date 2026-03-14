from rest_framework import permissions


class IsRestaurantAdmin(permissions.BasePermission):
    """
    Restricts access to restaurant_admin role only.

    (Re-declared locally to avoid tight coupling to core.permissions implementation details.)
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role == "restaurant_admin"
        )

