from rest_framework import viewsets, permissions
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Profile


class OptionalPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class OptionalPaginationMixin:
    """
    Backward-compatible pagination:
    returns plain list unless `page` or `page_size` provided.
    """
    pagination_class = OptionalPageNumberPagination

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        if 'page' not in request.query_params and 'page_size' not in request.query_params:
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class TenantModelViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet for multi-tenant isolation.
    Ensures that users can only access data belonging to their assigned restaurant.
    """
    def get_queryset(self):
        return self.queryset.filter(
            restaurant=self.request.user.profile.restaurant
        )

    def perform_create(self, serializer):
        user = self.request.user
        profile = None
        if hasattr(user, 'profile'):
            try:
                profile = user.profile
            except Profile.DoesNotExist:
                profile = None
            except AttributeError:
                profile = None
        
        restaurant = getattr(user, 'owned_restaurant', None)
        if not restaurant and profile:
            restaurant = profile.restaurant

        if restaurant:
            serializer.save(restaurant=restaurant)
        else:
            raise PermissionDenied("Пользователь не связан ни с одним рестораном.")
