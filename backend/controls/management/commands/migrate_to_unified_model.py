from collections import defaultdict
import re

from django.core.management.base import BaseCommand
from django.db import transaction

from controls.models import AppliedControl, UnifiedControl, UnifiedControlMapping
from library.models import ReferenceControl


class Command(BaseCommand):
    help = "Create unified controls and mappings from existing reference controls"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview migration without saving changes",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        self.stdout.write(self.style.SUCCESS("Starting migration to Unified Control Model..."))
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be saved"))

        control_groups = self._group_similar_controls()

        created_unified = 0
        existing_unified = 0
        created_mappings = 0
        existing_mappings = 0
        backfilled_applied = 0
        next_code_number = self._next_control_number()

        for group_key, ref_controls in control_groups.items():
            unified_control, was_created, next_code_number = self._create_unified_control(
                group_key=group_key,
                ref_controls=ref_controls,
                next_code_number=next_code_number,
                dry_run=dry_run,
            )

            if unified_control is None:
                continue

            if was_created:
                created_unified += 1
            else:
                existing_unified += 1

            for ref_control in ref_controls:
                mapping, mapping_created = self._create_mapping(
                    ref_control=ref_control,
                    unified_control=unified_control,
                    dry_run=dry_run,
                )
                if mapping is None:
                    continue

                if mapping_created:
                    created_mappings += 1
                else:
                    existing_mappings += 1

            if not dry_run:
                backfilled_applied += AppliedControl.objects.filter(
                    reference_control__in=ref_controls,
                    unified_control__isnull=True,
                    is_deleted=False,
                ).update(unified_control=unified_control)

        self.stdout.write(self.style.SUCCESS(f"Created {created_unified} unified controls"))
        self.stdout.write(self.style.SUCCESS(f"Reused {existing_unified} unified controls"))
        self.stdout.write(self.style.SUCCESS(f"Created {created_mappings} unified mappings"))
        self.stdout.write(self.style.SUCCESS(f"Reused {existing_mappings} unified mappings"))
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"Backfilled {backfilled_applied} applied controls"))
            self.stdout.write(self.style.SUCCESS("Migration complete!"))
        else:
            self.stdout.write(self.style.WARNING("DRY RUN COMPLETE - Run without --dry-run to save changes"))

    def _group_similar_controls(self):
        groups = defaultdict(list)

        queryset = ReferenceControl.objects.filter(
            is_deleted=False,
            is_published=True,
        ).order_by("code")

        for ref_control in queryset:
            normalized_name = self._normalize_name(ref_control.name)
            group_key = f"{ref_control.control_family}|{normalized_name}"
            groups[group_key].append(ref_control)

        return groups

    def _create_unified_control(self, group_key, ref_controls, next_code_number, dry_run):
        template = ref_controls[0]
        existing = UnifiedControl.objects.filter(metadata__source_group_key=group_key).first()
        if existing:
            if dry_run:
                self.stdout.write(f"  Would reuse: {existing.control_code} - {existing.control_name}")
            return existing, False, next_code_number

        control_code = self._format_control_code(next_code_number)
        domain = self._derive_domain(template.control_family)
        unified_data = {
            "control_code": control_code,
            "control_name": template.name,
            "short_name": template.name[:200],
            "domain": domain,
            "category": domain,
            "control_family": template.control_family,
            "description": template.description or template.name,
            "implementation_guidance": (
                template.implementation_guidance or template.description or template.name
            ),
            "control_type": self._map_control_type(template.control_type),
            "automation_level": template.automation_level,
            "implementation_complexity": template.implementation_complexity,
            "estimated_effort_hours": template.estimated_effort_hours,
            "testing_procedures": template.testing_procedures,
            "testing_frequency": template.frequency,
            "tags": list(template.tags or []),
            "maturity_level_1_criteria": "Ad-hoc and reactive implementation.",
            "maturity_level_2_criteria": "Basic repeatable process exists.",
            "maturity_level_3_criteria": "Process is defined and consistently followed.",
            "maturity_level_4_criteria": "Process is measured and actively managed.",
            "maturity_level_5_criteria": "Process is continuously improved and optimized.",
            "is_active": True,
            "metadata": {
                "source_group_key": group_key,
                "source_reference_control_codes": [rc.code for rc in ref_controls],
                "source_count": len(ref_controls),
            },
        }

        if dry_run:
            self.stdout.write(f"  Would create: {control_code} - {template.name}")
            return UnifiedControl(**unified_data), True, next_code_number + 1

        unified_control = UnifiedControl.objects.create(**unified_data)
        return unified_control, True, next_code_number + 1

    def _create_mapping(self, ref_control, unified_control, dry_run):
        existing = UnifiedControlMapping.objects.filter(
            reference_control=ref_control,
            unified_control=unified_control,
        ).first()
        if existing:
            if dry_run:
                self.stdout.write(
                    f"    Would reuse mapping: {ref_control.code} -> {unified_control.control_code}"
                )
            return existing, False

        if dry_run:
            self.stdout.write(
                f"    Would create mapping: {ref_control.code} -> {unified_control.control_code}"
            )
            return UnifiedControlMapping(
                reference_control=ref_control,
                unified_control=unified_control,
                coverage_type="full",
                coverage_percentage=100,
                mapping_rationale="Auto-generated from existing reference control structure",
            ), True

        mapping = UnifiedControlMapping.objects.create(
            reference_control=ref_control,
            unified_control=unified_control,
            coverage_type="full",
            coverage_percentage=100,
            mapping_rationale="Auto-generated from existing reference control structure",
        )
        return mapping, True

    def _next_control_number(self):
        highest = 0
        for code in UnifiedControl.objects.values_list("control_code", flat=True):
            match = re.fullmatch(r"UC-(\d+)", code or "")
            if match:
                highest = max(highest, int(match.group(1)))
        return highest + 1

    def _format_control_code(self, number):
        return f"UC-{number:03d}"

    def _normalize_name(self, value):
        normalized = re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()
        return normalized or "untitled-control"

    def _derive_domain(self, control_family):
        return (control_family or "information_security").replace("_", " ").title()

    def _map_control_type(self, control_type):
        if control_type == "deterrent":
            return "directive"
        if control_type == "compensating":
            return "corrective"
        return control_type or "preventive"
