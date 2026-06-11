"""
Business logic services for compliance calculation and analysis
"""
from django.db import transaction
from django.db.models import Count, Q, Avg
from decimal import Decimal
from .models import ComplianceResult, ComplianceGap, FrameworkAdoption
from library.scoping import framework_scope_q, is_allowed_framework_code


class ComplianceCalculationService:
    """Service for calculating compliance metrics"""

    APPROVED_MAPPING_STATUSES = ['validated', 'approved']

    @staticmethod
    def _get_requirement_mappings(requirement):
        from controls.models import RequirementReferenceControl

        return RequirementReferenceControl.objects.filter(
            requirement=requirement,
            validation_status__in=ComplianceCalculationService.APPROVED_MAPPING_STATUSES,
            is_deleted=False,
        ).select_related('reference_control')

    @staticmethod
    def _get_satisfying_applied_controls(company, requirement, department=None):
        from controls.models import AppliedControl, UnifiedControlMapping

        mappings = ComplianceCalculationService._get_requirement_mappings(requirement)
        direct_reference_controls = [m.reference_control for m in mappings]
        direct_reference_control_ids = [control.id for control in direct_reference_controls]

        unified_control_ids = list(
            UnifiedControlMapping.objects.filter(
                reference_control_id__in=direct_reference_control_ids
            ).values_list('unified_control_id', flat=True).distinct()
        )

        applied_controls = AppliedControl.objects.filter(
            company=company,
            is_deleted=False,
        ).filter(
            Q(reference_control_id__in=direct_reference_control_ids) |
            Q(unified_control_id__in=unified_control_ids) |
            Q(reference_control__unified_mappings__unified_control_id__in=unified_control_ids)
        ).select_related(
            'reference_control', 'unified_control', 'department', 'control_owner'
        ).distinct()

        if department:
            applied_controls = applied_controls.filter(
                Q(department=department) | Q(department__isnull=True)
            )

        return mappings, applied_controls, set(direct_reference_control_ids), set(unified_control_ids)
    
    @staticmethod
    @transaction.atomic
    def calculate_framework_compliance(company, framework, department=None, user=None):
        """
        Calculate compliance coverage for a framework
        
        Args:
            company: Company instance
            framework: Framework instance
            department: Optional Department instance
            user: Optional User who triggered calculation
        
        Returns:
            ComplianceResult instance
        """
        from library.models import Requirement
        from evidence.models import AppliedControlEvidence
        
        # Mark previous results as not current
        ComplianceResult.objects.filter(
            company=company,
            framework=framework,
            department=department,
            is_current=True
        ).update(is_current=False)
        
        # Get all requirements for framework
        requirements = Requirement.objects.filter(
            framework=framework,
            is_deleted=False,
            is_mandatory=True  # Only mandatory requirements
        )
        
        total_requirements = requirements.count()
        
        if total_requirements == 0:
            # No requirements, return empty result
            return ComplianceResult.objects.create(
                company=company,
                framework=framework,
                department=department,
                coverage_percentage=0,
                compliance_score=0,
                total_requirements=0,
                calculated_by=user
            )
        
        # Initialize counters
        requirements_addressed = 0
        requirements_compliant = 0
        requirements_partial = 0
        requirements_non_compliant = 0
        
        requirement_details = {}
        control_summary = {
            'total': 0,
            'operational': 0,
            'implemented': 0,
            'in_progress': 0,
            'not_started': 0,
        }
        
        evidence_summary = {
            'controls_with_evidence': 0,
            'total_evidence': 0,
        }
        
        total_compliance_points = 0
        max_compliance_points = 0
        
        # Analyze each requirement
        for requirement in requirements:
            # Get control mappings for this requirement
            mappings, applied_controls, direct_reference_control_ids, unified_control_ids = (
                ComplianceCalculationService._get_satisfying_applied_controls(
                    company=company,
                    requirement=requirement,
                    department=department,
                )
            )

            mapped_controls = [m.reference_control for m in mappings]
            
            if not mapped_controls:
                requirements_non_compliant += 1
                requirement_details[str(requirement.id)] = {
                    'code': requirement.code,
                    'title': requirement.title,
                    'status': 'no_controls',
                    'controls': [],
                    'score': 0
                }
                continue
            
            if not applied_controls.exists():
                requirements_non_compliant += 1
                requirement_details[str(requirement.id)] = {
                    'code': requirement.code,
                    'title': requirement.title,
                    'status': 'not_implemented',
                    'controls': [],
                    'score': 0
                }
                continue
            
            requirements_addressed += 1
            
            # Calculate requirement compliance score
            control_scores = []
            control_info = []
            
            for control in applied_controls:
                control_score = control.calculate_compliance_score() if hasattr(control, 'calculate_compliance_score') else 0
                evidence_count = AppliedControlEvidence.objects.filter(
                    applied_control=control,
                    is_deleted=False
                ).count()

                matched_via = 'direct'
                if control.reference_control_id not in direct_reference_control_ids:
                    matched_via = 'unified'

                control_scores.append(control_score)
                control_info.append({
                    'id': str(control.id),
                    'code': control.reference_control.code,
                    'name': control.reference_control.name,
                    'status': control.status,
                    'score': control_score,
                    'evidence_count': evidence_count,
                    'matched_via': matched_via,
                    'unified_control': (
                        control.unified_control.control_code
                        if control.unified_control_id else None
                    ),
                })
                
                # Update control summary
                control_summary['total'] += 1
                if control.status == 'operational':
                    control_summary['operational'] += 1
                elif control.status == 'implemented':
                    control_summary['implemented'] += 1
                elif control.status == 'in_progress':
                    control_summary['in_progress'] += 1
                else:
                    control_summary['not_started'] += 1
                
                # Check evidence
                if evidence_count > 0:
                    evidence_summary['controls_with_evidence'] += 1
                evidence_summary['total_evidence'] += evidence_count
            
            # Calculate requirement score
            req_score = sum(control_scores) / len(control_scores) if control_scores else 0
            max_compliance_points += 100
            total_compliance_points += req_score
            
            # Determine requirement status
            if req_score >= 90:
                requirements_compliant += 1
                req_status = 'compliant'
            elif req_score >= 50:
                requirements_partial += 1
                req_status = 'partial'
            else:
                requirements_non_compliant += 1
                req_status = 'non_compliant'
            
                requirement_details[str(requirement.id)] = {
                    'code': requirement.code,
                    'title': requirement.title,
                    'status': req_status,
                    'controls': control_info,
                    'score': round(req_score, 2),
                    'mapped_reference_controls': [control.code for control in mapped_controls],
                    'mapped_unified_controls': list(unified_control_ids),
                }
        
        # Calculate overall metrics
        coverage_percentage = (requirements_addressed / total_requirements) * 100
        compliance_score = (total_compliance_points / max_compliance_points) * 100 if max_compliance_points > 0 else 0
        
        # Identify gaps
        gap_counts = ComplianceCalculationService._identify_gaps(
            company, framework, department, requirement_details
        )
        
        # Create compliance result
        result = ComplianceResult.objects.create(
            company=company,
            framework=framework,
            department=department,
            coverage_percentage=round(Decimal(coverage_percentage), 2),
            compliance_score=round(Decimal(compliance_score), 2),
            total_requirements=total_requirements,
            requirements_addressed=requirements_addressed,
            requirements_compliant=requirements_compliant,
            requirements_partial=requirements_partial,
            requirements_non_compliant=requirements_non_compliant,
            total_controls=control_summary['total'],
            controls_operational=control_summary['operational'],
            controls_implemented=control_summary['implemented'],
            controls_in_progress=control_summary['in_progress'],
            controls_not_started=control_summary['not_started'],
            controls_with_evidence=evidence_summary['controls_with_evidence'],
            total_evidence_count=evidence_summary['total_evidence'],
            high_risk_gaps=gap_counts['high'],
            medium_risk_gaps=gap_counts['medium'],
            low_risk_gaps=gap_counts['low'],
            requirement_details=requirement_details,
            control_details=control_summary,
            calculated_by=user,
            status='completed',
            is_current=True
        )
        
        return result
    
    @staticmethod
    def _identify_gaps(company, framework, department, requirement_details):
        """
        Identify compliance gaps and classify by risk
        
        Returns:
            dict with gap counts by severity
        """
        gap_counts = {'high': 0, 'medium': 0, 'low': 0}
        
        for req_id, req_data in requirement_details.items():
            if req_data['status'] in ['no_controls', 'not_implemented']:
                gap_counts['high'] += 1
            elif req_data['status'] == 'non_compliant':
                gap_counts['high'] += 1
            elif req_data['status'] == 'partial':
                gap_counts['medium'] += 1
        
        return gap_counts
    
    @staticmethod
    def calculate_all_frameworks(company):
        """
        Calculate compliance for all adopted frameworks
        
        Args:
            company: Company instance
        
        Returns:
            list of ComplianceResult instances
        """
        adoptions = FrameworkAdoption.objects.filter(
            company=company,
            is_deleted=False
        ).filter(
            framework_scope_q('framework__code')
        ).select_related('framework')
        
        results = []
        for adoption in adoptions:
            result = ComplianceCalculationService.calculate_framework_compliance(
                company=company,
                framework=adoption.framework
            )
            results.append(result)
        
        return results

    @staticmethod
    def get_framework_adoption_preview(company, framework):
        from controls.models import AppliedControl, RequirementReferenceControl, UnifiedControlMapping

        mappings = RequirementReferenceControl.objects.filter(
            requirement__framework=framework,
            validation_status__in=ComplianceCalculationService.APPROVED_MAPPING_STATUSES,
            is_deleted=False,
        ).select_related('reference_control')

        target_reference_controls = {}
        for mapping in mappings:
            target_reference_controls[mapping.reference_control_id] = mapping.reference_control

        target_reference_control_ids = set(target_reference_controls.keys())
        if not target_reference_control_ids:
            return {
                'framework_id': str(framework.id),
                'framework_code': framework.code,
                'framework_name': framework.name,
                'total_reference_controls': 0,
                'directly_applied_controls': 0,
                'already_covered_controls': 0,
                'uncovered_controls': 0,
                'source_frameworks': [],
                'covered_examples': [],
            }

        target_unified_control_ids = set(
            UnifiedControlMapping.objects.filter(
                reference_control_id__in=target_reference_control_ids
            ).values_list('unified_control_id', flat=True)
        )
        target_unified_control_ids.discard(None)

        applied_controls = AppliedControl.objects.filter(
            company=company,
            is_deleted=False,
        ).filter(
            Q(reference_control_id__in=target_reference_control_ids) |
            Q(unified_control_id__in=target_unified_control_ids) |
            Q(reference_control__unified_mappings__unified_control_id__in=target_unified_control_ids)
        ).select_related(
            'reference_control', 'unified_control'
        ).distinct()

        directly_applied_ids = set(
            applied_controls.filter(
                reference_control_id__in=target_reference_control_ids
            ).values_list('reference_control_id', flat=True)
        )

        covered_reference_control_ids = set(directly_applied_ids)
        applied_unified_ids = set(
            applied_controls.exclude(
                unified_control_id__isnull=True
            ).values_list('unified_control_id', flat=True)
        )
        if applied_unified_ids:
            covered_reference_control_ids.update(
                UnifiedControlMapping.objects.filter(
                    reference_control_id__in=target_reference_control_ids,
                    unified_control_id__in=applied_unified_ids,
                ).values_list('reference_control_id', flat=True)
            )

        source_frameworks = set()
        for control in applied_controls:
            if control.unified_control_id:
                source_frameworks.update(
                    fw_code
                    for fw_code in control.unified_control.get_framework_coverage().keys()
                    if fw_code != framework.code and is_allowed_framework_code(fw_code)
                )

        covered_examples = [
            {
                'code': control.code,
                'name': control.name,
            }
            for control_id, control in target_reference_controls.items()
            if control_id in covered_reference_control_ids
        ][:8]

        return {
            'framework_id': str(framework.id),
            'framework_code': framework.code,
            'framework_name': framework.name,
            'total_reference_controls': len(target_reference_control_ids),
            'directly_applied_controls': len(directly_applied_ids),
            'already_covered_controls': len(covered_reference_control_ids),
            'uncovered_controls': len(target_reference_control_ids - covered_reference_control_ids),
            'source_frameworks': sorted(source_frameworks),
            'covered_examples': covered_examples,
        }


