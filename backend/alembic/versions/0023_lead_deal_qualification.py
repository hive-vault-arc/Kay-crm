"""Add client qualification and project interests without deleting legacy records."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.settings import load_settings

revision = "0023_lead_deal_qualification"
down_revision = "0022_website_intake"
branch_labels = None
depends_on = None

LEGACY_TIMELINE_ACTIONS = (
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
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    op.create_check_constraint(
        "timeline_action",
        "timeline_event",
        "action IN ("
        + ",".join(repr(value) for value in (*LEGACY_TIMELINE_ACTIONS, "enquiries.converted"))
        + ")",
    )
    for name in ("country", "nationality"):
        op.add_column("contact", sa.Column(name, sa.String(2), nullable=False, server_default=""))
        op.create_check_constraint(
            f"contact_{name}", "contact", f"{name}='' OR {name} ~ '^[A-Z]{{2}}$'"
        )
    op.add_column(
        "contact", sa.Column("languages", postgresql.JSONB(), nullable=False, server_default="[]")
    )
    op.create_check_constraint(
        "contact_languages",
        "contact",
        "jsonb_typeof(languages)='array' AND jsonb_array_length(languages)<=30",
    )
    for table in ("enquiry", "deal"):
        op.add_column(table, sa.Column("initial_budget", sa.String(160)))
        op.add_column(
            table,
            sa.Column("campaign_source", sa.String(40), nullable=False, server_default="unknown"),
        )
        op.add_column(
            table, sa.Column("rating", sa.String(8), nullable=False, server_default="cold")
        )
        op.create_check_constraint(f"{table}_rating", table, "rating IN ('cold','warm','hot')")
        op.create_check_constraint(
            f"{table}_budget",
            table,
            "initial_budget IS NULL OR length(btrim(initial_budget)) BETWEEN 1 AND 160",
        )
    op.drop_constraint("enquiry_status", "enquiry", type_="check")
    op.create_check_constraint(
        "enquiry_status",
        "enquiry",
        "status IN ('new','in_progress','follow_up','analysis','qualified',"
        "'not_qualified','lost','junk_lead','closed','converted')",
    )
    op.add_column("enquiry", sa.Column("converted_deal_id", sa.Uuid()))
    op.add_column("enquiry", sa.Column("converted_at", sa.DateTime(timezone=True)))
    op.create_foreign_key(
        "fk_enquiry_converted_deal",
        "enquiry",
        "deal",
        ["converted_deal_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint("uq_enquiry_converted_deal", "enquiry", ["converted_deal_id"])
    op.add_column(
        "deal",
        sa.Column("purchase_reasons", postgresql.JSONB(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "deal",
        sa.Column("client_snapshot", postgresql.JSONB(), nullable=False, server_default="{}"),
    )
    op.add_column("deal", sa.Column("payment_method", sa.String(24)))
    op.add_column("deal", sa.Column("number_of_rooms", sa.Integer()))
    op.add_column("deal", sa.Column("notes", sa.String(4000), nullable=False, server_default=""))
    op.create_check_constraint(
        "deal_purchase_reasons",
        "deal",
        "jsonb_typeof(purchase_reasons)='array' AND jsonb_array_length(purchase_reasons)<=8",
    )
    op.create_check_constraint(
        "deal_client_snapshot", "deal", "jsonb_typeof(client_snapshot)='object'"
    )
    op.add_column(
        "deal_stage_event",
        sa.Column("qualification", postgresql.JSONB(), nullable=False, server_default="{}"),
    )
    op.create_table(
        "deal_project",
        sa.Column(
            "deal_id", sa.Uuid(), sa.ForeignKey("deal.id", ondelete="RESTRICT"), primary_key=True
        ),
        sa.Column("position", sa.SmallInteger(), primary_key=True),
        sa.Column(
            "development_id", sa.Uuid(), sa.ForeignKey("development.id", ondelete="RESTRICT")
        ),
        sa.Column("property_id", sa.Uuid(), sa.ForeignKey("property.id", ondelete="RESTRICT")),
        sa.Column("external_name", sa.String(160)),
        sa.Column("name", sa.String(160), nullable=False),
        sa.CheckConstraint("position BETWEEN 1 AND 3", name="deal_project_position"),
        sa.CheckConstraint(
            "num_nonnulls(development_id,property_id,external_name)=1", name="deal_project_target"
        ),
        sa.CheckConstraint("length(btrim(name))>0", name="deal_project_name"),
        sa.CheckConstraint(
            "external_name IS NULL OR length(btrim(external_name))>0",
            name="deal_project_external_name",
        ),
    )
    for target in ("development", "property"):
        op.create_index(f"ix_deal_project_{target}_id", "deal_project", [f"{target}_id"])
        op.create_index(
            f"uq_deal_project_{target}",
            "deal_project",
            ["deal_id", f"{target}_id"],
            unique=True,
            postgresql_where=sa.text(f"{target}_id IS NOT NULL"),
        )
    op.create_check_constraint(
        "enquiry_conversion_state",
        "enquiry",
        "(status='converted' AND converted_deal_id IS NOT NULL AND converted_at IS NOT NULL) "
        "OR (status<>'converted' AND converted_deal_id IS NULL AND converted_at IS NULL)",
    )
    op.execute("""CREATE FUNCTION kay_validate_lead_conversion(eid uuid) RETURNS void
    LANGUAGE plpgsql AS $$ DECLARE e enquiry%ROWTYPE; d deal%ROWTYPE; BEGIN
      SELECT * INTO e FROM enquiry WHERE id=eid;
      IF NOT FOUND OR e.converted_deal_id IS NULL THEN RETURN; END IF;
      SELECT * INTO d FROM deal WHERE id=e.converted_deal_id;
      IF NOT FOUND OR d.enquiry_id IS DISTINCT FROM e.id
        OR d.contact_id IS DISTINCT FROM e.contact_id OR d.initial_budget IS NULL
        OR jsonb_array_length(d.purchase_reasons)=0 OR d.client_snapshot='{}'::jsonb
        OR NOT EXISTS(SELECT 1 FROM deal_project WHERE deal_id=d.id)
        OR (SELECT count(*) FROM deal WHERE enquiry_id=e.id
          AND stage NOT IN ('won','lost','cancelled'))>1
      THEN RAISE EXCEPTION 'LEAD_CONVERSION_INCONSISTENT' USING ERRCODE='23514'; END IF;
    END $$""")
    op.execute("""CREATE FUNCTION kay_lead_conversion_check() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN
      IF TG_TABLE_NAME='enquiry' THEN PERFORM kay_validate_lead_conversion(NEW.id);
      ELSIF TG_TABLE_NAME='deal' THEN
        IF TG_OP<>'INSERT' THEN PERFORM kay_validate_lead_conversion(OLD.enquiry_id); END IF;
        IF TG_OP<>'DELETE' THEN PERFORM kay_validate_lead_conversion(NEW.enquiry_id); END IF;
      ELSE
        IF TG_OP<>'INSERT' THEN
          PERFORM kay_validate_lead_conversion((SELECT enquiry_id FROM deal WHERE id=OLD.deal_id));
        END IF;
        IF TG_OP<>'DELETE' THEN
          PERFORM kay_validate_lead_conversion((SELECT enquiry_id FROM deal WHERE id=NEW.deal_id));
        END IF;
      END IF;
      RETURN NULL;
    END $$""")
    for table in ("enquiry", "deal", "deal_project"):
        operations = "INSERT OR UPDATE" if table == "enquiry" else "INSERT OR UPDATE OR DELETE"
        op.execute(f"""CREATE CONSTRAINT TRIGGER {table}_conversion_consistency
          AFTER {operations} ON {table} DEFERRABLE INITIALLY DEFERRED
          FOR EACH ROW EXECUTE FUNCTION kay_lead_conversion_check()""")
    op.execute("""CREATE FUNCTION kay_lead_conversion_identity() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN
      IF OLD.converted_deal_id IS NOT NULL
        AND OLD.converted_deal_id IS DISTINCT FROM NEW.converted_deal_id
        AND (current_database()<>'kayrealestate_test'
          OR current_setting('kay.synthetic_cleanup',true) IS DISTINCT FROM 'on')
        AND (NEW.converted_deal_id IS NULL OR EXISTS(
          SELECT 1 FROM deal WHERE id=OLD.converted_deal_id
            AND stage NOT IN ('won','lost','cancelled')))
      THEN RAISE EXCEPTION 'LEAD_CONVERSION_IDENTITY' USING ERRCODE='23514'; END IF;
      RETURN NEW;
    END $$""")
    op.execute("""CREATE TRIGGER enquiry_conversion_identity BEFORE UPDATE ON enquiry
      FOR EACH ROW EXECUTE FUNCTION kay_lead_conversion_identity()""")


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("QUALIFICATION_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(
        sa.text("SELECT EXISTS(SELECT 1 FROM contact) OR EXISTS(SELECT 1 FROM deal)")
    ):
        raise RuntimeError("QUALIFICATION_HISTORY_DOWNGRADE_REFUSED")
    op.execute("DROP TRIGGER enquiry_conversion_identity ON enquiry")
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    op.create_check_constraint(
        "timeline_action",
        "timeline_event",
        "action IN (" + ",".join(repr(value) for value in LEGACY_TIMELINE_ACTIONS) + ")",
    )
    op.execute("DROP FUNCTION kay_lead_conversion_identity()")
    for table in ("enquiry", "deal", "deal_project"):
        op.execute(f"DROP TRIGGER {table}_conversion_consistency ON {table}")
    op.execute("DROP FUNCTION kay_lead_conversion_check()")
    op.execute("DROP FUNCTION kay_validate_lead_conversion(uuid)")
    op.drop_constraint("enquiry_conversion_state", "enquiry", type_="check")
    op.drop_table("deal_project")
    op.drop_column("deal_stage_event", "qualification")
    for name in ("deal_purchase_reasons", "deal_client_snapshot"):
        op.drop_constraint(name, "deal", type_="check")
    for name in (
        "purchase_reasons",
        "client_snapshot",
        "payment_method",
        "number_of_rooms",
        "notes",
    ):
        op.drop_column("deal", name)
    op.drop_constraint("uq_enquiry_converted_deal", "enquiry", type_="unique")
    op.drop_constraint("fk_enquiry_converted_deal", "enquiry", type_="foreignkey")
    op.drop_column("enquiry", "converted_deal_id")
    op.drop_column("enquiry", "converted_at")
    op.drop_constraint("enquiry_status", "enquiry", type_="check")
    op.create_check_constraint(
        "enquiry_status", "enquiry", "status IN ('new','in_progress','closed')"
    )
    for table in ("enquiry", "deal"):
        for suffix in ("rating", "budget"):
            op.drop_constraint(f"{table}_{suffix}", table, type_="check")
        for name in ("initial_budget", "campaign_source", "rating"):
            op.drop_column(table, name)
    for name in ("country", "nationality", "languages"):
        op.drop_constraint(f"contact_{name}", "contact", type_="check")
        op.drop_column("contact", name)
