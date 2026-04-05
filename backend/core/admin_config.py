from django.contrib.admin.apps import AdminConfig


class KezdesAdminConfig(AdminConfig):
    default_site = "core.admin_site.SuperuserOnlyAdminSite"

