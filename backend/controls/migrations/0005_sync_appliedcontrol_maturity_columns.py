from django.db import migrations


SYNC_APPLIED_CONTROL_COLUMNS_SQL = """
ALTER TABLE applied_controls
    ADD COLUMN IF NOT EXISTS maturity_level integer NOT NULL DEFAULT 1;

ALTER TABLE applied_controls
    ADD COLUMN IF NOT EXISTS maturity_target_level integer NOT NULL DEFAULT 3;

ALTER TABLE applied_controls
    ADD COLUMN IF NOT EXISTS maturity_assessment_date date NULL;

ALTER TABLE applied_controls
    ADD COLUMN IF NOT EXISTS maturity_notes text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS applied_controls_maturity_level_idx
    ON applied_controls (maturity_level);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('controls', '0004_sync_unified_schema'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(SYNC_APPLIED_CONTROL_COLUMNS_SQL),
            ],
            state_operations=[],
        ),
    ]
