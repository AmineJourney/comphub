# core/permissions.py
"""
FIX #3 — RolePermission.has_object_permission previously fell through to
`return True` when an object had no `created_by` field, silently granting
write access to any authenticated tenant member.

The fix: default is now DENY (return False) for unsafe methods.
Safe methods (GET/HEAD/OPTIONS) remain allowed for all tenant members.
Owners and admins bypass object-level checks entirely (tenant isolation
is already enforced at the queryset level).
"""
from rest_framework import permissions
from .models import ROLE_PERMISSIONS


class IsTenantMember(permissions.BasePermission):
    """Ensure the request carries a valid tenant (X-Company-ID) context."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request, 'tenant')
            and request.tenant is not None
        )


class TenantObjectPermission(permissions.BasePermission):
    """Ensure the requested object belongs to the current tenant."""

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'company'):
            return obj.company == request.tenant
        return True


class IsOwnerOrAdmin(permissions.BasePermission):
    """Only owners and admins of the current tenant may proceed."""

    def has_permission(self, request, view):
        return bool(
            hasattr(request, 'membership')
            and request.membership is not None
            and request.membership.role in ('owner', 'admin')
        )


class RolePermission(permissions.BasePermission):
    """
    View-level RBAC using ROLE_PERMISSIONS matrix.
    Views may override the default action mapping via `permission_action_map`
    and declare one or more ownership fields via `ownership_fields`.
    Object-level: DENY by default for unsafe methods unless the user has an
    explicit non-own permission for that action or matches an ownership field.
    """

    _VIEW_TO_PERM = {
        'list':           'view_any',
        'retrieve':       'view_any',
        'create':         'create_any',
        'update':         'update_any',
        'partial_update': 'update_any',
        'destroy':        'delete_any',
    }

    def _normalize_required_perms(self, view, action):
        action_map = getattr(view, 'permission_action_map', None) or self._VIEW_TO_PERM
        required = action_map.get(action)
        if required is None:
            return ()
        if isinstance(required, (list, tuple, set)):
            return tuple(required)
        return (required,)

    def _resolve_attr_path(self, obj, attr_path):
        current = obj
        for part in attr_path.split('.'):
            current = getattr(current, part, None)
            if current is None:
                return None
        return current

    def _is_owner(self, view, obj, user):
        ownership_fields = getattr(view, 'ownership_fields', ('created_by',))
        for field_name in ownership_fields:
            if self._resolve_attr_path(obj, field_name) == user:
                return True
        return False

    def has_permission(self, request, view):
        if not hasattr(request, 'membership') or request.membership is None:
            return False

        role = request.membership.role
        if role == 'owner':
            return True

        action = getattr(view, 'action', None)
        required_perms = self._normalize_required_perms(view, action)
        if not required_perms:
            # Custom read-only actions stay available; unsafe actions must opt in.
            return request.method in permissions.SAFE_METHODS

        role_perms = ROLE_PERMISSIONS.get(role, [])
        return '*' in role_perms or any(perm in role_perms for perm in required_perms)

    def has_object_permission(self, request, view, obj):
        if not hasattr(request, 'membership') or request.membership is None:
            return False

        role = request.membership.role

        # Owners and admins always pass object-level checks
        if role in ('owner', 'admin'):
            return True

        # Safe methods are allowed for all authenticated tenant members
        if request.method in permissions.SAFE_METHODS:
            return True

        role_perms = ROLE_PERMISSIONS.get(role, [])
        required_perms = self._normalize_required_perms(view, getattr(view, 'action', None))

        for perm in required_perms:
            if perm.endswith('_own'):
                if perm in role_perms and self._is_owner(view, obj, request.user):
                    return True
            elif perm in role_perms:
                return True

        # No matching permission or ownership → DENY
        return False


class ReadOnlyPermission(permissions.BasePermission):
    """Allow read-only access to anyone who passes authentication."""

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS
