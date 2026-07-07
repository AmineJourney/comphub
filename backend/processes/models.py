import uuid
from django.core.exceptions import ValidationError
from django.db import models
from core.mixins import TenantMixin
from core.models import SoftDeleteModel, TimeStampedModel


class Process(TenantMixin, TimeStampedModel, SoftDeleteModel):
    """
    Process identity card used to document governance/process ownership.
    Repeated sections are stored as structured JSON for the first MVP.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    reference = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    process_type = models.CharField(max_length=100, blank=True)
    version = models.CharField(max_length=20, default='1.0')
    effective_date = models.DateField(null=True, blank=True)
    finality = models.TextField(help_text='Purpose/finality of the process')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        db_index=True,
    )

    department = models.ForeignKey(
        'organizations.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processes',
    )
    responsible = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='responsible_processes',
    )
    replacement = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='backup_processes',
    )

    indicators = models.JSONField(default=list, blank=True)
    inputs = models.JSONField(default=list, blank=True)
    outputs = models.JSONField(default=list, blank=True)
    activities = models.JSONField(default=list, blank=True)
    risks = models.JSONField(default=list, blank=True)
    opportunities = models.JSONField(default=list, blank=True)

    required_knowledge = models.TextField(blank=True)
    critical_resources = models.TextField(blank=True)
    work_environment = models.TextField(blank=True)
    associated_documents = models.JSONField(default=list, blank=True)
    approval = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'processes'
        ordering = ['reference']
        unique_together = [['company', 'reference']]
        indexes = [
            models.Index(fields=['company', 'reference']),
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', 'department']),
            models.Index(fields=['responsible', 'status']),
        ]

    def __str__(self):
        return f"{self.reference} - {self.title}"

    def clean(self):
        if self.department and self.department.company_id != self.company_id:
            raise ValidationError({
                'department': 'Department must belong to the same company'
            })
