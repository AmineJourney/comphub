import re

from django.core.management.base import BaseCommand
from django.db import transaction

from controls.models import UnifiedControlMapping
from library.models import Framework, RequirementReferenceControl


class Command(BaseCommand):
    help = "Link TISAX controls to ISO 27001 unified controls using section-aware keyword matching"

    STOP_WORDS = {
        'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into',
        'must', 'shall', 'should', 'requirements', 'requirement',
        'determined', 'fulfilled', 'implemented', 'considered', 'appropriate',
        'relevant', 'defined', 'information', 'security', 'system', 'systems',
        'organization', 'procedure', 'procedures', 'management', 'control',
        'controls', 'documented', 'using', 'such', 'each',
    }

    ISO_KEYWORDS = {
        '5.2': {'policy', 'objectives'},
        '5.3': {'roles', 'responsibilities', 'authorities'},
        '6.1.2': {'risk', 'assessment'},
        '6.1.3': {'risk', 'treatment'},
        '7.2': {'competence', 'skills', 'training'},
        '7.3': {'awareness', 'training'},
        '7.5.2': {'documentation', 'updating', 'approval'},
        '7.5.3': {'documentation', 'access', 'version'},
        '8.1': {'operational', 'planning'},
        'A.5.19': {'supplier', 'provider', 'external', 'service'},
        'A.5.20': {'supplier', 'agreements', 'contract'},
        'A.5.22': {'supplier', 'monitor', 'review', 'service', 'sla'},
        'A.5.24': {'incident', 'planning', 'preparation'},
        'A.5.25': {'incident', 'event', 'assessment'},
        'A.5.26': {'incident', 'response'},
        'A.5.28': {'evidence', 'proof'},
        'A.5.30': {'continuity', 'recovery', 'critical'},
        'A.5.31': {'legal', 'regulatory', 'contractual', 'regulation'},
        'A.5.34': {'privacy', 'personal', 'data', 'pii'},
        'A.6.2': {'employment', 'conditions'},
        'A.6.3': {'awareness', 'education', 'training'},
        'A.6.6': {'confidentiality', 'disclosure'},
        'A.6.7': {'remote', 'working'},
        'A.7.1': {'physical', 'perimeters'},
        'A.7.2': {'physical', 'entry'},
        'A.7.4': {'physical', 'monitoring'},
        'A.7.12': {'cabling'},
        'A.8.5': {'authentication'},
        'A.8.6': {'capacity'},
        'A.8.7': {'malware'},
        'A.8.8': {'vulnerabilities', 'patch', 'correctifs'},
        'A.8.13': {'backup', 'recovery', 'restore', 'rpo', 'rto'},
        'A.8.14': {'redundancy', 'redundant'},
        'A.8.15': {'logging', 'log', 'journal'},
        'A.8.16': {'monitoring', 'traffic'},
        'A.8.17': {'clock', 'synchronization', 'time'},
        'A.8.20': {'network', 'networks'},
        'A.8.21': {'network', 'services', 'sla'},
        'A.8.22': {'segmentation', 'segregation', 'network'},
        'A.8.24': {'cryptography', 'cryptographic', 'encryption', 'keys'},
        'A.8.25': {'development', 'lifecycle'},
        'A.8.26': {'application', 'requirements'},
        'A.8.27': {'architecture', 'engineering', 'design'},
        'A.8.28': {'coding', 'source', 'code'},
        'A.8.29': {'testing', 'penetration', 'acceptance'},
        'A.8.30': {'outsourced', 'development', 'vendor'},
        'A.8.31': {'development', 'test', 'production', 'environment'},
        'A.8.32': {'change', 'changes'},
        'A.8.34': {'audit', 'testing'},
    }

    ROOT_HINTS = {
        'IS Policies and Organization': {'5.', '6.', '7.', '8.', '9.', '10.', 'A.5.'},
        'Human Resources': {'A.6.'},
        'Physical Security': {'A.7.'},
        'Identity and Access Management': {'A.5.15', 'A.5.16', 'A.5.17', 'A.5.18', 'A.8.5'},
        'IT Security / Cyber Security': {'A.8.'},
        'Supplier Relationships': {'A.5.19', 'A.5.20', 'A.5.21', 'A.5.22', 'A.5.23'},
        'Compliance': {'A.5.31', 'A.5.32', 'A.5.33', 'A.5.34', 'A.5.35', 'A.5.36'},
        'Prototype Protection': {'A.7.', 'A.8.'},
        'Data Protection': {'A.5.34', 'A.8.10', 'A.8.11', 'A.8.12', 'A.8.24'},
    }

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview without saving changes')

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        iso_framework = Framework.objects.get(code='ISOIEC-27001-2022-17')
        tisax_framework = Framework.objects.get(code='TISAX-V6.0.2-2')

        iso_controls = self._get_framework_controls(iso_framework)
        tisax_controls = self._get_framework_controls(tisax_framework)

        remapped = 0
        unmatched = 0

        for tisax_item in tisax_controls:
            candidate = self._best_iso_candidate(tisax_item, iso_controls)
            if not candidate:
                unmatched += 1
                continue

            iso_mapping = UnifiedControlMapping.objects.filter(
                reference_control=candidate['reference_control']
            ).select_related('unified_control').first()
            if not iso_mapping:
                unmatched += 1
                continue

            current_mappings = list(
                UnifiedControlMapping.objects.filter(
                    reference_control=tisax_item['reference_control']
                ).select_related('unified_control')
            )
            if current_mappings and current_mappings[0].unified_control_id == iso_mapping.unified_control_id:
                continue

            self.stdout.write(
                f"{tisax_item['reference_control'].code} -> {candidate['reference_control'].code} ({candidate['score']:.2f})"
            )
            remapped += 1

            if dry_run:
                continue

            primary = current_mappings[0] if current_mappings else None
            if primary is None:
                primary = UnifiedControlMapping.objects.create(
                    reference_control=tisax_item['reference_control'],
                    unified_control=iso_mapping.unified_control,
                    coverage_type='full',
                    coverage_percentage=100,
                    mapping_rationale='Aligned TISAX control to ISO 27001 unified control via keyword-based carryover mapping',
                    confidence_score=min(int(candidate['score'] * 100), 95),
                )
            else:
                primary.unified_control = iso_mapping.unified_control
                primary.coverage_type = 'full'
                primary.coverage_percentage = 100
                primary.mapping_rationale = (
                    'Aligned TISAX control to ISO 27001 unified control via keyword-based carryover mapping'
                )
                primary.confidence_score = min(int(candidate['score'] * 100), 95)
                primary.save(update_fields=[
                    'unified_control', 'coverage_type', 'coverage_percentage',
                    'mapping_rationale', 'confidence_score',
                ])
                UnifiedControlMapping.objects.filter(
                    reference_control=tisax_item['reference_control']
                ).exclude(id=primary.id).delete()

        self.stdout.write(self.style.SUCCESS(f"Remapped {remapped} TISAX controls"))
        self.stdout.write(self.style.WARNING(f"Unmatched {unmatched} TISAX controls"))

    def _get_framework_controls(self, framework):
        items = []
        queryset = RequirementReferenceControl.objects.filter(
            requirement__framework=framework,
            is_deleted=False,
        ).select_related('reference_control', 'requirement__parent')

        seen = set()
        for mapping in queryset:
            ref = mapping.reference_control
            if ref.id in seen:
                continue
            seen.add(ref.id)
            root = mapping.requirement
            while root.parent_id:
                root = root.parent
            items.append({
                'reference_control': ref,
                'root_title': (root.title or '').replace('\xa0', ' '),
                'tokens': self._tokens(root.title, ref.name, ref.description),
            })
        return items

    def _best_iso_candidate(self, tisax_item, iso_controls):
        source_tokens = tisax_item['tokens']
        root_hint = self.ROOT_HINTS.get(tisax_item['root_title'], set())
        best = None

        for iso_item in iso_controls:
            code = iso_item['reference_control'].code
            if root_hint and not any(code.startswith(prefix) for prefix in root_hint):
                continue

            overlap = source_tokens & iso_item['tokens']
            keyword_overlap = source_tokens & self.ISO_KEYWORDS.get(code, set())
            if len(overlap) < 2 and len(keyword_overlap) < 1:
                continue

            score = (len(overlap) * 0.08) + (len(keyword_overlap) * 0.18)
            score += self._sequence_bonus(
                tisax_item['reference_control'].description,
                f"{iso_item['reference_control'].name} {iso_item['reference_control'].description}",
            )

            if best is None or score > best['score']:
                best = {
                    'reference_control': iso_item['reference_control'],
                    'score': score,
                }

        if best and best['score'] >= 0.45:
            return best
        return None

    def _sequence_bonus(self, source, target):
        source_text = self._normalize(source)[:400]
        target_text = self._normalize(target)[:400]
        if not source_text or not target_text:
            return 0.0
        from difflib import SequenceMatcher
        return SequenceMatcher(None, source_text, target_text).ratio() * 0.12

    def _normalize(self, value):
        return re.sub(r'[^a-z0-9]+', ' ', (value or '').lower()).strip()

    def _tokens(self, *values):
        tokens = set()
        for value in values:
            for token in self._normalize(value).split():
                if len(token) > 2 and token not in self.STOP_WORDS:
                    tokens.add(token)
        return tokens
