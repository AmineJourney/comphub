from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('controls', '0005_sync_appliedcontrol_maturity_columns'),
    ]

    operations = [
        migrations.AlterField(
            model_name='appliedcontrol',
            name='effectiveness_rating',
            field=models.IntegerField(
                blank=True,
                help_text='Effectiveness percentage (0-100%)',
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100),
                ],
            ),
        ),
    ]
