"""Canonical private contacts, identity collections, enquiries and retry receipts."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.settings import load_settings

revision = "0004_contacts_enquiries"
down_revision = "0003_user_administration"
branch_labels = None
depends_on = None


def user_reference(name: str, *, nullable: bool = False) -> sa.Column[sa.Uuid]:
    return sa.Column(
        name, sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT"), nullable=nullable
    )


def contact_reference(*, primary: bool = False) -> sa.Column[sa.Uuid]:
    return sa.Column(
        "contact_id",
        sa.Uuid(),
        sa.ForeignKey("contact.id", ondelete="RESTRICT"),
        primary_key=primary,
        nullable=False,
    )


def timestamps() -> list[sa.Column[sa.DateTime]]:
    return [
        sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
        for name in ("created_at", "updated_at")
    ]


def upgrade() -> None:
    op.create_table(
        "contact",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("type", sa.String(24), nullable=False),
        user_reference("primary_agent_id"),
        user_reference("created_by_user_id"),
        sa.Column("source", sa.String(40), nullable=False),
        sa.Column("source_submission_id", sa.Uuid()),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.Column("version", sa.BigInteger(), nullable=False),
        *timestamps(),
        sa.CheckConstraint("length(btrim(name)) > 0", name="contact_name_required"),
        sa.CheckConstraint("type IN ('person','organization')", name="contact_type"),
    )
    op.create_index("ix_contact_scope", "contact", ["primary_agent_id", "archived_at"])
    op.create_index("ix_contact_updated_id", "contact", ["updated_at", "id"])
    for table, length in (("contact_phone", 16), ("contact_email", 254)):
        op.create_table(
            table,
            sa.Column("id", sa.Uuid(), primary_key=True),
            contact_reference(),
            sa.Column("normalized", sa.String(length), nullable=False),
            sa.Column("label", sa.String(40), nullable=False),
            sa.Column("is_primary", sa.Boolean(), nullable=False),
            sa.Column("archived_at", sa.DateTime(timezone=True)),
            user_reference("created_by_user_id"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )
        op.create_index(f"ix_{table}_contact_id", table, ["contact_id"])
    op.create_check_constraint(
        "contact_phone_e164", "contact_phone", r"normalized ~ '^\+[1-9][0-9]{6,14}$'"
    )
    op.create_check_constraint(
        "contact_email_normalized", "contact_email", "normalized = lower(btrim(normalized))"
    )
    op.create_index(
        "uq_active_phone",
        "contact_phone",
        ["normalized"],
        unique=True,
        postgresql_where=sa.text("archived_at IS NULL"),
    )
    for table, suffix in (("contact_phone", "phone"), ("contact_email", "email")):
        op.create_index(
            f"uq_primary_{suffix}",
            table,
            ["contact_id"],
            unique=True,
            postgresql_where=sa.text("is_primary AND archived_at IS NULL"),
        )
    op.create_table(
        "contact_role",
        contact_reference(primary=True),
        sa.Column("role", sa.String(24), primary_key=True),
        sa.CheckConstraint(
            "role IN ('buyer','seller','owner','tenant','developer')", name="contact_role_value"
        ),
    )
    op.create_table(
        "contact_collaborator",
        contact_reference(primary=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "enquiry",
        sa.Column("id", sa.Uuid(), primary_key=True),
        contact_reference(),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("source", sa.String(40), nullable=False),
        sa.Column("source_submission_id", sa.Uuid()),
        user_reference("assigned_agent_id", nullable=True),
        user_reference("created_by_user_id"),
        sa.Column(
            "received_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("version", sa.BigInteger(), nullable=False),
        *timestamps(),
        sa.CheckConstraint("status IN ('new','in_progress','closed')", name="enquiry_status"),
        sa.UniqueConstraint("source", "source_submission_id", name="uq_enquiry_source_submission"),
    )
    op.create_index("ix_enquiry_contact", "enquiry", ["contact_id", "updated_at", "id"])
    op.create_index("ix_enquiry_received", "enquiry", ["source", "received_at", "id"])
    op.create_table(
        "idempotency_record",
        sa.Column(
            "actor_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
        ),
        sa.Column("route", sa.String(100), primary_key=True),
        sa.Column("key", sa.Uuid(), primary_key=True),
        sa.Column("request_hash", sa.LargeBinary(32), nullable=False),
        contact_reference(),
        sa.Column("response", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_idempotency_record_created_at", "idempotency_record", ["created_at"])
    op.alter_column("audit_event", "target_user_id", nullable=True)
    for name, target in (("contact_id", "contact"), ("enquiry_id", "enquiry")):
        op.add_column("audit_event", sa.Column(name, sa.Uuid()))
        op.create_foreign_key(
            f"fk_audit_{target}", "audit_event", target, [name], ["id"], ondelete="RESTRICT"
        )
    op.drop_constraint("audit_identity_action", "audit_event")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        "action LIKE 'identity.%' OR action LIKE 'users.%' "
        "OR action LIKE 'contacts.%' OR action LIKE 'enquiries.%'",
    )
    create_identity_checks()


def create_identity_checks() -> None:
    # Deferred checks allow collection replacement inside one atomic transaction.
    op.execute("""
    CREATE FUNCTION kay_contact_primary_check() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE cid uuid; phone_count integer; phone_primary integer;
            email_count integer; email_primary integer;
    BEGIN
      IF TG_TABLE_NAME = 'contact' THEN
        IF TG_OP = 'DELETE' THEN cid := OLD.id; ELSE cid := NEW.id; END IF;
      ELSE
        IF TG_OP = 'DELETE' THEN cid := OLD.contact_id; ELSE cid := NEW.contact_id; END IF;
        IF TG_OP = 'UPDATE' AND OLD.contact_id <> NEW.contact_id THEN
          RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='IDENTITY_PARENT_IMMUTABLE';
        END IF;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM contact WHERE id=cid) THEN RETURN NULL; END IF;
      SELECT count(*), count(*) FILTER (WHERE is_primary) INTO phone_count, phone_primary
        FROM contact_phone WHERE contact_id=cid AND archived_at IS NULL;
      SELECT count(*), count(*) FILTER (WHERE is_primary) INTO email_count, email_primary
        FROM contact_email WHERE contact_id=cid AND archived_at IS NULL;
      IF phone_count=0 OR phone_primary<>1 OR (email_count>0 AND email_primary<>1) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='CONTACT_PRIMARY_REQUIRED';
      END IF;
      RETURN NULL;
    END $$
    """)
    for table in ("contact", "contact_phone", "contact_email"):
        op.execute(
            f"CREATE CONSTRAINT TRIGGER {table}_primary_check "
            f"AFTER INSERT OR UPDATE OR DELETE ON {table} "
            "DEFERRABLE INITIALLY DEFERRED FOR EACH ROW "
            "EXECUTE FUNCTION kay_contact_primary_check()"
        )  # noqa: S608 - fixed migration identifiers.
    op.execute("""
    CREATE FUNCTION kay_enquiry_scope_check() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.assigned_agent_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM contact c JOIN "user" u ON u.id=NEW.assigned_agent_id
        WHERE c.id=NEW.contact_id AND u.state='active' AND (
          u.role IN ('manager','administrator') OR c.primary_agent_id=u.id OR EXISTS (
            SELECT 1 FROM contact_collaborator cc WHERE cc.contact_id=c.id
              AND cc.user_id=u.id AND cc.revoked_at IS NULL
          )
        )
      ) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='ENQUIRY_ASSIGNEE_SCOPE'; END IF;
      RETURN NULL;
    END $$
    """)
    op.execute(
        "CREATE CONSTRAINT TRIGGER enquiry_scope_check AFTER INSERT OR UPDATE ON enquiry "
        "DEFERRABLE INITIALLY DEFERRED FOR EACH ROW "
        "EXECUTE FUNCTION kay_enquiry_scope_check()"
    )


def downgrade() -> None:
    if load_settings().app_environment == "development":
        raise RuntimeError("DEVELOPMENT_BUSINESS_DOWNGRADE_REFUSED")
    op.execute("DROP TRIGGER enquiry_scope_check ON enquiry")
    op.execute("DROP FUNCTION kay_enquiry_scope_check()")
    for table in ("contact", "contact_phone", "contact_email"):
        op.execute(f"DROP TRIGGER {table}_primary_check ON {table}")  # noqa: S608
    op.execute("DROP FUNCTION kay_contact_primary_check()")
    op.drop_constraint("audit_identity_action", "audit_event")
    op.create_check_constraint(
        "audit_identity_action", "audit_event", "action LIKE 'identity.%' OR action LIKE 'users.%'"
    )
    for name, target in (("contact_id", "contact"), ("enquiry_id", "enquiry")):
        op.drop_constraint(f"fk_audit_{target}", "audit_event", type_="foreignkey")
        op.drop_column("audit_event", name)
    op.alter_column("audit_event", "target_user_id", nullable=False)
    for table in (
        "idempotency_record",
        "enquiry",
        "contact_collaborator",
        "contact_role",
        "contact_email",
        "contact_phone",
        "contact",
    ):
        op.drop_table(table)
