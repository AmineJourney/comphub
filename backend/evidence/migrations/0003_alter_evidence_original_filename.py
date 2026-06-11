# Generated manually to remove an unnecessary model default.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("evidence", "0002_database_backed_evidence"),
    ]

    operations = [
        migrations.AlterField(
            model_name="evidence",
            name="original_filename",
            field=models.CharField(
                blank=True,
                help_text="Original uploaded filename",
                max_length=500,
            ),
        ),
    ]
