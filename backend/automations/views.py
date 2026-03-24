from rest_framework import viewsets, permissions
from .models import AutomationLog
from .serializers import AutomationLogSerializer

class AutomationLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AutomationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AutomationLog.objects.filter(
            restaurant=self.request.user.profile.restaurant
        ).select_related('restaurant')
