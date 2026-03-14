from rest_framework import viewsets, permissions
from .models import AutomationLog
from .serializers import AutomationLogSerializer

class AutomationLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AutomationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        restaurant_id = self.request.query_params.get('restaurant_id')
        
        qs = AutomationLog.objects.all().select_related('customer')
        
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
            
        # Filter by owner or staff
        return qs.filter(restaurant__owner=user) | qs.filter(restaurant__staff_profiles__user=user)
