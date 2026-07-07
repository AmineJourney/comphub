"""
Business logic services for control management
"""
from difflib import SequenceMatcher
import re

from django.db import transaction
from django.db.models import Count, Q, Avg
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import ReferenceControl, AppliedControl, UnifiedControl, UnifiedControlMapping
from library.models import RequirementReferenceControl  # Import from library!

User = get_user_model()


class ControlApplicationService:
    """Service for applying reference controls to companies"""

    VALID_MAPPING_STATUSES = ("validated", "approved")

    @staticmethod
    def _get_adopted_framework_ids(company):
        from compliance.models import FrameworkAdoption

        return FrameworkAdoption.objects.filter(
            company=company,
            is_deleted=False,
        ).exclude(
            adoption_status='suspended'
        ).values_list('framework_id', flat=True)

    @staticmethod
    def _is_reference_control_adoptable(company, reference_control):
        adopted_framework_ids = ControlApplicationService._get_adopted_framework_ids(company)
        return reference_control.requirement_mappings.filter(
            requirement__framework_id__in=adopted_framework_ids,
            requirement__framework__loaded_library__is_active=True,
            requirement__framework__loaded_library__is_deleted=False,
            requirement__framework__is_deleted=False,
            is_deleted=False,
        ).exists()
    
    @staticmethod
    @transaction.atomic
    def apply_control(
        company,
        reference_control,
        department=None,
        control_owner=None,
        acting_user=None,
        department_id=None,
        control_owner_id=None,
        **kwargs,
    ):
        """
        Apply a reference control to a company
        
        Args:
            company: Company instance
            reference_control: ReferenceControl instance
            department: Optional Department instance
            control_owner: Optional User instance
            **kwargs: Additional AppliedControl fields
        
        Returns:
            tuple[AppliedControl, bool]: applied control and whether it was created
        """
        if department is None and department_id:
            department = getattr(company, "departments", None)
            department = department.filter(id=department_id, is_deleted=False).first() if department else None
            if department is None:
                raise ValueError("Department not found.")

        if control_owner is None and control_owner_id:
            control_owner = User.objects.filter(
                id=control_owner_id,
                is_deleted=False,
                memberships__company=company,
                memberships__is_deleted=False,
            ).first()
            if control_owner is None:
                raise ValueError("Control owner must be an active member of the company.")

        if control_owner is None and department and department.manager_id:
            control_owner = department.manager

        if control_owner is None:
            control_owner = acting_user

        if not ControlApplicationService._is_reference_control_adoptable(company, reference_control):
            raise ValueError(
                "This control is not available for the company's adopted frameworks."
            )

        unified_mapping = (
            reference_control.unified_mappings
            .select_related('unified_control')
            .order_by('-coverage_percentage', 'id')
            .first()
        )

        # Check if already applied
        existing = AppliedControl.objects.filter(
            company=company,
            reference_control=reference_control,
            department=department,
            is_deleted=False
        ).first()
        
        if existing:
            if (
                unified_mapping
                and unified_mapping.unified_control_id
                and existing.unified_control_id != unified_mapping.unified_control_id
            ):
                existing.unified_control = unified_mapping.unified_control
                existing.save(update_fields=['unified_control', 'updated_at'])
            return existing, False

        # Reuse an existing tenant implementation for the same unified control so
        # work done for one framework automatically carries over to sibling controls.
        if unified_mapping and unified_mapping.unified_control_id:
            shared_existing = AppliedControl.objects.filter(
                company=company,
                unified_control=unified_mapping.unified_control,
                department=department,
                is_deleted=False,
            ).first()
            if shared_existing:
                return shared_existing, False
        
        # Create applied control
        applied_control = AppliedControl.objects.create(
            company=company,
            reference_control=reference_control,
            unified_control=(
                unified_mapping.unified_control if unified_mapping else None
            ),
            department=department,
            control_owner=control_owner,
            status=kwargs.get('status', 'not_started'),
            implementation_notes=kwargs.get('implementation_notes', ''),
            custom_procedures=kwargs.get('custom_procedures', ''),
        )
        
        return applied_control, True
    
    @staticmethod
    @transaction.atomic
    def apply_controls_for_framework(company, framework, department=None, department_id=None, acting_user=None):
        """
        Apply all controls mapped to a framework's requirements
        
        Args:
            company: Company instance
            framework: Framework instance
            department: Optional Department instance
        
        Returns:
            List of created AppliedControl instances
        """
        if department is None and department_id:
            department = company.departments.filter(id=department_id, is_deleted=False).first()
            if department is None:
                raise ValueError("Department not found.")

        # Get all requirements for framework
        requirements = framework.requirements.filter(is_deleted=False)
        
        # Get all control mappings
        mappings = RequirementReferenceControl.objects.filter(
            requirement__in=requirements,
            is_primary=True,  # Only primary controls
            validation_status__in=ControlApplicationService.VALID_MAPPING_STATUSES,
            is_deleted=False
        ).select_related('reference_control')
        
        # Get unique controls
        controls = {mapping.reference_control for mapping in mappings}
        
        # Apply each control
        applied_controls = []
        seen_ids = set()
        for control in controls:
            applied, _ = ControlApplicationService.apply_control(
                company=company,
                reference_control=control,
                department=department,
                acting_user=acting_user,
            )
            if applied.id not in seen_ids:
                applied_controls.append(applied)
                seen_ids.add(applied.id)
        
        return applied_controls
    
    @staticmethod
    def get_control_coverage_for_requirement(company, requirement):
        """
        Calculate control coverage for a specific requirement
        
        Args:
            company: Company instance
            requirement: Requirement instance
        
        Returns:
            dict with coverage details
        """
        # Get control mappings for requirement
        mappings = RequirementReferenceControl.objects.filter(
            requirement=requirement,
            validation_status__in=ControlApplicationService.VALID_MAPPING_STATUSES,
            is_deleted=False
        ).select_related('reference_control')
        
        total_controls = mappings.count()
        if total_controls == 0:
            return {
                'total_controls': 0,
                'implemented_controls': 0,
                'coverage_percentage': 0,
                'status': 'no_controls'
            }
        
        # Get applied controls
        reference_control_ids = [m.reference_control.id for m in mappings]
        applied_controls = AppliedControl.objects.filter(
            company=company,
            reference_control_id__in=reference_control_ids,
            is_deleted=False
        )
        
        # Count by status
        operational_count = applied_controls.filter(
            status='operational'
        ).count()
        
        implemented_count = applied_controls.filter(
            status__in=['implemented', 'testing', 'operational']
        ).count()
        
        # Calculate coverage
        coverage_percentage = (implemented_count / total_controls) * 100
        
        # Determine overall status
        if operational_count == total_controls:
            status = 'fully_compliant'
        elif implemented_count > 0:
            status = 'partially_compliant'
        else:
            status = 'not_compliant'
        
        return {
            'total_controls': total_controls,
            'implemented_controls': implemented_count,
            'operational_controls': operational_count,
            'coverage_percentage': round(coverage_percentage, 2),
            'status': status
        }


