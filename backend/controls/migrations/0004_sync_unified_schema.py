from django.db import migrations


SYNC_UNIFIED_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS unified_controls (
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    id uuid NOT NULL PRIMARY KEY,
    control_code varchar(100) NOT NULL UNIQUE,
    control_name varchar(500) NOT NULL,
    short_name varchar(200) NOT NULL DEFAULT '',
    domain varchar(200) NOT NULL,
    category varchar(200) NOT NULL DEFAULT '',
    control_family varchar(200) NOT NULL DEFAULT '',
    description text NOT NULL,
    control_objective text NOT NULL DEFAULT '',
    implementation_guidance text NOT NULL,
    control_type varchar(50) NOT NULL DEFAULT '',
    automation_level varchar(50) NOT NULL DEFAULT '',
    implementation_complexity varchar(50) NOT NULL DEFAULT '',
    estimated_effort_hours integer NULL,
    maturity_level_1_criteria text NOT NULL DEFAULT '',
    maturity_level_2_criteria text NOT NULL DEFAULT '',
    maturity_level_3_criteria text NOT NULL DEFAULT '',
    maturity_level_4_criteria text NOT NULL DEFAULT '',
    maturity_level_5_criteria text NOT NULL DEFAULT '',
    testing_procedures text NOT NULL DEFAULT '',
    testing_frequency varchar(50) NOT NULL DEFAULT '',
    prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
    related_controls jsonb NOT NULL DEFAULT '[]'::jsonb,
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    version integer NOT NULL DEFAULT 1,
    created_by_id uuid NULL REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED,
    updated_by_id uuid NULL REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS unified_code_idx ON unified_controls (control_code);
CREATE INDEX IF NOT EXISTS unified_domain_idx ON unified_controls (domain);
CREATE INDEX IF NOT EXISTS unified_active_idx ON unified_controls (is_active);

CREATE TABLE IF NOT EXISTS unified_control_mappings (
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    id uuid NOT NULL PRIMARY KEY,
    coverage_type varchar(50) NOT NULL DEFAULT 'full',
    coverage_percentage integer NOT NULL DEFAULT 100,
    mapping_rationale text NOT NULL DEFAULT '',
    gap_description text NOT NULL DEFAULT '',
    supplemental_actions text NOT NULL DEFAULT '',
    confidence_score integer NOT NULL DEFAULT 100,
    verified_at timestamp with time zone NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    reference_control_id uuid NOT NULL REFERENCES reference_controls(id) DEFERRABLE INITIALLY DEFERRED,
    unified_control_id uuid NOT NULL REFERENCES unified_controls(id) DEFERRABLE INITIALLY DEFERRED,
    verified_by_id uuid NULL REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT unified_control_mappings_reference_control_id_unified_control_id_uniq
        UNIQUE (reference_control_id, unified_control_id)
);

CREATE INDEX IF NOT EXISTS ucmap_covtype_idx ON unified_control_mappings (coverage_type);

ALTER TABLE applied_controls
    ADD COLUMN IF NOT EXISTS unified_control_id uuid NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'applied_controls_unified_control_id_fk'
    ) THEN
        ALTER TABLE applied_controls
        ADD CONSTRAINT applied_controls_unified_control_id_fk
        FOREIGN KEY (unified_control_id)
        REFERENCES unified_controls(id)
        DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS applied_controls_unified_control_id_idx
    ON applied_controls (unified_control_id);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('controls', '0003_alter_appliedcontrol_options'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(SYNC_UNIFIED_SCHEMA_SQL),
            ],
            state_operations=[],
        ),
    ]
