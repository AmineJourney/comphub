# Generated for the standalone Process identity card module.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0001_initial'),
        ('organizations', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Process',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('reference', models.CharField(max_length=50)),
                ('title', models.CharField(max_length=255)),
                ('process_type', models.CharField(blank=True, max_length=100)),
                ('version', models.CharField(default='1.0', max_length=20)),
                ('effective_date', models.DateField(blank=True, null=True)),
                ('finality', models.TextField(help_text='Purpose/finality of the process')),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('in_review', 'In Review'), ('approved', 'Approved'), ('archived', 'Archived')], db_index=True, default='draft', max_length=20)),
                ('indicators', models.JSONField(blank=True, default=list)),
                ('inputs', models.JSONField(blank=True, default=list)),
                ('outputs', models.JSONField(blank=True, default=list)),
                ('activities', models.JSONField(blank=True, default=list)),
                ('risks', models.JSONField(blank=True, default=list)),
                ('opportunities', models.JSONField(blank=True, default=list)),
                ('required_knowledge', models.TextField(blank=True)),
                ('critical_resources', models.TextField(blank=True)),
                ('work_environment', models.TextField(blank=True)),
                ('associated_documents', models.JSONField(blank=True, default=list)),
                ('approval', models.JSONField(blank=True, default=dict)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_set', to='core.company')),
                ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processes', to='organizations.department')),
                ('replacement', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='backup_processes', to=settings.AUTH_USER_MODEL)),
                ('responsible', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='responsible_processes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'processes',
                'ordering': ['reference'],
                'indexes': [
                    models.Index(fields=['company', 'reference'], name='processes_company_ac9f9a_idx'),
                    models.Index(fields=['company', 'status'], name='processes_company_bfd138_idx'),
                    models.Index(fields=['company', 'department'], name='processes_company_d48597_idx'),
                    models.Index(fields=['responsible', 'status'], name='processes_respons_fd977c_idx'),
                ],
                'unique_together': {('company', 'reference')},
            },
        ),
    ]
