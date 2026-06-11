from django.db.models import Q


ALLOWED_FRAMEWORK_CODE_PREFIXES = (
    "ISO27001",
    "ISOIEC-27001",
    "ISO/IEC 27001",
    "ISO9001",
    "ISO-9001",
    "ISO 9001",
)


def framework_scope_q(field_name="code"):
    query = Q()
    for prefix in ALLOWED_FRAMEWORK_CODE_PREFIXES:
        query |= Q(**{f"{field_name}__istartswith": prefix})
    return query


def is_allowed_framework_code(code):
    normalized = (code or "").upper()
    return any(normalized.startswith(prefix.upper()) for prefix in ALLOWED_FRAMEWORK_CODE_PREFIXES)


def limit_frameworks(queryset):
    return queryset.filter(framework_scope_q("code"))


def limit_requirements(queryset):
    return queryset.filter(framework_scope_q("framework__code"))


def limit_requirement_mappings(queryset):
    return queryset.filter(framework_scope_q("requirement__framework__code"))


def limit_loaded_libraries(queryset):
    return queryset.filter(
        frameworks__is_deleted=False,
    ).filter(
        framework_scope_q("frameworks__code")
    ).distinct()


def limit_stored_libraries(queryset):
    return queryset.filter(
        loaded_versions__frameworks__is_deleted=False,
    ).filter(
        framework_scope_q("loaded_versions__frameworks__code")
    ).distinct()


def limit_framework_codes(codes):
    return sorted({code for code in codes if is_allowed_framework_code(code)})


def limit_framework_coverage(coverage):
    return {
        code: details
        for code, details in (coverage or {}).items()
        if is_allowed_framework_code(code)
    }
