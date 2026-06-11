import django.core.validators
from django.db import migrations, models
import evidence.models


class Migration(migrations.Migration):

    dependencies = [
        ('evidence', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='evidence',
            name='file',
            field=models.FileField(
                blank=True,
                max_length=500,
                null=True,
                upload_to=evidence.models.evidence_upload_path,
                validators=[
                    django.core.validators.FileExtensionValidator(
                        allowed_extensions=[
                            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
                            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
                            'zip', '7z', 'tar', 'gz',
                            'json', 'xml', 'yaml', 'log', 'md'
                        ]
                    )
                ],
            ),
        ),
        migrations.AddField(
            model_name='evidence',
            name='file_content',
            field=models.BinaryField(blank=True, editable=False, help_text='Binary file content stored directly in the database', null=True),
        ),
        migrations.AddField(
            model_name='evidence',
            name='original_filename',
            field=models.CharField(blank=True, default='', help_text='Original uploaded filename', max_length=500),
            preserve_default=False,
        ),
    ]