class ControlAnalyticsService:
    """Service for control analytics and reporting"""
    
    @staticmethod
    def get_company_control_dashboard(company):
        """
        Get comprehensive control dashboard for a company
        
        Args:
            company: Company instance
        
        Returns:
            dict with dashboard metrics
        """
        applied_controls = AppliedControl.objects.filter(
            company=company,
            is_deleted=False
        )
        
        total_controls = applied_controls.count()
        
        # Status breakdown
        status_breakdown = applied_controls.values('status').annotate(
            count=Count('id')
        )
        
        # Calculate compliance score
        compliance_scores = [
            control.calculate_compliance_score() 
            for control in applied_controls
        ]
        avg_compliance_score = sum(compliance_scores) / len(compliance_scores) if compliance_scores else 0
        
        # Controls by family
        family_breakdown = applied_controls.values(
            'reference_control__control_family'
        ).annotate(count=Count('id'))
        
        # Overdue reviews
        overdue_reviews = applied_controls.filter(
            next_review_date__lt=timezone.now().date()
        ).count()
        
        # Deficiencies
        controls_with_deficiencies = applied_controls.filter(
            has_deficiencies=True
        ).count()
        
        # Evidence coverage
        controls_with_evidence = applied_controls.annotate(
            evidence_count=Count('evidence_links', filter=Q(evidence_links__is_deleted=False))
        ).filter(evidence_count__gt=0).count()
        
        return {
            'total_controls': total_controls,
            'status_breakdown': list(status_breakdown),
            'avg_compliance_score': round(avg_compliance_score, 2),
            'family_breakdown': list(family_breakdown),
            'overdue_reviews': overdue_reviews,
            'controls_with_deficiencies': controls_with_deficiencies,
            'evidence_coverage_percentage': round(
                (controls_with_evidence / total_controls * 100) if total_controls > 0 else 0,
                2
            )
        }
    
    @staticmethod
    def get_control_effectiveness_metrics(company):
        """
        Calculate control effectiveness metrics
        
        Args:
            company: Company instance
        
        Returns:
            dict with effectiveness metrics
        """
        applied_controls = AppliedControl.objects.filter(
            company=company,
            is_deleted=False,
            effectiveness_rating__isnull=False
        )
        
        if not applied_controls.exists():
            return {
                'avg_effectiveness': None,
                'tested_controls': 0,
                'untested_controls': AppliedControl.objects.filter(
                    company=company,
                    is_deleted=False
                ).count()
            }
        
        avg_effectiveness = applied_controls.aggregate(
            avg=Avg('effectiveness_rating')
        )['avg']
        
        tested_controls = AppliedControl.objects.filter(
            company=company,
            is_deleted=False,
            last_tested_date__isnull=False
        ).count()
        
        untested_controls = AppliedControl.objects.filter(
            company=company,
            is_deleted=False,
            last_tested_date__isnull=True
        ).count()
        
        return {
            'avg_effectiveness': round(avg_effectiveness, 2) if avg_effectiveness else None,
            'tested_controls': tested_controls,
            'untested_controls': untested_controls
        }


