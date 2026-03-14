from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Venue, Amenity
from .serializers import VenueSerializer, AmenitySerializer
class VenueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Venue.objects.all().prefetch_related('amenities')
    serializer_class = VenueSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['city']
    search_fields = ['name', 'description']
    ordering_fields = ['rating', 'review_count', 'price_medium']
class AmenityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Amenity.objects.all()
    serializer_class = AmenitySerializer
