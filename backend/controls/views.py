from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Count, Avg
from django.utils import timezone
from core.permissions import IsTenantMember, TenantObjectPermission, RolePermission, IsOwnerOrAdmin
from library.models import Framework
from compliance.models import FrameworkAdoption
from .models import (
    ReferenceControl, AppliedControl,
    RequirementReferenceControl, ControlException, UnifiedControl, UnifiedControlMapping
)
from .serializers import (
    ReferenceControlSerializer, ReferenceControlListSerializer,
    AppliedControlSerializer, AppliedControlListSerializer,
    RequirementReferenceControlSerializer, ControlExceptionSerializer,
    ControlCoverageSerializer, ControlDashboardSerializer,
    UnifiedControlSerializer, UnifiedControlMappingSerializer,
    AppliedControlFrameworkCoverageSerializer,
)
from .services import (
    ControlApplicationService,
    ControlAnalyticsService,
    ControlMappingSuggestionService,
)
from library.scoping import (
    framework_scope_q,
    limit_framework_coverage,
    limit_frameworks,
    limit_requirement_mappings,
)


class ReferenceControlViewSet(viewsets.ModelViewSet):
    """Reference control management — read-only for users, admin-only for writes."""

    queryset = ReferenceControl.objects.all()
    serializer_class = ReferenceControlSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'control_family', 'control_type', 'automation_level', 'priority', 'is_published'
    ]
    search_fields = ['code', 'name', 'description', 'tags']
    ordering_fields = ['code', 'name', 'priority', 'created_at']
    ordering = ['code']

    def get_queryset(self):
        qs = super().get_queryset().filter(
            is_deleted=False,
            requirement_mappings__is_deleted=False,
        ).filter(
            framework_scope_q('requirement_mappings__requirement__framework__code')
        ).distinct()
        if not self.request.user.is_staff:
            qs = qs.filter(is_published=True)

        adopted_only = self.request.query_params.get("adopted_only")
        tenant = getattr(self.request, "tenant", None)
        if adopted_only and adopted_only.lower() in {"1", "true", "yes"}:
            if tenant is None:
                return qs.none()

            adopted_framework_ids = FrameworkAdoption.objects.filter(
                company=tenant,
                is_deleted=False,
            ).filter(
                framework_scope_q('framework__code')
            ).exclude(
                adoption_status="suspended"
            ).values_list("framework_id", flat=True)

            qs = qs.filter(
                requirement_mappings__requirement__framework_id__in=adopted_framework_ids,
                requirement_mappings__is_deleted=False,
            ).distinct()

        exclude_applied = self.request.query_params.get("exclude_applied")
        if exclude_applied and exclude_applied.lower() in {"1", "true", "yes"}:
            if tenant is None:
                return qs.none()

            qs = qs.exclude(
                applied_controls__company=tenant,
                applied_controls__department__isnull=True,
                applied_controls__is_deleted=False,
            ).exclude(
                unified_mappings__unified_control__applied_instances__company=tenant,
                unified_mappings__unified_control__applied_instances__department__isnull=True,
                unified_mappings__unified_control__applied_instances__is_deleted=False,
            ).distinct()

        # Filter by framework code — e.g. ?framework=ISO27001-2022
        framework = self.request.query_params.get("framework")
        if framework:
            qs = qs.filter(
                requirement_mappings__requirement__framework__code=framework,
                requirement_mappings__is_deleted=False,
            ).distinct()

        # Filter by StoredLibrary name — e.g. ?library=TISAX
        library = self.request.query_params.get("library")
        if library:
            qs = qs.filter(
                requirement_mappings__requirement__framework__loaded_library__stored_library__name=library,
                requirement_mappings__is_deleted=False,
            ).distinct()

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ReferenceControlListSerializer
        return ReferenceControlSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def requirements(self, request, pk=None):
        """Get all requirements mapped to this control."""
        control = self.get_object()
        mappings = limit_requirement_mappings(
            control.requirement_mappings.filter(is_deleted=False)
        )
        serializer = RequirementReferenceControlSerializer(mappings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def applied_instances(self, request, pk=None):
        """Get all applied instances of this control for the current company."""
        control = self.get_object()
        instances = control.applied_instances.filter(is_deleted=False)
        if hasattr(request, 'tenant'):
            instances = instances.filter(company=request.tenant)
        serializer = AppliedControlListSerializer(instances, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def suggest_mappings(self, request, pk=None):
        """Suggest similar controls across frameworks for unified mapping."""
        reference_control = self.get_object()
        limit = int(request.query_params.get('limit', 10))
        min_score = float(request.query_params.get('min_score', 35))
        suggestions = ControlMappingSuggestionService.suggest_for_reference_control(
            reference_control=reference_control,
            limit=limit,
            min_score=min_score,
        )
        return Response({
            'source_control': {
                'id': str(reference_control.id),
                'code': reference_control.code,
                'name': reference_control.name,
            },
            'suggestions': suggestions,
        })



class UnifiedControlViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Unified Control Library
    
    Read-only access to the internal unified control library.
    These are the controls your company implements to satisfy multiple frameworks.
    """
    queryset = UnifiedControl.objects.filter(is_active=True)
    serializer_class = UnifiedControlSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]
    filter_backends = [OrderingFilter]
    ordering = ["control_code"]
    
    def get_queryset(self):
        queryset = super().get_queryset().filter(
            reference_mappings__reference_control__requirement_mappings__is_deleted=False,
        ).filter(
            framework_scope_q(
                'reference_mappings__reference_control__requirement_mappings__requirement__framework__code'
            )
        ).distinct()
        
        # Filter by domain
        domain = self.request.query_params.get('domain')
        if domain:
            queryset = queryset.filter(domain=domain)
        
        # Filter by tags
        tags = self.request.query_params.getlist('tags')
        if tags:
            queryset = queryset.filter(tags__contains=tags)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(control_name__icontains=search) |
                Q(description__icontains=search) |
                Q(control_code__icontains=search)
            )
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def framework_coverage(self, request, pk=None):
        """
        Get all frameworks this unified control satisfies
        """
        unified_control = self.get_object()
        coverage = unified_control.get_framework_coverage()

        return Response(limit_framework_coverage(coverage))
    
    @action(
        detail=True,
        methods=['get'],
        permission_classes=[IsAuthenticated, IsTenantMember, IsOwnerOrAdmin],
    )
    def implementations(self, request, pk=None):
        """
        Get all company implementations of this unified control
        (Admin/Owner only)
        """
        unified_control = self.get_object()
        company = request.tenant  # From TenantMiddleware
        
        implementations = AppliedControl.objects.filter(
            company=company,
            unified_control=unified_control,
            is_deleted=False
        )
        
        serializer = AppliedControlSerializer(implementations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def mappings(self, request, pk=None):
        unified_control = self.get_object()
        mappings = unified_control.reference_mappings.select_related(
            'reference_control'
        ).order_by('reference_control__code')
        serializer = UnifiedControlMappingSerializer(mappings, many=True)
        return Response(serializer.data)


class UnifiedControlMappingViewSet(viewsets.ModelViewSet):
    """Admin-managed mappings between framework-specific and unified controls."""

    queryset = UnifiedControlMapping.objects.all()
    serializer_class = UnifiedControlMappingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['reference_control', 'unified_control', 'coverage_type']
    ordering_fields = ['reference_control__code', 'unified_control__control_code', 'coverage_percentage']
    ordering = ['reference_control__code']

    def get_queryset(self):
        return super().get_queryset().select_related(
            'reference_control', 'unified_control', 'verified_by'
        )

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'validate_mapping', 'auto_map']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def validate_mapping(self, request, pk=None):
        mapping = self.get_object()
        mapping.verified_by = request.user
        mapping.verified_at = timezone.now()
        mapping.save(update_fields=['verified_by', 'verified_at', 'updated_at'])
        return Response({'message': 'Unified mapping verified successfully'})

    @action(detail=False, methods=['get'])
    def suggest(self, request):
        reference_control_id = request.query_params.get('reference_control')
        if not reference_control_id:
            return Response(
                {'error': 'reference_control query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reference_control = ReferenceControl.objects.get(
                id=reference_control_id,
                is_deleted=False,
            )
        except ReferenceControl.DoesNotExist:
            return Response(
                {'error': 'Reference control not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        limit = int(request.query_params.get('limit', 10))
        min_score = float(request.query_params.get('min_score', 35))
        suggestions = ControlMappingSuggestionService.suggest_for_reference_control(
            reference_control=reference_control,
            limit=limit,
            min_score=min_score,
        )
        return Response({
            'source_control': {
                'id': str(reference_control.id),
                'code': reference_control.code,
                'name': reference_control.name,
            },
            'suggestions': suggestions,
        })

    @action(detail=False, methods=['post'])
    def auto_map(self, request):
        source_control_id = request.data.get('reference_control')
        target_control_ids = request.data.get('target_reference_controls', [])
        unified_control_id = request.data.get('unified_control')

        if not source_control_id:
            return Response(
                {'error': 'reference_control is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not target_control_ids:
            return Response(
                {'error': 'target_reference_controls is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            source_control = ReferenceControl.objects.get(
                id=source_control_id,
                is_deleted=False,
            )
        except ReferenceControl.DoesNotExist:
            return Response(
                {'error': 'Source reference control not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        target_controls = list(
            ReferenceControl.objects.filter(
                id__in=target_control_ids,
                is_deleted=False,
            )
        )
        if len(target_controls) != len(target_control_ids):
            return Response(
                {'error': 'One or more target reference controls were not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        unified_control = None
        if unified_control_id:
            try:
                unified_control = UnifiedControl.objects.get(id=unified_control_id)
            except UnifiedControl.DoesNotExist:
                return Response(
                    {'error': 'Unified control not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        control_code = request.data.get('control_code')
        if unified_control is None and not control_code:
            control_code = f"UC-AUTO-{timezone.now().strftime('%Y%m%d%H%M%S')}"

        unified_control, created_mappings = ControlMappingSuggestionService.create_unified_mapping_group(
            source_control=source_control,
            target_controls=target_controls,
            unified_control=unified_control,
            control_code=control_code,
            control_name=request.data.get('control_name') or source_control.name,
            mapping_rationale=request.data.get('mapping_rationale', ''),
            created_by=request.user,
            coverage_type=request.data.get('coverage_type', 'full'),
            coverage_percentage=int(request.data.get('coverage_percentage', 100)),
        )

        serializer = UnifiedControlMappingSerializer(created_mappings, many=True)
        return Response(
            {
                'unified_control': {
                    'id': str(unified_control.id),
                    'control_code': unified_control.control_code,
                    'control_name': unified_control.control_name,
                },
                'created_mappings': serializer.data,
            },
            status=status.HTTP_201_CREATED
        )


class AppliedControlViewSet(viewsets.ModelViewSet):
    """
    Applied Controls - Company implementations
    ENHANCED with maturity tracking
    """
    serializer_class = AppliedControlSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, TenantObjectPermission, RolePermission]
    permission_action_map = {
        'list': 'view_any',
        'retrieve': 'view_any',
        'create': 'create_any',
        'update': ('update_any', 'update_own'),
        'partial_update': ('update_any', 'update_own'),
        'destroy': ('delete_any', 'delete_own'),
        'apply_control': 'create_any',
        'apply_framework_controls': 'create_any',
        'submit_validation': ('update_any', 'update_own'),
        'approve_validation': 'update_any',
        'reject_validation': 'update_any',
        'dashboard': 'view_any',
        'overdue_reviews': 'view_any',
        'with_deficiencies': 'view_any',
        'effectiveness_metrics': 'view_any',
        'assess_maturity': ('update_any', 'update_own'),
        'maturity_summary': 'view_any',
        'framework_coverage': 'view_any',
    }
    ownership_fields = ('control_owner', 'created_by')
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'status', 'validation_status', 'department', 'control_owner',
        'has_deficiencies'
    ]
    search_fields = ['reference_control__code', 'reference_control__name', 'implementation_notes']
    ordering_fields = ['created_at', 'next_review_date', 'effectiveness_rating']
    ordering = ['-created_at']
    
    def get_queryset(self):
        company = self.request.tenant
        queryset = AppliedControl.objects.filter(
            company=company,
            is_deleted=False
        ).filter(
            (
                Q(reference_control__requirement_mappings__is_deleted=False) &
                framework_scope_q('reference_control__requirement_mappings__requirement__framework__code')
            ) |
            framework_scope_q(
                'unified_control__reference_mappings__reference_control__requirement_mappings__requirement__framework__code'
            )
        ).select_related(
            'reference_control',
            'unified_control',
            'control_owner',
            'department',
            'validation_requested_by',
            'validated_by',
        ).distinct()
        
        # Filter by maturity level
        maturity = self.request.query_params.get('maturity_level')
        if maturity:
            queryset = queryset.filter(maturity_level=maturity)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        has_deficiencies = self.request.query_params.get('has_deficiencies')
        if has_deficiencies is not None:
            if has_deficiencies.lower() in {'1', 'true', 'yes'}:
                queryset = queryset.filter(has_deficiencies=True)
            elif has_deficiencies.lower() in {'0', 'false', 'no'}:
                queryset = queryset.filter(has_deficiencies=False)

        validation_status = self.request.query_params.get('validation_status')
        if validation_status:
            queryset = queryset.filter(validation_status=validation_status)
        
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return AppliedControlListSerializer
        return AppliedControlSerializer

    def perform_create(self, serializer):
        serializer.save(company=self.request.tenant)

    @action(detail=False, methods=['post'])
    def apply_control(self, request):
        reference_control_id = request.data.get('reference_control')
        if not reference_control_id:
            return Response(
                {'error': 'reference_control is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reference_control = ReferenceControl.objects.get(
                id=reference_control_id,
                is_deleted=False,
            )
        except ReferenceControl.DoesNotExist:
            return Response(
                {'error': 'Reference control not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            applied_control, created = ControlApplicationService.apply_control(
                company=request.tenant,
                reference_control=reference_control,
                acting_user=request.user,
                department_id=request.data.get('department'),
                control_owner_id=request.data.get('control_owner'),
                status=request.data.get('status', 'not_started'),
                implementation_notes=request.data.get('implementation_notes', ''),
                custom_procedures=request.data.get('custom_procedures', ''),
            )
        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(applied_control)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'])
    def submit_validation(self, request, pk=None):
        applied_control = self.get_object()
        if applied_control.validation_status == 'approved':
            return Response(
                {'error': 'Approved controls must be changed before they can be resubmitted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        applied_control.validation_status = 'submitted'
        applied_control.validation_requested_by = request.user
        applied_control.validation_requested_at = timezone.now()
        applied_control.validated_by = None
        applied_control.validated_at = None
        applied_control.validation_notes = request.data.get('notes', '')
        applied_control.save()

        serializer = self.get_serializer(applied_control)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve_validation(self, request, pk=None):
        applied_control = self.get_object()
        if applied_control.validation_status != 'submitted':
            return Response(
                {'error': 'Only submitted controls can be approved.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        applied_control.validation_status = 'approved'
        applied_control.validated_by = request.user
        applied_control.validated_at = timezone.now()
        applied_control.validation_notes = request.data.get('notes', '')
        applied_control.last_review_date = timezone.now().date()
        applied_control.reviewed_by = request.user
        if applied_control.status in {'not_started', 'in_progress', 'implemented', 'testing'}:
            applied_control.status = 'operational'
        applied_control.save()

        serializer = self.get_serializer(applied_control)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject_validation(self, request, pk=None):
        applied_control = self.get_object()
        if applied_control.validation_status != 'submitted':
            return Response(
                {'error': 'Only submitted controls can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        notes = request.data.get('notes', '').strip()
        if not notes:
            return Response(
                {'error': 'Rejection notes are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        applied_control.validation_status = 'rejected'
        applied_control.validated_by = request.user
        applied_control.validated_at = timezone.now()
        applied_control.validation_notes = notes
        applied_control.last_review_date = timezone.now().date()
        applied_control.reviewed_by = request.user
        if applied_control.status != 'non_compliant':
            applied_control.status = 'needs_improvement'
        applied_control.save()

        serializer = self.get_serializer(applied_control)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def apply_framework_controls(self, request):
        framework_id = request.data.get('framework')
        if not framework_id:
            return Response(
                {'error': 'framework is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            framework = limit_frameworks(
                Framework.objects.filter(
                    is_deleted=False,
                    loaded_library__is_active=True,
                    loaded_library__is_deleted=False,
                )
            ).get(
                id=framework_id
            )
        except Framework.DoesNotExist:
            return Response(
                {'error': 'Framework not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        is_adopted = FrameworkAdoption.objects.filter(
            company=request.tenant,
            framework=framework,
            is_deleted=False,
        ).exclude(
            adoption_status='suspended'
        ).exists()
        if not is_adopted:
            return Response(
                {'error': 'Framework must be adopted before applying its controls'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            applied_controls = ControlApplicationService.apply_controls_for_framework(
                company=request.tenant,
                framework=framework,
                department_id=request.data.get('department'),
                acting_user=request.user,
            )
        except ValueError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(applied_controls, many=True)
        return Response(
            {
                'count': len(applied_controls),
                'results': serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        dashboard = ControlAnalyticsService.get_company_control_dashboard(
            company=request.tenant
        )
        serializer = ControlDashboardSerializer(dashboard)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue_reviews(self, request):
        overdue = self.get_queryset().filter(
            next_review_date__lt=timezone.now().date()
        )
        serializer = AppliedControlListSerializer(overdue, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def with_deficiencies(self, request):
        deficient_controls = self.get_queryset().filter(has_deficiencies=True)
        serializer = AppliedControlListSerializer(deficient_controls, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def effectiveness_metrics(self, request):
        metrics = ControlAnalyticsService.get_control_effectiveness_metrics(
            company=request.tenant
        )
        return Response(metrics)
    
    @action(detail=True, methods=['post'])
    def assess_maturity(self, request, pk=None):
        """
        Assess and update maturity level for a control
        
        Request body:
        {
          "maturity_level": 3,
          "maturity_notes": "Processes well documented and followed"
        }
        """
        applied_control = self.get_object()
        
        maturity_level = request.data.get('maturity_level')
        maturity_notes = request.data.get('maturity_notes', '')
        
        if maturity_level not in [1, 2, 3, 4, 5]:
            return Response(
                {'error': 'maturity_level must be 1-5'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        applied_control.maturity_level = maturity_level
        applied_control.maturity_notes = maturity_notes
        applied_control.maturity_assessment_date = timezone.now().date()
        applied_control.save()
        
        serializer = self.get_serializer(applied_control)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def maturity_summary(self, request):
        """
        Get maturity level summary for all controls
        """
        company = request.tenant
        
        summary = AppliedControl.objects.filter(
            company=company,
            is_deleted=False
        ).values('maturity_level').annotate(
            count=Count('id')
        ).order_by('maturity_level')
        
        return Response({
            'maturity_distribution': list(summary),
            'average_maturity': AppliedControl.objects.filter(
                company=company,
                is_deleted=False
            ).aggregate(avg=Avg('maturity_level'))['avg']
        })

    @action(detail=True, methods=['get'])
    def framework_coverage(self, request, pk=None):
        applied_control = self.get_object()

        requirement_mappings = applied_control.reference_control.requirement_mappings.filter(
            is_deleted=False
        ).select_related('requirement__framework')

        frameworks = {}

        for mapping in requirement_mappings:
            framework_code = mapping.requirement.framework.code
            frameworks.setdefault(framework_code, [])
            frameworks[framework_code].append({
                'requirement_id': str(mapping.requirement.id),
                'requirement_code': mapping.requirement.code,
                'requirement_title': mapping.requirement.title,
                'coverage_level': mapping.coverage_level,
                'mapping_rationale': mapping.mapping_rationale,
                'matched_via': 'direct',
            })

        if applied_control.unified_control_id:
            unified_mappings = applied_control.unified_control.reference_mappings.select_related(
                'reference_control'
            ).prefetch_related(
                'reference_control__requirement_mappings__requirement__framework'
            )
            for unified_mapping in unified_mappings:
                for req_mapping in unified_mapping.reference_control.requirement_mappings.filter(is_deleted=False):
                    framework_code = req_mapping.requirement.framework.code
                    frameworks.setdefault(framework_code, [])
                    frameworks[framework_code].append({
                        'requirement_id': str(req_mapping.requirement.id),
                        'requirement_code': req_mapping.requirement.code,
                        'requirement_title': req_mapping.requirement.title,
                        'coverage_level': unified_mapping.coverage_type,
                        'mapping_rationale': unified_mapping.mapping_rationale,
                        'matched_via': 'unified',
                    })

        serializer = AppliedControlFrameworkCoverageSerializer({
            'applied_control_id': applied_control.id,
            'reference_control_code': applied_control.reference_control.code,
            'unified_control_code': (
                applied_control.unified_control.control_code
                if applied_control.unified_control_id else None
            ),
            'frameworks': limit_framework_coverage(frameworks),
        })
        return Response(serializer.data)

class RequirementReferenceControlViewSet(viewsets.ModelViewSet):
    """Requirement-control mapping management — admin-only for writes."""

    queryset = RequirementReferenceControl.objects.all()
    serializer_class = RequirementReferenceControlSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = [
        'requirement', 'reference_control', 'coverage_level',
        'is_primary', 'validation_status'
    ]
    ordering_fields = ['requirement__code', 'reference_control__code']
    ordering = ['requirement__code']

    def get_queryset(self):
        return limit_requirement_mappings(
            super().get_queryset().filter(is_deleted=False)
        ).select_related(
            'requirement', 'reference_control'
        )

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def validate_mapping(self, request, pk=None):
        """Validate a requirement-control mapping."""
        mapping = self.get_object()
        from django.utils import timezone
        mapping.validation_status = "validated"
        mapping.validated_by = request.user
        mapping.validated_at = timezone.now()
        mapping.save()
        return Response({"message": "Mapping validated successfully"})


class ControlExceptionViewSet(viewsets.ModelViewSet):
    """Control exception management."""

    serializer_class = ControlExceptionSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, TenantObjectPermission, RolePermission]
    permission_action_map = {
        'list': 'view_any',
        'retrieve': 'view_any',
        'create': ('create_any', 'manage_risks'),
        'update': ('update_any', 'manage_risks'),
        'partial_update': ('update_any', 'manage_risks'),
        'destroy': ('delete_any', 'manage_risks'),
        'accept': ('update_any', 'manage_risks'),
        'expired': 'view_any',
    }
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['applied_control', 'exception_type']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        if hasattr(self.request, 'tenant'):
            return ControlException.objects.filter(
                company=self.request.tenant,
                is_deleted=False
            ).select_related('applied_control', 'accepted_by')
        return ControlException.objects.none()

    def perform_create(self, serializer):
        serializer.save(company=self.request.tenant)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept/approve an exception."""
        exception = self.get_object()
        from django.utils import timezone
        exception.accepted_by = request.user
        exception.accepted_at = timezone.now()
        exception.is_active = True
        exception.save()
        return Response({'message': 'Exception accepted'})

    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get expired exceptions."""
        from django.utils import timezone
        expired = self.get_queryset().filter(
            expiration_date__lt=timezone.now().date(),
            is_active=True
        )
        serializer = self.get_serializer(expired, many=True)
        return Response(serializer.data)
