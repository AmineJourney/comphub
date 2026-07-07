from rest_framework import serializers
from .models import ReferenceControl, AppliedControl, ControlException, UnifiedControl, UnifiedControlMapping
from library.models import RequirementReferenceControl  # Import from library!
from compliance.models import FrameworkAdoption
from core.models import Membership
from library.scoping import (
    framework_scope_q,
    limit_framework_codes,
    limit_framework_coverage,
    limit_requirement_mappings,
)
from library.localization import LibraryTranslationResolver, get_request_language


def _get_resolver_for_raw_content(serializer, raw_content):
    cache = serializer.context.setdefault("_library_translation_cache", {})
    resolver = cache.get(raw_content)
    if resolver is None:
        resolver = LibraryTranslationResolver(raw_content)
        cache[raw_content] = resolver
    return resolver


def _reference_control_code_candidates(reference_control_code, requirement_code):
    candidates = []
    for code in (requirement_code, reference_control_code):
        if code and code not in candidates:
            candidates.append(code)

    # Some imported reference controls are namespaced to avoid global code
    # collisions, while the YAML translation keys keep the framework code.
    # Example: ReferenceControl "ISO9001-4.1" maps to YAML control "4.1".
    if reference_control_code and "-" in reference_control_code:
        suffix = reference_control_code.split("-", 1)[1]
        if suffix and suffix not in candidates:
            candidates.append(suffix)

    return candidates


def _get_translated_reference_control_content(serializer, reference_control, language):
    mappings = (
        limit_requirement_mappings(
            reference_control.requirement_mappings.filter(is_deleted=False)
        )
        .select_related(
            "requirement__framework__loaded_library__stored_library"
        )
        .order_by("requirement__framework__code", "requirement__code")
    )

    for mapping in mappings:
        stored_library = mapping.requirement.framework.loaded_library.stored_library
        raw_content = stored_library.raw_content or ""
        resolver = _get_resolver_for_raw_content(serializer, raw_content)

        for code in _reference_control_code_candidates(
            reference_control.code,
            mapping.requirement.code,
        ):
            translated = resolver.translated_requirement_content(code, language)
            if translated.get("title") or translated.get("description"):
                return translated

    return {}


def _get_translated_unified_control_content(serializer, unified_control, language):
    reference_mappings = (
        unified_control.reference_mappings
        .select_related("reference_control")
        .filter(
            reference_control__requirement_mappings__is_deleted=False,
        )
        .filter(
            framework_scope_q(
                "reference_control__requirement_mappings__requirement__framework__code"
            )
        )
        .order_by(
            "reference_control__requirement_mappings__requirement__framework__code",
            "reference_control__code",
        )
        .distinct()
    )

    for mapping in reference_mappings:
        translated = _get_translated_reference_control_content(
            serializer,
            mapping.reference_control,
            language,
        )
        if translated.get("title") or translated.get("description"):
            return translated

    return {}


def _get_effective_unified_control(applied_control):
    if applied_control.unified_control_id:
        return applied_control.unified_control

    if not applied_control.reference_control_id:
        return None

    mapping = (
        applied_control.reference_control.unified_mappings
        .select_related("unified_control")
        .order_by("-coverage_percentage", "id")
        .first()
    )
    return mapping.unified_control if mapping else None


class ReferenceControlScopeMixin:
    def _get_requirement_mappings(self, obj):
        queryset = limit_requirement_mappings(
            obj.requirement_mappings.filter(is_deleted=False)
        )

        request = self.context.get("request")
        if not request:
            return queryset

        params = getattr(request, "query_params", request.GET)
        adopted_only = params.get("adopted_only")
        tenant = getattr(request, "tenant", None)
        if adopted_only and adopted_only.lower() in {"1", "true", "yes"} and tenant is not None:
            adopted_framework_ids = FrameworkAdoption.objects.filter(
                company=tenant,
                is_deleted=False,
            ).filter(
                framework_scope_q('framework__code')
            ).exclude(
                adoption_status="suspended"
            ).values_list("framework_id", flat=True)
            queryset = queryset.filter(requirement__framework_id__in=adopted_framework_ids)

        return queryset


