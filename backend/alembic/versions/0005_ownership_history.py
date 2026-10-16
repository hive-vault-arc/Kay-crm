"""Ownership, immutable business history and recoverable merge provenance."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0005_ownership_history"
down_revision = "0004_contacts_enquiries"
branch_labels = None
depends_on = None


def ref(name: str, table: str, nullable: bool = True) -> sa.Column[sa.Uuid]:
    return sa.Column(
        name, sa.Uuid(), sa.ForeignKey(f"{table}.id", ondelete="RESTRICT"), nullable=nullable
    )


def upgrade() -> None:
    op.add_column("contact", ref("merged_into_contact_id", "contact"))
    op.create_index("ix_contact_merged_into_contact_id", "contact", ["merged_into_contact_id"])
    op.create_check_constraint(
        "contact_merge_alias",
        "contact",
        "merged_into_contact_id IS NULL OR "
        "(merged_into_contact_id <> id AND archived_at IS NOT NULL)",
    )
    # Drain existing deferred checks before tightening a backfilled column.
    op.execute("SET CONSTRAINTS ALL IMMEDIATE")
    for table in ("contact_phone", "contact_email", "enquiry"):
        if table == "enquiry":
            # Origin-only backfill must retain a legacy disabled assignee, not invent
            # an assignment change or actor. ALTER holds the table lock until commit.
            op.execute("ALTER TABLE enquiry DISABLE TRIGGER enquiry_scope_check")
        op.add_column(table, ref("origin_contact_id", "contact"))
        op.execute(f"UPDATE {table} SET origin_contact_id=contact_id")  # noqa: S608
        op.alter_column(table, "origin_contact_id", nullable=False)
        if table == "enquiry":
            op.execute("ALTER TABLE enquiry ENABLE TRIGGER enquiry_scope_check")
    op.execute("SET CONSTRAINTS ALL DEFERRED")
    # Keep unexpired SP-05 retry snapshots readable under the additive wire schema.
    op.execute("""UPDATE idempotency_record
      SET response=response || jsonb_build_object('archived_at',NULL,'collaborators','[]'::jsonb)
      WHERE response ? 'phones' AND NOT response ? 'archived_at'""")
    op.execute("""UPDATE idempotency_record SET response=
      jsonb_set(response,'{contact}',response->'contact' || jsonb_build_object('archived_at',NULL))
      || jsonb_build_object('origin_contact_id',response->'contact'->'id')
      WHERE response ? 'contact' AND NOT response ? 'origin_contact_id'""")
    op.create_table(
        "timeline_event",
        sa.Column("id", sa.Uuid(), primary_key=True),
        ref("contact_id", "contact", False),
        ref("actor_user_id", "user", False),
        sa.Column("actor_name", sa.String(160), nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("reason", sa.String(1000), nullable=False),
        ref("enquiry_id", "enquiry"),
        ref("related_contact_id", "contact"),
        sa.Column(
            "occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("length(btrim(actor_name)) > 0", name="timeline_actor_name"),
        sa.CheckConstraint(
            "length(body) <= 4000 AND length(reason) <= 1000", name="timeline_text_bounds"
        ),
        sa.CheckConstraint(
            "action IN ('contacts.created','contacts.updated','enquiries.created',"
            "'enquiries.updated','contacts.assign','contacts.collaborators','contacts.archive',"
            "'contacts.restore','contacts.merge','note','call','email','meeting','other',"
            "'enquiries.assign')",
            name="timeline_action",
        ),
    )
    op.create_index(
        "ix_timeline_contact_time", "timeline_event", ["contact_id", "occurred_at", "id"]
    )
    op.create_table(
        "assignment_event",
        sa.Column("id", sa.Uuid(), primary_key=True),
        ref("contact_id", "contact", False),
        ref("actor_user_id", "user", False),
        sa.Column("actor_name", sa.String(160), nullable=False),
        sa.Column("action", sa.String(32), nullable=False),
        ref("previous_user_id", "user"),
        ref("new_user_id", "user"),
        sa.Column("previous_name", sa.String(160)),
        sa.Column("new_name", sa.String(160)),
        ref("enquiry_id", "enquiry"),
        sa.Column("reason", sa.String(1000), nullable=False),
        sa.Column(
            "occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "action IN ('primary','collaborator_added','collaborator_removed','enquiry')",
            name="assignment_action",
        ),
        sa.CheckConstraint("length(btrim(reason)) BETWEEN 1 AND 1000", name="assignment_reason"),
    )
    op.create_index(
        "ix_assignment_contact_time", "assignment_event", ["contact_id", "occurred_at", "id"]
    )
    # Preserve known actors/times only. Never invent pre-migration changes or notes.
    op.execute("""INSERT INTO timeline_event
      (id, contact_id, actor_user_id, actor_name, action, body, reason, enquiry_id, occurred_at)
      SELECT a.id,a.contact_id,a.actor_user_id,u.display_name,a.action,'','',
        a.enquiry_id,a.created_at
      FROM audit_event a JOIN "user" u ON u.id=a.actor_user_id
      WHERE a.contact_id IS NOT NULL AND a.action IN
        ('contacts.created','contacts.updated','enquiries.created','enquiries.updated')""")
    op.execute("""CREATE FUNCTION kay_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP='DELETE' AND current_database()='kayrealestate_test'
         AND current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN OLD; END IF;
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='BUSINESS_HISTORY_IMMUTABLE';
    END $$""")
    for table in ("timeline_event", "assignment_event"):
        op.execute(
            f"CREATE TRIGGER {table}_immutable BEFORE UPDATE OR DELETE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION kay_history_immutable()"
        )  # noqa: S608
    op.execute("""CREATE FUNCTION kay_origin_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.origin_contact_id <> NEW.origin_contact_id THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='CONTACT_ORIGIN_IMMUTABLE'; END IF;
      RETURN NEW;
    END $$""")
    for table in ("contact_phone", "contact_email", "enquiry"):
        op.execute(
            f"CREATE TRIGGER {table}_origin BEFORE UPDATE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION kay_origin_immutable()"
        )  # noqa: S608
    # A merged alias retains original identity rows, but no longer needs active values.
    op.execute("""CREATE OR REPLACE FUNCTION kay_contact_primary_check()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE cid uuid; phone_count integer; phone_primary integer;
            email_count integer; email_primary integer;
    BEGIN
      IF TG_TABLE_NAME='contact' THEN
        IF TG_OP='DELETE' THEN cid:=OLD.id; ELSE cid:=NEW.id; END IF;
      ELSE
        IF TG_OP='DELETE' THEN cid:=OLD.contact_id; ELSE cid:=NEW.contact_id; END IF;
        IF TG_OP='UPDATE' AND OLD.contact_id<>NEW.contact_id THEN
          RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='IDENTITY_PARENT_IMMUTABLE'; END IF;
      END IF;
      IF NOT EXISTS(SELECT 1 FROM contact WHERE id=cid AND merged_into_contact_id IS NULL)
        THEN RETURN NULL; END IF;
      SELECT count(*),count(*) FILTER(WHERE is_primary) INTO phone_count,phone_primary
        FROM contact_phone WHERE contact_id=cid AND archived_at IS NULL;
      SELECT count(*),count(*) FILTER(WHERE is_primary) INTO email_count,email_primary
        FROM contact_email WHERE contact_id=cid AND archived_at IS NULL;
      IF phone_count=0 OR phone_primary<>1 OR (email_count>0 AND email_primary<>1) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='CONTACT_PRIMARY_REQUIRED'; END IF;
      RETURN NULL;
    END $$""")
    op.execute("""CREATE FUNCTION kay_contact_assignment_check()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE cid uuid;
    BEGIN
      IF TG_TABLE_NAME='contact' THEN cid:=NEW.id;
      ELSIF TG_OP='DELETE' THEN cid:=OLD.contact_id; ELSE cid:=NEW.contact_id; END IF;
      IF EXISTS(SELECT 1 FROM enquiry e JOIN contact c ON c.id=e.contact_id
        LEFT JOIN "user" u ON u.id=e.assigned_agent_id
        WHERE c.id=cid AND e.assigned_agent_id IS NOT NULL
        AND NOT (u.state='active' AND (u.role IN ('manager','administrator')
          OR c.primary_agent_id=u.id
          OR EXISTS(SELECT 1 FROM contact_collaborator cc WHERE cc.contact_id=c.id
            AND cc.user_id=u.id AND cc.revoked_at IS NULL)))) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='ENQUIRY_ASSIGNEE_SCOPE'; END IF;
      RETURN NULL;
    END $$""")
    for table in ("contact", "contact_collaborator"):
        events = "UPDATE" if table == "contact" else "INSERT OR UPDATE OR DELETE"
        op.execute(
            f"CREATE CONSTRAINT TRIGGER {table}_assignment_check AFTER {events} ON {table} "
            "DEFERRABLE INITIALLY DEFERRED FOR EACH ROW "
            "EXECUTE FUNCTION kay_contact_assignment_check()"
        )  # noqa: S608
    op.execute("""CREATE OR REPLACE FUNCTION kay_enquiry_scope_check()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF EXISTS(SELECT 1 FROM enquiry e JOIN contact c ON c.id=e.contact_id
        LEFT JOIN "user" u ON u.id=e.assigned_agent_id
        WHERE e.id=NEW.id AND e.assigned_agent_id IS NOT NULL
        AND NOT (u.state='active' AND (u.role IN ('manager','administrator')
          OR c.primary_agent_id=u.id
          OR EXISTS(SELECT 1 FROM contact_collaborator cc WHERE cc.contact_id=c.id
            AND cc.user_id=u.id AND cc.revoked_at IS NULL)))) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='ENQUIRY_ASSIGNEE_SCOPE'; END IF;
      RETURN NULL;
    END $$""")


def downgrade() -> None:
    if load_settings().app_environment == "development":
        raise RuntimeError("DEVELOPMENT_BUSINESS_DOWNGRADE_REFUSED")
    # Downgrade cannot erase business history or merge provenance.
    bind = op.get_bind()
    if bind.scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM timeline_event) OR "
            "EXISTS(SELECT 1 FROM assignment_event) OR "
            "EXISTS(SELECT 1 FROM contact WHERE merged_into_contact_id IS NOT NULL)"
        )
    ):
        raise RuntimeError("BUSINESS_HISTORY_DOWNGRADE_REFUSED")
    for table in ("contact", "contact_collaborator"):
        op.execute(f"DROP TRIGGER {table}_assignment_check ON {table}")  # noqa: S608
    op.execute("DROP FUNCTION kay_contact_assignment_check()")
    for table in ("timeline_event", "assignment_event"):
        op.drop_table(table)
    op.execute("DROP FUNCTION kay_history_immutable()")
    for table in ("contact_phone", "contact_email", "enquiry"):
        op.execute(f"DROP TRIGGER {table}_origin ON {table}")  # noqa: S608
        op.drop_column(table, "origin_contact_id")
    op.execute("DROP FUNCTION kay_origin_immutable()")
    op.drop_constraint("contact_merge_alias", "contact")
    op.drop_index("ix_contact_merged_into_contact_id", "contact")
    op.drop_column("contact", "merged_into_contact_id")
    # Restore the previous reviewed primary function without recreating its triggers.
    op.execute("""CREATE OR REPLACE FUNCTION kay_contact_primary_check()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE cid uuid; pc integer; pp integer; ec integer; ep integer;
    BEGIN
      IF TG_TABLE_NAME='contact' THEN
        IF TG_OP='DELETE' THEN cid:=OLD.id; ELSE cid:=NEW.id; END IF;
      ELSE
        IF TG_OP='DELETE' THEN cid:=OLD.contact_id; ELSE cid:=NEW.contact_id; END IF;
        IF TG_OP='UPDATE' AND OLD.contact_id<>NEW.contact_id THEN
          RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='IDENTITY_PARENT_IMMUTABLE'; END IF;
      END IF;
      IF NOT EXISTS(SELECT 1 FROM contact WHERE id=cid) THEN RETURN NULL; END IF;
      SELECT count(*),count(*) FILTER(WHERE is_primary) INTO pc,pp FROM contact_phone
        WHERE contact_id=cid AND archived_at IS NULL;
      SELECT count(*),count(*) FILTER(WHERE is_primary) INTO ec,ep FROM contact_email
        WHERE contact_id=cid AND archived_at IS NULL;
      IF pc=0 OR pp<>1 OR (ec>0 AND ep<>1) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='CONTACT_PRIMARY_REQUIRED'; END IF;
      RETURN NULL;
    END $$""")
