"""Extend existing immutable history with bounded Lead/Deal interaction metadata."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.settings import load_settings

revision = "0025_scoped_activities"
down_revision = "0024_deal_qualification_history"
branch_labels = None
depends_on = None

OLD_ACTIONS = (
    "tasks.created",
    "tasks.updated",
    "tasks.completed",
    "tasks.cancelled",
    "tasks.contact_merged",
    "visits.created",
    "visits.updated",
    "visits.confirmed",
    "visits.rescheduled",
    "visits.completed",
    "visits.cancelled",
    "visits.contact_merged",
    "deals.closed",
    "deals.reopened",
    "deals.stock.flagged",
    "deals.reservation.created",
    "deals.reservation.released",
    "deals.created",
    "deals.updated",
    "deals.transition",
    "deals.customer_offer.created",
    "deals.customer_offer.updated",
    "deals.contact_merged",
    "requirements.created",
    "requirements.updated",
    "requirements.shortlisted",
    "requirements.unshortlisted",
    "contacts.created",
    "contacts.updated",
    "enquiries.created",
    "enquiries.updated",
    "enquiries.converted",
    "contacts.assign",
    "contacts.collaborators",
    "contacts.archive",
    "contacts.restore",
    "contacts.merge",
    "note",
    "call",
    "email",
    "meeting",
    "other",
    "enquiries.assign",
)


def upgrade() -> None:
    op.add_column("timeline_event", sa.Column("duration_minutes", sa.Integer(), nullable=True))
    op.add_column("timeline_event", sa.Column("direction", sa.String(8), nullable=True))
    op.add_column(
        "timeline_event",
        sa.Column("activity_projects", postgresql.JSONB(), nullable=False, server_default="[]"),
    )
    op.execute("""CREATE FUNCTION kay_activity_projects_valid(value jsonb) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE AS $$ DECLARE item jsonb; BEGIN
      IF jsonb_typeof(value) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
      IF jsonb_array_length(value)>3 THEN RETURN false; END IF;
      FOR item IN SELECT * FROM jsonb_array_elements(value) LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'string'
          OR length(btrim(item #>> '{}')) NOT BETWEEN 1 AND 160 THEN RETURN false; END IF;
      END LOOP;
      RETURN true;
    END $$""")
    op.create_check_constraint(
        "timeline_duration",
        "timeline_event",
        "duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 1440",
    )
    op.create_check_constraint(
        "timeline_direction",
        "timeline_event",
        "direction IS NULL OR direction IN ('inbound','outbound')",
    )
    op.create_check_constraint(
        "timeline_activity_projects",
        "timeline_event",
        "kay_activity_projects_valid(activity_projects)",
    )
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    op.create_check_constraint(
        "timeline_action",
        "timeline_event",
        "action IN (" + ",".join(repr(value) for value in (*OLD_ACTIONS, "message", "visit")) + ")",
    )
    op.create_index(
        "ix_timeline_enquiry_time", "timeline_event", ["enquiry_id", "occurred_at", "id"]
    )
    op.create_index("ix_timeline_deal_time", "timeline_event", ["deal_id", "occurred_at", "id"])
    op.execute("""CREATE FUNCTION kay_activity_context_check() RETURNS trigger
    LANGUAGE plpgsql AS $$
    DECLARE parent uuid; manual boolean; BEGIN
      manual := NEW.action IN ('note','call','message','email','meeting','visit','other');
      IF NEW.duration_minutes IS NOT NULL OR NEW.direction IS NOT NULL
        OR NEW.activity_projects<>'[]'::jsonb THEN
        IF NOT manual OR (NEW.enquiry_id IS NULL AND NEW.deal_id IS NULL) THEN
          RAISE EXCEPTION 'ACTIVITY_CONTEXT_REQUIRED' USING ERRCODE='23514'; END IF;
      END IF;
      IF manual AND (NEW.enquiry_id IS NOT NULL OR NEW.deal_id IS NOT NULL) THEN
        IF NEW.enquiry_id IS NOT NULL AND NEW.deal_id IS NOT NULL THEN
          RAISE EXCEPTION 'ACTIVITY_SINGLE_CONTEXT_REQUIRED' USING ERRCODE='23514'; END IF;
        IF length(btrim(NEW.body))=0 THEN
          RAISE EXCEPTION 'ACTIVITY_BODY_REQUIRED' USING ERRCODE='23514'; END IF;
        IF NEW.enquiry_id IS NOT NULL THEN
          SELECT contact_id INTO parent FROM enquiry WHERE id=NEW.enquiry_id;
        ELSE SELECT contact_id INTO parent FROM deal WHERE id=NEW.deal_id; END IF;
        IF parent IS DISTINCT FROM NEW.contact_id THEN
          RAISE EXCEPTION 'ACTIVITY_CONTACT_MISMATCH' USING ERRCODE='23514'; END IF;
      END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER timeline_activity_context BEFORE INSERT ON timeline_event "
        "FOR EACH ROW EXECUTE FUNCTION kay_activity_context_check()"
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("ACTIVITY_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(
        sa.text("""SELECT EXISTS(SELECT 1 FROM timeline_event WHERE
        duration_minutes IS NOT NULL OR direction IS NOT NULL OR activity_projects<>'[]'::jsonb
        OR action IN ('message','visit') OR (action IN ('note','call','email','meeting','other')
        AND (enquiry_id IS NOT NULL OR deal_id IS NOT NULL)))""")
    ):
        raise RuntimeError("ACTIVITY_HISTORY_DOWNGRADE_REFUSED")
    op.execute("DROP TRIGGER timeline_activity_context ON timeline_event")
    op.execute("DROP FUNCTION kay_activity_context_check()")
    op.drop_index("ix_timeline_enquiry_time", table_name="timeline_event")
    op.drop_index("ix_timeline_deal_time", table_name="timeline_event")
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    op.create_check_constraint(
        "timeline_action",
        "timeline_event",
        "action IN (" + ",".join(repr(value) for value in OLD_ACTIONS) + ")",
    )
    for name in ("timeline_duration", "timeline_direction", "timeline_activity_projects"):
        op.drop_constraint(name, "timeline_event", type_="check")
    op.execute("DROP FUNCTION kay_activity_projects_valid(jsonb)")
    for name in ("duration_minutes", "direction", "activity_projects"):
        op.drop_column("timeline_event", name)
