from django.contrib.admin import AdminSite

class SuperuserOnlyAdminSite(AdminSite):
    def has_permission(self, request):
        user = getattr(request, "user", None)
        return bool(user and user.is_active and user.is_superuser)
