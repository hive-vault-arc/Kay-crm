"""Persist scoped visit notes separately from overlap explanations and outcomes."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0036_visit_notes"
down_revision = "0035_project_photos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("visit", sa.Column("notes", sa.String(1000), nullable=False, server_default=""))
    op.execute("""
      CREATE FUNCTION kay_visit_notes_history_validate() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE v visit; stored text;
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
        SELECT * INTO v FROM visit WHERE id=NEW.id;
        SELECT coalesce(snapshot->>'notes','') INTO stored FROM visit_event
          WHERE visit_id=v.id AND version=v.version;
        IF stored IS DISTINCT FROM v.notes THEN
          RAISE EXCEPTION 'VISIT_HISTORY_REQUIRED' USING ERRCODE='23514';
        END IF;
        RETURN NULL;
      END $$;
      CREATE CONSTRAINT TRIGGER visit_notes_history AFTER INSERT OR UPDATE ON visit
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
        EXECUTE FUNCTION kay_visit_notes_history_validate();
    """)


def downgrade() -> None:
    if load_settings().app_environment == "development" or op.get_bind().scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM visit WHERE notes<>'') "
            "OR EXISTS(SELECT 1 FROM visit_event WHERE snapshot ? 'notes')"
        )
    ):
        raise RuntimeError("VISIT_NOTES_DATA_DOWNGRADE_REFUSED")
    op.execute("DROP TRIGGER visit_notes_history ON visit")
    op.execute("DROP FUNCTION kay_visit_notes_history_validate()")
    op.drop_column("visit", "notes")