class ComplianceAnalyticsService:
    """Service for compliance analytics and reporting"""
    
    @staticmethod
    def get_company_compliance_overview(company):
        """
        Get comprehensive compliance overview for company
        
        Args:
            company: Company instance
        
        Returns:
            dict with overview metrics
        """
        # Get current results
        current_results = ComplianceResult.objects.filter(
            company=company,
            is_current=True,
            is_deleted=False
        ).filter(
            framework_scope_q('framework__code')
        ).select_related('framework')
        
        if not current_results.exists():
            # ✅ FIX: avg_coverage was missing here, causing KeyError in serializer
            return {
                'total_frameworks': 0,
                'avg_compliance_score': 0,
                'avg_coverage': 0,
                'frameworks': []
            }
        
        # Calculate averages
        avg_score = current_results.aggregate(
            avg=Avg('compliance_score')
        )['avg']
        
        avg_coverage = current_results.aggregate(
            avg=Avg('coverage_percentage')
        )['avg']
        
        # Framework breakdown
        frameworks = []
        for result in current_results:
            frameworks.append({
                'framework_id': str(result.framework.id),
                'framework_code': result.framework.code,
                'framework_name': result.framework.name,
                'compliance_score': float(result.compliance_score),
                'coverage_percentage': float(result.coverage_percentage),
                'grade': result.get_compliance_grade(),
                'status': result.get_compliance_status(),
                'gap_count': result.get_gap_count()
            })
        
        return {
            'total_frameworks': current_results.count(),
            'avg_compliance_score': round(float(avg_score), 2) if avg_score else 0,
            'avg_coverage': round(float(avg_coverage), 2) if avg_coverage else 0,
            'frameworks': frameworks
        }
    
    @staticmethod
    def get_compliance_trends(company, framework, months=12):
        """
        Get compliance trend over time
        
        Args:
            company: Company instance
            framework: Framework instance
            months: Number of months to look back
        
        Returns:
            list of trend data points
        """
        from django.utils import timezone
        from datetime import timedelta
        
        start_date = timezone.now() - timedelta(days=months*30)
        
        results = ComplianceResult.objects.filter(
            company=company,
            framework=framework,
            calculation_date__gte=start_date,
            status='completed',
            is_deleted=False
        ).order_by('calculation_date')
        
        trends = []
        for result in results:
            trends.append({
                'date': result.calculation_date.date().isoformat(),
                'compliance_score': float(result.compliance_score),
                'coverage_percentage': float(result.coverage_percentage),
                'grade': result.get_compliance_grade()
            })
        
        return trends
    
    @staticmethod
    def get_gap_analysis(company, framework, request=None):
        """
        Get detailed gap analysis
        
        Args:
            company: Company instance
            framework: Framework instance
        
        Returns:
            dict with gap analysis
        """
        from library.localization import (
            LibraryTranslationResolver,
            get_request_language,
        )

        language = get_request_language(request)
        raw_library_content = (
            framework.loaded_library.stored_library.raw_content
            if framework.loaded_library and framework.loaded_library.stored_library
            else ""
        )
        translation_resolver = LibraryTranslationResolver(raw_library_content)

        # Get current result
        result = ComplianceResult.objects.filter(
            company=company,
            framework=framework,
            is_current=True,
            is_deleted=False
        ).first()
        
        if not result:
            return {'gaps': [], 'total': 0, 'by_severity': {'high': 0, 'medium': 0, 'low': 0}}
        
        gaps = []
        
        # Parse requirement details to identify gaps
        for req_id, req_data in result.requirement_details.items():
            if req_data['status'] in ['no_controls', 'not_implemented', 'non_compliant', 'partial']:
                translated_requirement = (
                    translation_resolver.translated_requirement_content(
                        req_data['code'],
                        language
                    )
                )
                gap = {
                    'requirement_code': req_data['code'],
                    'requirement_title': (
                        translated_requirement.get('title') or req_data['title']
                    ),
                    'status': req_data['status'],
                    'score': req_data.get('score', 0),
                    'controls': req_data.get('controls', [])
                }
                
                # Determine severity
                if req_data['status'] in ['no_controls', 'not_implemented']:
                    gap['severity'] = 'high'
                elif req_data['status'] == 'non_compliant':
                    gap['severity'] = 'high'
                elif req_data['status'] == 'partial':
                    gap['severity'] = 'medium'
                else:
                    gap['severity'] = 'low'
                
                gaps.append(gap)
        
        return {
            'gaps': gaps,
            'total': len(gaps),
            'by_severity': {
                'high': len([g for g in gaps if g['severity'] == 'high']),
                'medium': len([g for g in gaps if g['severity'] == 'medium']),
                'low': len([g for g in gaps if g['severity'] == 'low']),
            }
        }


