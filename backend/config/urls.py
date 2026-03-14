from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('venues.urls')),
    path('api/v1/', include('contractors.urls')),
    path('api/v1/auth/', include('core.urls')),
    path('api/v1/health/', include('core.health_urls')),
    path('api/v1/restaurants/', include('restaurants.urls')),
    path('api/v1/crm/', include('crm.urls')),
    path('api/v1/analytics/', include('analytics.urls')),
    path('api/v1/reports/', include('reports.urls')),
    path('api/v1/bookings/', include('bookings.urls')),
    path('api/v1/reservations/', include(('bookings.urls', 'reservations'), namespace='reservations')),
    path('api/v1/tables/', include('restaurants.table_urls')),
    path('api/v1/', include('orders.urls')),
    path('api/v1/chat/', include('chat.urls')),
    path('api/v1/automations/', include('automations.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