class ControlMappingSuggestionService:
    """Suggest and create shared control mappings across frameworks."""

    STOP_WORDS = {
        'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into',
        'des', 'les', 'pour', 'avec', 'dans', 'une', 'must', 'shall',
        'information', 'security', 'controle', 'control', 'gestion',
    }

    @staticmethod
    def _normalize_text(value):
        text = (value or '').lower()
        return re.sub(r'[^a-z0-9]+', ' ', text).strip()

    @staticmethod
    def _tokens(*values):
        tokens = set()
        for value in values:
            normalized = ControlMappingSuggestionService._normalize_text(value)
            for token in normalized.split():
                if len(token) > 2 and token not in ControlMappingSuggestionService.STOP_WORDS:
                    tokens.add(token)
        return tokens

    @staticmethod
    def _framework_codes(reference_control):
        return set(
            reference_control.requirement_mappings
            .filter(is_deleted=False)
            .select_related('requirement__framework')
            .values_list('requirement__framework__code', flat=True)
            .distinct()
        )

    @staticmethod
    def _name_similarity(source, candidate):
        return SequenceMatcher(
            None,
            ControlMappingSuggestionService._normalize_text(source.name),
            ControlMappingSuggestionService._normalize_text(candidate.name),
        ).ratio()

    @staticmethod
    def _description_similarity(source, candidate):
        return SequenceMatcher(
            None,
            ControlMappingSuggestionService._normalize_text(source.description),
            ControlMappingSuggestionService._normalize_text(candidate.description),
        ).ratio()

    @staticmethod
    def _token_similarity(source, candidate):
        source_tokens = ControlMappingSuggestionService._tokens(source.name, source.description)
        candidate_tokens = ControlMappingSuggestionService._tokens(candidate.name, candidate.description)
        if not source_tokens or not candidate_tokens:
            return 0.0
        intersection = len(source_tokens & candidate_tokens)
        union = len(source_tokens | candidate_tokens)
        return intersection / union if union else 0.0

    @staticmethod
    def _code_hint_similarity(source, candidate):
        source_code = (source.code or '').split('.')[:2]
        candidate_code = (candidate.code or '').split('.')[:2]
        return 1.0 if source_code and candidate_code and source_code[0] == candidate_code[0] else 0.0

    @staticmethod
    def score_similarity(source, candidate):
        family_bonus = 1.0 if source.control_family == candidate.control_family else 0.0
        token_score = ControlMappingSuggestionService._token_similarity(source, candidate)
        name_score = ControlMappingSuggestionService._name_similarity(source, candidate)
        description_score = ControlMappingSuggestionService._description_similarity(source, candidate)
        code_hint = ControlMappingSuggestionService._code_hint_similarity(source, candidate)

        raw_score = (
            family_bonus * 0.25 +
            token_score * 0.30 +
            name_score * 0.30 +
            description_score * 0.10 +
            code_hint * 0.05
        )
        return round(raw_score * 100, 2)

    @staticmethod
    def serialize_candidate(source, candidate, score):
        existing_mapping = (
            candidate.unified_mappings.select_related('unified_control').first()
        )
        return {
            'id': str(candidate.id),
            'code': candidate.code,
            'name': candidate.name,
            'control_family': candidate.control_family,
            'frameworks': sorted(ControlMappingSuggestionService._framework_codes(candidate)),
            'similarity_score': score,
            'existing_unified_control': (
                existing_mapping.unified_control.control_code if existing_mapping else None
            ),
        }

    @staticmethod
    def suggest_for_reference_control(reference_control, limit=10, min_score=35):
        source_frameworks = ControlMappingSuggestionService._framework_codes(reference_control)
        candidates = []

        queryset = ReferenceControl.objects.filter(
            is_deleted=False,
            is_published=True,
        ).exclude(id=reference_control.id)

        for candidate in queryset:
            candidate_frameworks = ControlMappingSuggestionService._framework_codes(candidate)
            if source_frameworks and candidate_frameworks and source_frameworks == candidate_frameworks:
                continue

            score = ControlMappingSuggestionService.score_similarity(reference_control, candidate)
            if score < min_score:
                continue

            candidates.append(
                ControlMappingSuggestionService.serialize_candidate(
                    reference_control, candidate, score
                )
            )

        candidates.sort(key=lambda item: item['similarity_score'], reverse=True)
        return candidates[:limit]

    @staticmethod
    @transaction.atomic
    def create_unified_mapping_group(
        source_control,
        target_controls,
        unified_control=None,
        control_code=None,
        control_name=None,
        mapping_rationale='',
        created_by=None,
        coverage_type='full',
        coverage_percentage=100,
    ):
        if unified_control is None:
            unified_control, _ = UnifiedControl.objects.get_or_create(
                control_code=control_code,
                defaults={
                    'control_name': control_name or source_control.name,
                    'short_name': (control_name or source_control.name)[:200],
                    'domain': source_control.control_family.replace('_', ' ').title(),
                    'category': source_control.control_family.replace('_', ' ').title(),
                    'control_family': source_control.control_family,
                    'description': source_control.description,
                    'implementation_guidance': source_control.implementation_guidance or source_control.description,
                    'control_type': source_control.control_type,
                    'automation_level': source_control.automation_level,
                    'implementation_complexity': source_control.implementation_complexity,
                    'testing_procedures': source_control.testing_procedures,
                    'created_by': created_by,
                    'updated_by': created_by,
                    'is_active': True,
                }
            )

        created_mappings = []
        for reference_control in [source_control, *target_controls]:
            mapping, _ = UnifiedControlMapping.objects.get_or_create(
                reference_control=reference_control,
                unified_control=unified_control,
                defaults={
                    'coverage_type': coverage_type,
                    'coverage_percentage': coverage_percentage,
                    'mapping_rationale': mapping_rationale or 'Created from auto-suggested mapping group',
                    'confidence_score': 75,
                    'verified_by': created_by,
                    'verified_at': timezone.now() if created_by else None,
                }
            )
            created_mappings.append(mapping)

        return unified_control, created_mappings
