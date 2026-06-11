from django.core.management.base import BaseCommand
from django.db import transaction

from evidence.models import Evidence
from core.encryption import encrypt_for_company


class Command(BaseCommand):
    help = "Encrypt legacy DB-backed evidence blobs that are still stored in plaintext."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            dest="company_id",
            help="Optional company UUID to scope the encryption run.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many records would be encrypted without writing changes.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        queryset = Evidence.objects.filter(
            file_content__isnull=False,
            file_content_encrypted=False,
            is_deleted=False,
        ).select_related("company")

        if options["company_id"]:
            queryset = queryset.filter(company_id=options["company_id"])

        candidates = list(queryset)
        if options["dry_run"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Would encrypt {len(candidates)} evidence record(s)."
                )
            )
            return

        encrypted_count = 0
        for evidence in candidates:
            plaintext = bytes(evidence.file_content)
            evidence.file_content = encrypt_for_company(evidence.company_id, plaintext)
            evidence.file_content_encrypted = True
            evidence.encryption_version = 1
            evidence.save(
                update_fields=[
                    "file_content",
                    "file_content_encrypted",
                    "encryption_version",
                    "updated_at",
                ]
            )
            encrypted_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Encrypted {encrypted_count} evidence record(s)."
            )
        )
