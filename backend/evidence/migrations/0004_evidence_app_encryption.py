from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("evidence", "0003_alter_evidence_original_filename"),
    ]

    operations = [
        migrations.AddField(
            model_name="evidence",
            name="encryption_version",
            field=models.PositiveSmallIntegerField(
                default=1,
                editable=False,
                help_text="Application encryption format version",
            ),
        ),
        migrations.AddField(
            model_name="evidence",
            name="file_content_encrypted",
            field=models.BooleanField(
                default=False,
                editable=False,
                help_text="Whether file_content is encrypted with the company-scoped app key",
            ),
        ),
    ]