class LocalizedReferenceControlSerializerMixin:
    def _localize_reference_control(self, data, reference_control, prefix=""):
        request = self.context.get("request")
        translated = _get_translated_reference_control_content(
            self,
            reference_control,
            get_request_language(request),
        )

        title_key = f"{prefix}name"
        description_key = f"{prefix}description"
        guidance_key = f"{prefix}implementation_guidance"

        if translated.get("title") and title_key in data:
            data[title_key] = translated["title"]
        if translated.get("description") and description_key in data:
            data[description_key] = translated["description"]
        if translated.get("implementation_guidance") and guidance_key in data:
            data[guidance_key] = translated["implementation_guidance"]

        return data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        reference_control = (
            instance
            if isinstance(instance, ReferenceControl)
            else getattr(instance, "reference_control", None)
        )
        if reference_control is None:
            return data

        prefix = "" if isinstance(instance, ReferenceControl) else "reference_control_"
        return self._localize_reference_control(data, reference_control, prefix=prefix)


class ReferenceControlListSerializer(
    LocalizedReferenceControlSerializerMixin,
    ReferenceControlScopeMixin,
    serializers.ModelSerializer,
):
    """
    List serializer — includes framework codes, library names, and description
    for the Apply dialog and the Reference Control Library page.
    """

    frameworks = serializers.SerializerMethodField()
    library_names = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceControl
        fields = [
            "id", "code", "name", "description",
            "control_family", "control_type", "priority",
            "automation_level", "is_published",
            "frameworks",
            "library_names",
        ]

    def get_frameworks(self, obj):
        return list(
            self._get_requirement_mappings(obj)
            .select_related("requirement__framework")
            .values_list("requirement__framework__code", flat=True)
            .distinct()
        )

    def get_library_names(self, obj):
        """
        Walk the FK chain:
          RequirementReferenceControl
            → Requirement → Framework → LoadedLibrary → StoredLibrary.name
        Returns a deduplicated list of all library names this control belongs to.
        """
        return list(
            self._get_requirement_mappings(obj)
            .select_related(
                "requirement__framework__loaded_library__stored_library"
            )
            .values_list(
                "requirement__framework__loaded_library__stored_library__name",
                flat=True,
            )
            .distinct()
        )


