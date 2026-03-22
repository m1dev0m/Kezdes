from django.conf import settings
from django.http import HttpResponseForbidden


class AdminIPAllowlistMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.admin_prefix = f"/{getattr(settings, 'ADMIN_URL', 'admin').strip('/')}/"

    def __call__(self, request):
        if request.path.startswith(self.admin_prefix):
            allowlist = getattr(settings, 'ALLOW_ADMIN_IPS', None) or []
            if allowlist:
                ip = self._get_client_ip(request)
                if ip not in allowlist:
                    return HttpResponseForbidden('Forbidden')
        return self.get_response(request)

    def _get_client_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