class ComplianceRecommendationService:
    """Service for compliance recommendations"""
    
    @staticmethod
    def get_prioritized_actions(company, framework, request=None):
        """
        Get prioritized list of actions to improve compliance
        
        Args:
            company: Company instance
            framework: Framework instance
        
        Returns:
            list of recommended actions
        """
        from controls.models import AppliedControl
        from django.utils import timezone
        from library.localization import (
            LibraryTranslationResolver,
            get_request_language,
        )

        language = get_request_language(request)
        raw_library_content = (
            framework.loaded_library.stored_library.raw_content
            if framework.loaded_library and framework.loaded_library.stored_library
            else ""
        )
        translation_resolver = LibraryTranslationResolver(raw_library_content)

        def translated_requirement_title(req_data):
            translated = translation_resolver.translated_requirement_content(
                req_data['code'],
                language
            )
            return translated.get('title') or req_data['title']

        def translated_control_name(reference_control):
            translated = translation_resolver.translated_requirement_content(
                reference_control.code,
                language
            )
            return translated.get('title') or reference_control.name

        def recommendation_text(title_key, title_params, description_key, description_params):
            translations = {
                'compliance.recommendations.actions.implementControls.title': {
                    'en': 'Implement controls for {code}',
                    'fr': 'Mettre en oeuvre les controles pour {code}',
                },
                'compliance.recommendations.actions.implementControls.description': {
                    'en': 'Requirement "{title}" has no controls implemented',
                    'fr': 'L\'exigence "{title}" n\'a aucun controle implemente',
                },
                'compliance.recommendations.actions.addEvidence.title': {
                    'en': 'Add evidence for {code}',
                    'fr': 'Ajouter des preuves pour {code}',
                },
                'compliance.recommendations.actions.addEvidence.description': {
                    'en': 'Control "{name}" has no evidence',
                    'fr': 'Le controle "{name}" n\'a aucune preuve',
                },
                'compliance.recommendations.actions.reviewControl.title': {
                    'en': 'Review {code}',
                    'fr': 'Revoir {code}',
                },
                'compliance.recommendations.actions.reviewControl.description': {
                    'en': 'Control review is overdue since {date}',
                    'fr': 'La revue du controle est en retard depuis le {date}',
                },
            }

            title = translations[title_key][language].format(**title_params)
            description = translations[description_key][language].format(
                **description_params
            )

            return {
                'title_key': title_key,
                'title_params': title_params,
                'description_key': description_key,
                'description_params': description_params,
                'title': title,
                'description': description,
            }
        
        # Get current compliance result
        result = ComplianceResult.objects.filter(
            company=company,
            framework=framework,
            is_current=True,
            is_deleted=False
        ).first()
        
        if not result:
            return []
        
        actions = []
        
        # 1. Address missing controls (highest priority)
        for req_id, req_data in result.requirement_details.items():
            if req_data['status'] in ['no_controls', 'not_implemented']:
                title = translated_requirement_title(req_data)
                actions.append({
                    'priority': 'critical',
                    'type': 'implement_controls',
                    'requirement': req_data['code'],
                    'estimated_impact': 'high',
                    **recommendation_text(
                        'compliance.recommendations.actions.implementControls.title',
                        {'code': req_data['code']},
                        'compliance.recommendations.actions.implementControls.description',
                        {'title': title},
                    ),
                })
        
        # 2. Address controls without evidence
        controls_no_evidence = AppliedControl.objects.filter(
            company=company,
            is_deleted=False
        ).select_related(
            'reference_control'
        ).annotate(
            evidence_count=Count('evidence_links', filter=Q(evidence_links__is_deleted=False))
        ).filter(evidence_count=0)[:10]
        
        for control in controls_no_evidence:
            control_name = translated_control_name(control.reference_control)
            actions.append({
                'priority': 'high',
                'type': 'add_evidence',
                'control': control.reference_control.code,
                'estimated_impact': 'medium',
                **recommendation_text(
                    'compliance.recommendations.actions.addEvidence.title',
                    {'code': control.reference_control.code},
                    'compliance.recommendations.actions.addEvidence.description',
                    {'name': control_name},
                ),
            })
        
        # 3. Address overdue reviews
        overdue_controls = AppliedControl.objects.filter(
            company=company,
            is_deleted=False
        ).select_related(
            'reference_control'
        ).filter(
            next_review_date__lt=timezone.now().date()
        )[:10]
        
        for control in overdue_controls:
            review_date = control.next_review_date.strftime(
                '%d/%m/%Y' if language == 'fr' else '%Y-%m-%d'
            )
            actions.append({
                'priority': 'medium',
                'type': 'review_control',
                'control': control.reference_control.code,
                'estimated_impact': 'low',
                **recommendation_text(
                    'compliance.recommendations.actions.reviewControl.title',
                    {'code': control.reference_control.code},
                    'compliance.recommendations.actions.reviewControl.description',
                    {'date': review_date},
                ),
            })
        
        # Sort by priority
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        actions.sort(key=lambda x: priority_order.get(x['priority'], 99))

        return actions[:20]  # Return top 20 actions