class ReferenceControlSerializer(
    LocalizedReferenceControlSerializerMixin,
    ReferenceControlScopeMixin,
    serializers.ModelSerializer,
):
    """Full detail serializer."""

    mapped_requirements_count = serializers.IntegerField(
        source="get_mapped_requirements_count", read_only=True
    )
    applied_count = serializers.IntegerField(
        source="get_applied_count", read_only=True
    )
    frameworks = serializers.SerializerMethodField()
    library_names = serializers.SerializerMethodField()

    class Meta:
        model = ReferenceControl
        fields = [
            "id", "code", "name", "description",
            "control_family", "control_type",
            "implementation_guidance", "testing_procedures",
            "automation_level", "frequency", "maturity_level",
            "priority", "implementation_complexity", "estimated_effort_hours",
            "is_published", "tags",
            "mapped_requirements_count", "applied_count",
            "frameworks",
            "library_names",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_frameworks(self, obj):
        return list(
            self._get_requirement_mappings(obj)
            .select_related("requirement__framework")
            .values_list("requirement__framework__code", flat=True)
            .distinct()
        )

    def get_library_names(self, obj):
        return list(
            self._get_requirement_mappings(obj)
            .select_related(
                "requirement__framework__loaded_library__stored_library"
            )
            .values_list(
                "requirement__framework__loaded_library__stored_library__name",
                flat=True,
            )
            .distinct()
        )

class UnifiedControlSerializer(serializers.ModelSerializer):
    """Serializer for UnifiedControl"""
    
    framework_coverage = serializers.SerializerMethodField()
    implementation_count = serializers.SerializerMethodField()
    
    class Meta:
        model = UnifiedControl
        fields = [
            'id', 'control_code', 'control_name', 'short_name',
            'domain', 'category', 'control_family',
            'description', 'control_objective', 'implementation_guidance',
            'control_type', 'automation_level', 'implementation_complexity',
            'estimated_effort_hours',
            'maturity_level_1_criteria', 'maturity_level_2_criteria',
            'maturity_level_3_criteria', 'maturity_level_4_criteria',
            'maturity_level_5_criteria',
            'testing_procedures', 'testing_frequency',
            'prerequisites', 'related_controls', 'tags',
            'is_active', 'framework_coverage', 'implementation_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        translated = _get_translated_unified_control_content(
            self,
            instance,
            get_request_language(self.context.get("request")),
        )

        if translated.get("title"):
            data["control_name"] = translated["title"]
        if translated.get("description"):
            data["description"] = translated["description"]
        if translated.get("implementation_guidance"):
            data["implementation_guidance"] = translated["implementation_guidance"]

        return data
    
    def get_framework_coverage(self, obj):
        """Get frameworks this control satisfies"""
        mappings = obj.reference_mappings.select_related(
            'reference_control'
        ).prefetch_related(
            'reference_control__requirement_mappings__requirement__framework'
        )
        
        frameworks = set()
        for mapping in mappings:
            for req_mapping in mapping.reference_control.requirement_mappings.all():
                frameworks.add(req_mapping.requirement.framework.code)

        return limit_framework_codes(frameworks)
    
    def get_implementation_count(self, obj):
        return obj.get_implementation_count()


class UnifiedControlMappingSerializer(serializers.ModelSerializer):
    """Serializer for control mappings"""
    
    reference_control_code = serializers.CharField(source='reference_control.code', read_only=True)
    unified_control_code = serializers.CharField(source='unified_control.control_code', read_only=True)
    
    class Meta:
        model = UnifiedControlMapping
        fields = [
            'id', 'reference_control', 'reference_control_code',
            'unified_control', 'unified_control_code',
            'coverage_type', 'coverage_percentage',
            'mapping_rationale', 'gap_description', 'supplemental_actions',
            'confidence_score', 'verified_by', 'verified_at',
            'created_at', 'updated_at'
        ]


class AppliedControlEnhancedSerializer(serializers.ModelSerializer):

    """Enhanced AppliedControl serializer with maturity info"""
    
    unified_control_code = serializers.CharField(
        source='unified_control.control_code',
        read_only=True
    )
    unified_control_name = serializers.CharField(
        source='unified_control.control_name',
        read_only=True
    )
    maturity_criteria = serializers.SerializerMethodField()
    frameworks_satisfied = serializers.SerializerMethodField()
    
    class Meta:
        model = AppliedControl
        fields = [
            'id', 'unified_control', 'unified_control_code', 'unified_control_name',
            'reference_control',  # Keep for backward compatibility
            'status', 'maturity_level', 'maturity_target_level',
            'maturity_assessment_date', 'maturity_notes', 'maturity_criteria',
            'control_owner', 'department',
            'implementation_notes', 'effectiveness_rating',
            'last_tested_date', 'next_review_date',
            'frameworks_satisfied',
            'created_at', 'updated_at'
        ]
    
    def get_maturity_criteria(self, obj):
        return obj.get_maturity_criteria()
    
    def get_frameworks_satisfied(self, obj):
        """Get all frameworks this implementation satisfies"""
        if obj.unified_control:
            return limit_framework_coverage(obj.unified_control.get_framework_coverage())
        return {}


class AppliedControlSerializer(
    LocalizedReferenceControlSerializerMixin,
    serializers.ModelSerializer,
):
    unified_control_code = serializers.SerializerMethodField()
    unified_control_name = serializers.SerializerMethodField()
    unified_control_description = serializers.SerializerMethodField()
    reference_control_code = serializers.CharField(
        source="reference_control.code", read_only=True
    )
    reference_control_name = serializers.CharField(
        source="reference_control.name", read_only=True
    )
    reference_control_description = serializers.CharField(
        source="reference_control.description", read_only=True
    )
    reference_control_family = serializers.CharField(
        source="reference_control.control_family", read_only=True
    )
    reference_control_type = serializers.CharField(
        source="reference_control.control_type", read_only=True
    )
    department_name = serializers.CharField(
        source="department.name", read_only=True
    )
    control_owner_email = serializers.CharField(
        source="control_owner.email", read_only=True
    )
    validation_requested_by_email = serializers.CharField(
        source="validation_requested_by.email", read_only=True
    )
    validated_by_email = serializers.CharField(
        source="validated_by.email", read_only=True
    )
    evidence_count = serializers.SerializerMethodField()
    compliance_score = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    frameworks = serializers.SerializerMethodField()
    frameworks_satisfied = serializers.SerializerMethodField()

    class Meta:
        model = AppliedControl
        fields = [
            "id", "reference_control", "unified_control",
            "unified_control_code", "unified_control_name",
            "unified_control_description",
            "reference_control_code", "reference_control_name",
            "reference_control_description", "reference_control_family",
            "reference_control_type",
            "department", "department_name",
            "status", "control_owner", "control_owner_email",
            "implementation_notes", "custom_procedures", "custom_frequency",
            "validation_status", "validation_requested_by",
            "validation_requested_by_email", "validation_requested_at",
            "validated_by", "validated_by_email", "validated_at",
            "validation_notes",
            "effectiveness_rating", "last_tested_date", "next_review_date",
            "has_deficiencies", "evidence_count", "compliance_score", "is_overdue",
            "frameworks", "frameworks_satisfied", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "validation_status", "validation_requested_by",
            "validation_requested_by_email", "validation_requested_at",
            "validated_by", "validated_by_email", "validated_at",
            "validation_notes", "created_at", "updated_at",
        ]

    def get_evidence_count(self, obj):
        return obj.get_evidence_count()

    def get_compliance_score(self, obj):
        return obj.calculate_compliance_score()

    def get_is_overdue(self, obj):
        return obj.is_overdue_for_review()

    def get_unified_control_code(self, obj):
        unified_control = _get_effective_unified_control(obj)
        return unified_control.control_code if unified_control else None

    def get_unified_control_name(self, obj):
        unified_control = _get_effective_unified_control(obj)
        if not unified_control:
            return None

        translated = _get_translated_unified_control_content(
            self,
            unified_control,
            get_request_language(self.context.get("request")),
        )
        return translated.get("title") or unified_control.control_name

    def get_unified_control_description(self, obj):
        unified_control = _get_effective_unified_control(obj)
        if not unified_control:
            return None

        translated = _get_translated_unified_control_content(
            self,
            unified_control,
            get_request_language(self.context.get("request")),
        )
        return translated.get("description") or unified_control.description

    def get_frameworks(self, obj):
        return list(
            limit_requirement_mappings(
                obj.reference_control.requirement_mappings.filter(is_deleted=False)
            )
            .select_related("requirement__framework")
            .values_list("requirement__framework__code", flat=True)
            .distinct()
        )

    def get_frameworks_satisfied(self, obj):
        framework_codes = set(self.get_frameworks(obj))
        unified_control = _get_effective_unified_control(obj)
        if unified_control:
            framework_codes.update(
                limit_framework_coverage(unified_control.get_framework_coverage()).keys()
            )
        return sorted(framework_codes)

    def validate(self, attrs):
        request = self.context.get("request")
        company = getattr(self.instance, "company", None) or getattr(request, "tenant", None)
        department = attrs.get("department", getattr(self.instance, "department", None))
        control_owner = attrs.get("control_owner", getattr(self.instance, "control_owner", None))

        if company is not None and department and department.company_id != company.id:
            raise serializers.ValidationError({
                "department": "Department must belong to the same company."
            })

        if company is not None and control_owner:
            is_member = Membership.objects.filter(
                user=control_owner,
                company=company,
                is_deleted=False,
            ).exists()
            if not is_member:
                raise serializers.ValidationError({
                    "control_owner": "Control owner must be an active member of the same company."
                })

        is_create = self.instance is None
        department_changed = "department" in attrs
        owner_provided = "control_owner" in attrs

        if control_owner is None and request and request.user and request.user.is_authenticated:
            if is_create or (department_changed and not owner_provided):
                if department and department.manager_id:
                    attrs["control_owner"] = department.manager
                else:
                    attrs["control_owner"] = request.user

        return attrs

    def update(self, instance, validated_data):
        implementation_fields = {
            "status", "department", "control_owner", "implementation_notes",
            "custom_procedures", "custom_frequency", "effectiveness_rating",
            "has_deficiencies",
        }
        should_reset_validation = (
            instance.validation_status == "approved"
            and any(field in validated_data for field in implementation_fields)
        )

        instance = super().update(instance, validated_data)

        if should_reset_validation:
            instance.validation_status = "draft"
            instance.validated_by = None
            instance.validated_at = None
            instance.validation_notes = ""
            instance.save(update_fields=[
                "validation_status",
                "validated_by",
                "validated_at",
                "validation_notes",
                "updated_at",
            ])

        return instance


class AppliedControlListSerializer(
    LocalizedReferenceControlSerializerMixin,
    serializers.ModelSerializer,
):
    """Lighter serializer for list views."""

    unified_control_code = serializers.SerializerMethodField()
    unified_control_name = serializers.SerializerMethodField()
    reference_control_code = serializers.CharField(
        source="reference_control.code", read_only=True
    )
    reference_control_name = serializers.CharField(
        source="reference_control.name", read_only=True
    )
    reference_control_family = serializers.CharField(
        source="reference_control.control_family", read_only=True
    )
    reference_control_type = serializers.CharField(
        source="reference_control.control_type", read_only=True
    )
    department_name = serializers.CharField(
        source="department.name", read_only=True
    )
    control_owner_email = serializers.CharField(
        source="control_owner.email", read_only=True
    )
    validation_requested_by_email = serializers.CharField(
        source="validation_requested_by.email", read_only=True
    )
    validated_by_email = serializers.CharField(
        source="validated_by.email", read_only=True
    )
    evidence_count = serializers.SerializerMethodField()
    compliance_score = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    frameworks = serializers.SerializerMethodField()
    frameworks_satisfied = serializers.SerializerMethodField()

    class Meta:
        model = AppliedControl
        fields = [
            "id", "reference_control", "unified_control",
            "unified_control_code", "unified_control_name",
            "reference_control_code", "reference_control_name",
            "reference_control_family", "reference_control_type",
            "department", "department_name",
            "status", "control_owner", "control_owner_email",
            "validation_status", "validation_requested_by",
            "validation_requested_by_email", "validation_requested_at",
            "validated_by", "validated_by_email", "validated_at",
            "validation_notes",
            "effectiveness_rating", "last_tested_date", "next_review_date",
            "has_deficiencies", "evidence_count", "compliance_score", "is_overdue",
            "frameworks", "frameworks_satisfied", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_evidence_count(self, obj):
        return obj.get_evidence_count()

    def get_compliance_score(self, obj):
        return obj.calculate_compliance_score()

    def get_is_overdue(self, obj):
        return obj.is_overdue_for_review()

    def get_unified_control_code(self, obj):
        unified_control = _get_effective_unified_control(obj)
        return unified_control.control_code if unified_control else None

    def get_unified_control_name(self, obj):
        unified_control = _get_effective_unified_control(obj)
        if not unified_control:
            return None

        translated = _get_translated_unified_control_content(
            self,
            unified_control,
            get_request_language(self.context.get("request")),
        )
        return translated.get("title") or unified_control.control_name

    def get_frameworks(self, obj):
        return list(
            limit_requirement_mappings(
                obj.reference_control.requirement_mappings.filter(is_deleted=False)
            )
            .select_related("requirement__framework")
            .values_list("requirement__framework__code", flat=True)
            .distinct()
        )

    def get_frameworks_satisfied(self, obj):
        framework_codes = set(self.get_frameworks(obj))
        unified_control = _get_effective_unified_control(obj)
        if unified_control:
            framework_codes.update(
                limit_framework_coverage(unified_control.get_framework_coverage()).keys()
            )
        return sorted(framework_codes)


class RequirementReferenceControlSerializer(serializers.ModelSerializer):
    reference_control_code = serializers.CharField(
        source="reference_control.code", read_only=True
    )
    reference_control_name = serializers.CharField(
        source="reference_control.name", read_only=True
    )

    class Meta:
        model = RequirementReferenceControl
        fields = [
            "id", "requirement", "reference_control",
            "reference_control_code", "reference_control_name",
            "coverage_level", "is_primary", "validation_status",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ControlExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlException
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ControlCoverageSerializer(serializers.Serializer):
    framework_code = serializers.CharField()
    total_requirements = serializers.IntegerField()
    covered_requirements = serializers.IntegerField()
    coverage_percentage = serializers.FloatField()


class ControlDashboardSerializer(serializers.Serializer):
    total_controls = serializers.IntegerField()
    status_breakdown = serializers.ListField()
    avg_compliance_score = serializers.FloatField()
    family_breakdown = serializers.ListField()
    overdue_reviews = serializers.IntegerField()
    controls_with_deficiencies = serializers.IntegerField()
    evidence_coverage_percentage = serializers.FloatField()


class RequirementCoverageDetailSerializer(serializers.Serializer):
    requirement_id = serializers.UUIDField()
    requirement_code = serializers.CharField()
    requirement_title = serializers.CharField()
    framework_code = serializers.CharField()
    coverage_level = serializers.CharField()
    mapping_rationale = serializers.CharField()


class AppliedControlFrameworkCoverageSerializer(serializers.Serializer):
    applied_control_id = serializers.UUIDField()
    reference_control_code = serializers.CharField()
    unified_control_code = serializers.CharField(allow_null=True)
    frameworks = serializers.DictField()
