from django.contrib.admin import AdminSite


from django.contrib import admin


class SuperuserOnlyAdminSite(AdminSite):
    def has_permission(self, request):
        user = getattr(request, "user", None)
        return bool(user and user.is_active and user.is_superuser)


secure_admin_site = SuperuserOnlyAdminSite(name="secure_admin")

# Ensure @admin.register and admin.site.register use the secured site.
admin.site = secure_admin_site
