"""Persist descriptive programme phase and its original immutable history snapshot."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0037_development_phase"
down_revision = "0036_visit_notes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No backfill: an older programme's phase is unknown until explicitly chosen.
    op.add_column("development", sa.Column("phase", sa.String(16), nullable=True))
    op.create_check_constraint(
        "development_phase", "development", "phase IS NULL OR phase IN ('preparation','marketing')"
    )
    op.add_column("inventory_event", sa.Column("development_phase", sa.String(16), nullable=True))
    op.create_check_constraint(
        "inventory_event_development_phase",
        "inventory_event",
        "development_phase IS NULL OR (development_id IS NOT NULL "
        "AND development_phase IN ('preparation','marketing'))",
    )
    op.execute("""
      CREATE FUNCTION kay_development_phase_history_validate() RETURNS trigger
      LANGUAGE plpgsql AS $$
      DECLARE current_row development; stored text;
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
        SELECT * INTO current_row FROM development WHERE id=NEW.id;
        SELECT development_phase INTO stored FROM inventory_event
          WHERE development_id=current_row.id AND property_version=current_row.version
          ORDER BY occurred_at DESC,id LIMIT 1;
        IF NOT FOUND OR stored IS DISTINCT FROM current_row.phase THEN
          RAISE EXCEPTION 'DEVELOPMENT_PHASE_HISTORY_REQUIRED' USING ERRCODE='23514';
        END IF;
        RETURN NULL;
      END $$;
      CREATE CONSTRAINT TRIGGER development_phase_history AFTER INSERT OR UPDATE
        ON development DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
        EXECUTE FUNCTION kay_development_phase_history_validate();
    """)


def downgrade() -> None:
    if load_settings().app_environment == "development" or op.get_bind().scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM development WHERE phase IS NOT NULL) "
            "OR EXISTS(SELECT 1 FROM inventory_event WHERE development_phase IS NOT NULL)"
        )
    ):
        raise RuntimeError("DEVELOPMENT_PHASE_DATA_DOWNGRADE_REFUSED")
    op.execute("DROP TRIGGER development_phase_history ON development")
    op.execute("DROP FUNCTION kay_development_phase_history_validate()")
    op.drop_constraint("inventory_event_development_phase", "inventory_event", type_="check")
    op.drop_column("inventory_event", "development_phase")
    op.drop_constraint("development_phase", "development", type_="check")
    op.drop_column("development", "phase")
