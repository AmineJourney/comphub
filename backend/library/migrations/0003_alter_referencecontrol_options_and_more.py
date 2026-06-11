# Generated manually to align Django migration state with the live library schema.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("library", "0002_storedlibrary_slug_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterModelOptions(
                    name="referencecontrol",
                    options={"ordering": ["code"]},
                ),
                migrations.AlterModelOptions(
                    name="requirementreferencecontrol",
                    options={"ordering": ["requirement__code", "reference_control__code"]},
                ),
                migrations.RemoveIndex(
                    model_name="referencecontrol",
                    name="reference_c_control_58848b_idx",
                ),
                migrations.RenameField(
                    model_name="referencecontrol",
                    old_name="control_id",
                    new_name="code",
                ),
                migrations.AlterField(
                    model_name="referencecontrol",
                    name="code",
                    field=models.CharField(
                        db_column="code",
                        help_text='Unique control identifier (e.g., "ISO27001-A.5.1")',
                        max_length=100,
                        unique=True,
                    ),
                ),
                migrations.AddField(
                    model_name="referencecontrol",
                    name="automation_level",
                    field=models.CharField(
                        choices=[
                            ("manual", "Manual"),
                            ("semi_automated", "Semi-Automated"),
                            ("automated", "Automated"),
                        ],
                        default="manual",
                        max_length=50,
                    ),
                ),
                migrations.AddField(
                    model_name="referencecontrol",
                    name="estimated_effort_hours",
                    field=models.IntegerField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="referencecontrol",
                    name="frequency",
                    field=models.CharField(
                        choices=[
                            ("continuous", "Continuous"),
                            ("daily", "Daily"),
                            ("weekly", "Weekly"),
                            ("monthly", "Monthly"),
                            ("quarterly", "Quarterly"),
                            ("annual", "Annual"),
                        ],
                        default="quarterly",
                        max_length=50,
                    ),
                ),
                migrations.AddField(
                    model_name="referencecontrol",
                    name="implementation_complexity",
                    field=models.CharField(
                        choices=[
                            ("low", "Low"),
                            ("medium", "Medium"),
                            ("high", "High"),
                        ],
                        default="medium",
                        max_length=50,
                    ),
                ),
                migrations.AddField(
                    model_name="referencecontrol",
                    name="maturity_level",
                    field=models.IntegerField(default=1),
                ),
                migrations.AddField(
                    model_name="referencecontrol",
                    name="tags",
                    field=models.JSONField(blank=True, default=list),
                ),
                migrations.AddField(
                    model_name="referencecontrol",
                    name="testing_procedures",
                    field=models.TextField(blank=True),
                ),
                migrations.AddField(
                    model_name="requirementreferencecontrol",
                    name="mapping_rationale",
                    field=models.TextField(blank=True, default=""),
                ),
                migrations.AddField(
                    model_name="requirementreferencecontrol",
                    name="validated_at",
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="requirementreferencecontrol",
                    name="validated_by",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="validated_requirement_control_mappings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                migrations.AddField(
                    model_name="requirementreferencecontrol",
                    name="validation_status",
                    field=models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("validated", "Validated"),
                            ("approved", "Approved"),
                        ],
                        default="approved",
                        max_length=20,
                    ),
                ),
                migrations.AlterField(
                    model_name="storedlibrary",
                    name="slug",
                    field=models.SlugField(
                        help_text='URL-friendly identifier (e.g., "iso27001", "tisax", "soc2")',
                        max_length=100,
                        unique=True,
                    ),
                ),
                migrations.AddIndex(
                    model_name="referencecontrol",
                    index=models.Index(fields=["code"], name="reference_c_code_e04cbc_idx"),
                ),
            ],
        ),
    ]
