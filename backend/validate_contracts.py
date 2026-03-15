#!/usr/bin/env python
"""
API Contract Validator
Checks that frontend URLs match backend routing
"""

import re
import sys
from pathlib import Path

# Backend routes (from urls.py and routers)
BACKEND_ROUTES = {
    'GET /api/v1/auth/me/': 'core.views.UserProfileView',
    'POST /api/v1/auth/login/': 'core.views.CustomTokenObtainPairView',
    'POST /api/v1/auth/login/refresh/': 'simplejwt.views.TokenRefreshView',
    
    'GET /api/v1/restaurants/': 'restaurants.views.RestaurantViewSet (list)',
    'GET /api/v1/restaurants/{id}/': 'restaurants.views.RestaurantViewSet (retrieve)',
    'GET /api/v1/restaurants/me/': 'restaurants.views.RestaurantViewSet (me action)',
    'GET /api/v1/restaurants/{id}/menu/': 'restaurants.views.RestaurantViewSet (menu)',
    
    'GET /api/v1/bookings/': 'bookings.views.BookingViewSet (list)',
    'GET /api/v1/bookings/my_restaurant/': 'bookings.views.BookingViewSet (my_restaurant)',
    'POST /api/v1/bookings/': 'bookings.views.BookingViewSet (create)',
    'GET /api/v1/bookings/available_slots/': 'bookings.views.BookingViewSet (available_slots)',
    
    'GET /api/v1/orders/': 'orders.views.OrderViewSet (list)',
    'GET /api/v1/orders/my_restaurant/': 'orders.views.OrderViewSet (my_restaurant)',
    'POST /api/v1/orders/': 'orders.views.OrderViewSet (create)',
    'POST /api/v1/orders/{id}/confirm/': 'orders.views.OrderViewSet (confirm)',
    
    'GET /api/v1/admin/items/': 'orders.views.AdminMenuItemViewSet (list)',
    'POST /api/v1/admin/items/': 'orders.views.AdminMenuItemViewSet (create)',
    
    'GET /api/v1/chat/messages/': 'chat.views.MessageViewSet (list)',
    'ws /ws/chat/{id}/': 'chat.routing (WS)',
    'ws /ws/bookings/{id}/': 'bookings.routing (WS)',
    
    'GET /api/v1/analytics/dashboard/': 'analytics.views.DashboardAnalyticsView',
}

def check_frontend_calls(web_crm_root='web_crm'):
    """Scan web_crm for API calls and check against backend routes"""
    
    src_dir = Path(web_crm_root) / 'src'
    issues = []
    
    # Pattern to find api calls
    api_patterns = [
        r"api\.get\(['\"`]([^'\"]+)",
        r"api\.post\(['\"`]([^'\"]+)",
        r"api\.patch\(['\"`]([^'\"]+)",
        r"useWebSocket\(\{\s*url:\s*['\"`]([^'\"]+)",
    ]
    
    for py_file in src_dir.rglob('*.ts'):
        try:
            content = py_file.read_text()
            for pattern in api_patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    url = match
                    # Normalize URL
                    if '{' in url and '}' in url:
                        url_normalized = re.sub(r'\$\{[^}]+\}', '{id}', url)
                    else:
                        url_normalized = url
                    
                    # Check if URL exists in backend routes
                    full_url = f"GET {url_normalized}" if 'ws' not in url else f"ws {url_normalized}"
                    found = False
                    for backend_route in BACKEND_ROUTES:
                        if backend_route.startswith(full_url.split()[0]):
                            if '{id}' in full_url and '{id}' in backend_route:
                                found = True
                                break
                            elif full_url == backend_route:
                                found = True
                                break
                    
                    if not found and url.startswith(('http', 'ws', '/')):
                        issues.append({
                            'file': str(py_file.relative_to(web_crm_root)),
                            'url': url,
                            'status': '⚠️  POTENTIAL 404/403'
                        })
        except Exception as e:
            pass
    
    return issues

if __name__ == '__main__':
    issues = check_frontend_calls()
    
    print("\n📋 Frontend-Backend Contract Check\n")
    print("=" * 70)
    
    if issues:
        print(f"Found {len(issues)} potential issues:\n")
        for issue in issues[:10]:  # Show first 10
            print(f"  {issue['status']}")
            print(f"    File: {issue['file']}")
            print(f"    URL:  {issue['url']}\n")
    else:
        print("✅ No obvious contract mismatches found")
    
    print("=" * 70)
    print("\nNote: Manual verification recommended")
    print("      Check browser console Network tab while using the app")
