from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Contractor
from .serializers import ContractorSerializer
class ContractorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Contractor.objects.all()
    serializer_class = ContractorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['city', 'category']
    search_fields = ['name', 'description']
    ordering_fields = ['rating', 'review_count', 'price_from']
