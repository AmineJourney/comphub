from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReferenceControlViewSet, UnifiedControlViewSet, AppliedControlViewSet,
    RequirementReferenceControlViewSet, ControlExceptionViewSet,
    UnifiedControlMappingViewSet
)

router = DefaultRouter()
router.register(r'reference-controls', ReferenceControlViewSet, basename='reference-control')
router.register(r'unified-controls', UnifiedControlViewSet, basename='unified-control')
router.register(r'unified-mappings', UnifiedControlMappingViewSet, basename='unified-mapping')
router.register(r'applied-controls', AppliedControlViewSet, basename='applied-control')
router.register(r'requirement-mappings', RequirementReferenceControlViewSet, basename='requirement-mapping')
router.register(r'exceptions', ControlExceptionViewSet, basename='control-exception')

urlpatterns = [
    path('', include(router.urls)),
]
