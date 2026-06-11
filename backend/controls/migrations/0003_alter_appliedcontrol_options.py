# Generated manually to sync model Meta options.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("controls", "0002_initial"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="appliedcontrol",
            options={"ordering": ["reference_control__code"]},
        ),
    ]
