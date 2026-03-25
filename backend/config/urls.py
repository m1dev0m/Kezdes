from core.admin_site import secure_admin_site
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from core.views import RegisterView
urlpatterns = [
    path(f'{settings.ADMIN_URL}/', secure_admin_site.urls),
    path('register/', RegisterView.as_view(), name='register_root'),
    path('api/v1/auth/', include('core.urls')),
    path('api/v1/register/', RegisterView.as_view(), name='register_v1'),
    path('api/v1/health/', include('core.health_urls')),
    path('api/v1/restaurants/', include('restaurants.urls')),
    path('api/v1/crm/', include('crm.urls')),
    path('api/v1/bookings/', include('bookings.urls')),
    path('api/v1/tables/', include('restaurants.table_urls')),
    path('api/v1/chat/', include('chat.urls')),
    path('api/v1/analytics/', include('analytics.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/reports/', include('reports.urls')),
    path('api/v1/automations/', include('automations.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
