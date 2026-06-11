from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('controls', '0006_alter_appliedcontrol_effectiveness_rating'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='appliedcontrol',
            name='validation_status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('submitted', 'Submitted for Review'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                ],
                db_index=True,
                default='draft',
                help_text='Owner/admin validation status for this control implementation',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='appliedcontrol',
            name='validation_requested_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='submitted_controls_for_validation',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='appliedcontrol',
            name='validation_requested_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='appliedcontrol',
            name='validated_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='validated_controls',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='appliedcontrol',
            name='validated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='appliedcontrol',
            name='validation_notes',
            field=models.TextField(blank=True),
        ),
        migrations.AddIndex(
            model_name='appliedcontrol',
            index=models.Index(
                fields=['company', 'validation_status'],
                name='applied_validation_idx',
            ),
        ),
    ]
