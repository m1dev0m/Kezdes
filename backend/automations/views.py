from rest_framework import viewsets, permissions
from .models import AutomationLog
from .serializers import AutomationLogSerializer
from core.permissions import HasRestaurantFeature

class AutomationLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AutomationLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasRestaurantFeature]
    required_feature = "automations"

    def get_queryset(self):
        from core.utils import get_user_restaurant
        return AutomationLog.objects.filter(
            restaurant=get_user_restaurant(self.request.user)
        ).select_related('restaurant')
