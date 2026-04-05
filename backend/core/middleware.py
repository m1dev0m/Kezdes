from django.conf import settings
from django.http import HttpResponseForbidden


class AdminIPAllowlistMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.admin_prefix = f"/{getattr(settings, 'ADMIN_URL', 'admin').strip('/')}/"

    def __call__(self, request):
        normalized_path = request.path.rstrip('/') + '/'
        if normalized_path.startswith(self.admin_prefix):
            allowlist = getattr(settings, 'ALLOW_ADMIN_IPS', None) or []
            if allowlist:
                ip = self._get_client_ip(request)
                if ip not in allowlist:
                    return HttpResponseForbidden('Forbidden')
        return self.get_response(request)

    def _get_client_ip(self, request):
        remote_addr = request.META.get('REMOTE_ADDR')
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        trusted_proxies = getattr(settings, 'TRUSTED_PROXY_IPS', None) or []

        if xff and remote_addr and remote_addr in trusted_proxies:
            return xff.split(',')[0].strip()

        return remote_addr
