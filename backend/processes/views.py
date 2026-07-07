from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsTenantMember, RolePermission, TenantObjectPermission
from .models import Process
from .serializers import ProcessListSerializer, ProcessSerializer


class ProcessViewSet(viewsets.ModelViewSet):
    """Standalone process identity card management."""

    serializer_class = ProcessSerializer
    permission_classes = [
        IsAuthenticated,
        IsTenantMember,
        TenantObjectPermission,
        RolePermission,
    ]
    ownership_fields = ('responsible',)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'department', 'responsible']
    search_fields = ['reference', 'title', 'process_type', 'finality']
    ordering_fields = [
        'reference',
        'title',
        'effective_date',
        'created_at',
        'updated_at',
    ]
    ordering = ['reference']

    def get_queryset(self):
        if hasattr(self.request, 'tenant'):
            return Process.objects.for_company(
                self.request.tenant
            ).select_related(
                'department', 'responsible', 'replacement'
            )
        return Process.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return ProcessListSerializer
        return ProcessSerializer

    def perform_create(self, serializer):
        serializer.save(company=self.request.tenant)
