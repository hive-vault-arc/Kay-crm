"""Private typed files, immutable versions, temporary permits and durable scan jobs."""

import sqlalchemy as sa

from alembic import op

revision = "0010_protected_files"
down_revision = "0009_development_hierarchy"
branch_labels = None
depends_on = None


def ref(name: str, target: str, nullable: bool = False, **kwargs: object) -> sa.Column:
    return sa.Column(
        name, sa.UUID(), sa.ForeignKey(target, ondelete="RESTRICT"), nullable=nullable, **kwargs
    )


def timestamp(name: str = "created_at", nullable: bool = False) -> sa.Column:
    return sa.Column(
        name,
        sa.DateTime(timezone=True),
        nullable=nullable,
        server_default=sa.func.now() if not nullable else None,
    )


def upgrade() -> None:
    op.create_table(
        "document",
        sa.Column("id", sa.UUID(), primary_key=True),
        ref("contact_id", "contact.id", True),
        ref("origin_contact_id", "contact.id", True),
        ref("development_id", "development.id", True),
        ref("property_id", "property.id", True),
        sa.Column("filename", sa.String(180), nullable=False),
        sa.Column("mime_type", sa.String(120), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        ref("created_by_user_id", "user.id"),
        sa.Column("version", sa.BigInteger(), nullable=False),
        timestamp(),
        timestamp("archived_at", True),
        sa.CheckConstraint(
            "num_nonnulls(contact_id,development_id,property_id)=1", name="document_one_parent"
        ),
        sa.CheckConstraint(
            "(contact_id IS NULL)=(origin_contact_id IS NULL)", name="document_contact_origin"
        ),
        sa.CheckConstraint("size_bytes>0 AND size_bytes<=20971520", name="document_size"),
        sa.CheckConstraint("version>0", name="document_version_positive"),
    )
    for column in ("contact_id", "origin_contact_id", "development_id", "property_id"):
        op.create_index(f"ix_document_{column}", "document", [column])
    op.create_table(
        "document_version",
        sa.Column("id", sa.UUID(), primary_key=True),
        ref("document_id", "document.id"),
        sa.Column("object_key", sa.UUID(), nullable=False, unique=True),
        ref("created_by_user_id", "user.id"),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("sha256", sa.LargeBinary(32)),
        sa.Column("state", sa.String(24), nullable=False),
        sa.Column("scan_error", sa.String(40)),
        sa.Column("scanner_version", sa.String(160)),
        timestamp(),
        timestamp("scanned_at", True),
        sa.CheckConstraint(
            "state IN ('awaiting_upload','pending_scan','clean','rejected')",
            name="document_scan_state",
        ),
        sa.CheckConstraint("size_bytes>0 AND size_bytes<=20971520", name="document_version_size"),
        sa.CheckConstraint(
            "(state='awaiting_upload')=(sha256 IS NULL)", name="document_version_hash_state"
        ),
        sa.CheckConstraint(
            "(state IN ('clean','rejected'))=(scanned_at IS NOT NULL)", name="document_verdict_time"
        ),
    )
    op.create_index(
        "ix_document_version_document_created",
        "document_version",
        ["document_id", "created_at", "id"],
    )
    op.create_table(
        "file_permit",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("token_hash", sa.LargeBinary(32), nullable=False, unique=True),
        ref("session_id", "session.id"),
        ref("version_id", "document_version.id"),
        sa.Column("action", sa.String(16), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        timestamp(),
        timestamp("expires_at"),
        timestamp("consumed_at", True),
        sa.CheckConstraint("action IN ('upload','download')", name="file_permit_action"),
        sa.CheckConstraint("size_bytes>0 AND size_bytes<=20971520", name="file_permit_size"),
        sa.CheckConstraint(
            "expires_at>created_at AND expires_at<=created_at+interval '5 minutes'",
            name="file_permit_lifetime",
        ),
    )
    for column in ("session_id", "version_id"):
        op.create_index(f"ix_file_permit_{column}", "file_permit", [column])
    op.create_index("ix_file_permit_expiry", "file_permit", ["expires_at", "consumed_at"])
    op.create_table(
        "file_command_receipt",
        ref("actor_id", "user.id", primary_key=True),
        sa.Column("key", sa.UUID(), primary_key=True),
        sa.Column("operation", sa.String(100), nullable=False),
        sa.Column("request_hash", sa.LargeBinary(32), nullable=False),
        ref("document_id", "document.id"),
        timestamp(),
    )
    op.create_index("ix_file_command_receipt_document_id", "file_command_receipt", ["document_id"])
    op.create_table(
        "outbox_event",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("kind", sa.String(60), nullable=False),
        ref("version_id", "document_version.id", unique=True),
        sa.Column("dedupe_key", sa.String(160), nullable=False, unique=True),
        timestamp(),
    )
    op.create_table(
        "job",
        sa.Column("id", sa.UUID(), primary_key=True),
        ref("outbox_id", "outbox_event.id", unique=True),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        timestamp("available_at"),
        sa.Column("lease_token", sa.UUID()),
        timestamp("lease_until", True),
        sa.Column("error_code", sa.String(40)),
        sa.CheckConstraint(
            "state IN ('ready','running','retry','done','failed')", name="job_state"
        ),
        sa.CheckConstraint("attempts>=0 AND attempts<=5", name="job_attempts"),
        sa.CheckConstraint(
            "(state='running')=(lease_token IS NOT NULL AND lease_until IS NOT NULL)",
            name="job_lease",
        ),
    )
    op.create_index("ix_job_available", "job", ["state", "available_at"])
    op.create_table(
        "notification",
        sa.Column("id", sa.UUID(), primary_key=True),
        ref("user_id", "user.id"),
        sa.Column("event_key", sa.String(160), nullable=False),
        ref("document_id", "document.id"),
        timestamp(),
    )
    op.create_index(
        "uq_notification_user_event", "notification", ["user_id", "event_key"], unique=True
    )
    op.create_index("ix_notification_document_id", "notification", ["document_id"])
    audit_actions(True)
    op.execute("""CREATE FUNCTION kay_document_identity_check() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN OLD; END IF;
        RAISE EXCEPTION 'DOCUMENT_DELETE_REFUSED' USING ERRCODE='23514';
      END IF;
      IF ROW(NEW.id,NEW.origin_contact_id,NEW.development_id,NEW.property_id,NEW.filename,
             NEW.mime_type,NEW.size_bytes,NEW.created_by_user_id,NEW.created_at)
         IS DISTINCT FROM ROW(OLD.id,OLD.origin_contact_id,OLD.development_id,OLD.property_id,
             OLD.filename,OLD.mime_type,OLD.size_bytes,OLD.created_by_user_id,OLD.created_at)
      OR (NEW.contact_id IS DISTINCT FROM OLD.contact_id AND
          current_setting('kay.document_merge',true) IS DISTINCT FROM 'on') THEN
        RAISE EXCEPTION 'DOCUMENT_IDENTITY_IMMUTABLE' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER document_identity_guard BEFORE UPDATE OR DELETE ON document "
        "FOR EACH ROW EXECUTE FUNCTION kay_document_identity_check()"
    )
    op.execute("""CREATE FUNCTION kay_file_version_check() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN OLD; END IF;
        RAISE EXCEPTION 'FILE_VERSION_DELETE_REFUSED' USING ERRCODE='23514';
      END IF;
      IF ROW(NEW.id,NEW.document_id,NEW.object_key,NEW.created_by_user_id,
         NEW.size_bytes,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.document_id,
         OLD.object_key,OLD.created_by_user_id,OLD.size_bytes,OLD.created_at)
         OR (OLD.sha256 IS NOT NULL AND NEW.sha256 IS DISTINCT FROM OLD.sha256)
         OR (OLD.state IN ('clean','rejected') AND NEW IS DISTINCT FROM OLD)
         OR (OLD.state='pending_scan' AND NEW.state='awaiting_upload') THEN
        RAISE EXCEPTION 'FILE_VERSION_IMMUTABLE' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER document_version_guard BEFORE UPDATE OR DELETE ON document_version "
        "FOR EACH ROW EXECUTE FUNCTION kay_file_version_check()"
    )


def audit_actions(files: bool) -> None:
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    expression = " OR ".join(
        f"action LIKE '{prefix}.%'"
        for prefix in (
            "identity",
            "users",
            "contacts",
            "enquiries",
            "properties",
            "offerings",
            "developments",
        )
    )
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        expression + (" OR action LIKE 'documents.%'" if files else ""),
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT current_database()")) == "kayrealestate":
        raise RuntimeError("DEVELOPMENT_DOWNGRADE_REFUSED")
    if connection.scalar(sa.text("SELECT EXISTS(SELECT 1 FROM document)")):
        raise RuntimeError("FILE_HISTORY_DOWNGRADE_REFUSED")
    op.execute("DROP TRIGGER document_version_guard ON document_version")
    op.execute("DROP FUNCTION kay_file_version_check()")
    op.execute("DROP TRIGGER document_identity_guard ON document")
    op.execute("DROP FUNCTION kay_document_identity_check()")
    for table in (
        "notification",
        "job",
        "outbox_event",
        "file_command_receipt",
        "file_permit",
        "document_version",
        "document",
    ):
        op.drop_table(table)
    audit_actions(False)
