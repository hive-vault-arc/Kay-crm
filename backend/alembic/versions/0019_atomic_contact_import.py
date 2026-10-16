"""Private import evidence and atomic contact result guards; additive to0018."""

# ruff: noqa: E501

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0019_atomic_contact_import"
down_revision = "0018_commissions_collections"
branch_labels = None
depends_on = None


def ref(name: str, target: str, *, nullable: bool = False, primary: bool = False) -> sa.Column:
    return sa.Column(
        name,
        sa.Uuid(),
        sa.ForeignKey(target, ondelete="RESTRICT"),
        nullable=nullable,
        primary_key=primary,
    )


def upgrade() -> None:
    audit_actions(True)
    op.create_table(
        "import_batch",
        sa.Column("id", sa.Uuid(), primary_key=True),
        ref("author_user_id", "user.id"),
        sa.Column("create_key", sa.Uuid(), nullable=False),
        sa.Column("filename", sa.String(180), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("state", sa.String(24), nullable=False),
        sa.Column("version", sa.BigInteger(), nullable=False),
        sa.Column("object_key", sa.Uuid(), unique=True),
        sa.Column("file_hash", sa.LargeBinary(32)),
        sa.Column("permit_hash", sa.LargeBinary(32)),
        sa.Column("binding_hash", sa.LargeBinary(32)),
        ref("permit_session_id", "session.id", nullable=True),
        sa.Column("permit_expires_at", sa.DateTime(timezone=True)),
        sa.Column("permit_consumed_at", sa.DateTime(timezone=True)),
        ref("fallback_agent_id", "user.id", nullable=True),
        sa.Column("preview_hash", sa.String(64)),
        sa.Column("counts", JSONB(), nullable=False),
        sa.Column("approval_key", sa.Uuid()),
        sa.Column("approval_hash", sa.LargeBinary(32)),
        ref("approved_by_user_id", "user.id", nullable=True),
        sa.Column("result", JSONB()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("author_user_id", "create_key", name="uq_import_create_key"),
        sa.CheckConstraint(
            "state IN ('awaiting_upload','uploading','uploaded','previewed','repreview_required','committed')",
            name="import_batch_state",
        ),
        sa.CheckConstraint(
            "size_bytes BETWEEN 1 AND 20971520 AND version>0", name="import_batch_bounds"
        ),
    )
    op.create_index(
        "ix_import_batch_author_created", "import_batch", ["author_user_id", "created_at"]
    )
    op.create_table(
        "import_row",
        ref("batch_id", "import_batch.id", primary=True),
        sa.Column("row_number", sa.Integer(), primary_key=True),
        sa.Column("values", JSONB(), nullable=False),
        sa.Column("normalized", JSONB()),
        sa.Column("errors", JSONB(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        ref("agent_id", "user.id", nullable=True),
        sa.Column("agent_name", sa.String(160)),
        ref("override_agent_id", "user.id", nullable=True),
        ref("contact_id", "contact.id", nullable=True),
        sa.CheckConstraint("row_number BETWEEN 2 AND 50001", name="import_row_number"),
        sa.CheckConstraint(
            "status IN ('eligible','invalid','skipped_existing','committed')",
            name="import_row_status",
        ),
    )
    op.create_table(
        "import_preview",
        sa.Column("id", sa.Uuid(), primary_key=True),
        ref("batch_id", "import_batch.id"),
        sa.Column("version", sa.BigInteger(), nullable=False),
        sa.Column("preview_hash", sa.String(64), nullable=False),
        sa.Column("counts", JSONB(), nullable=False),
        ref("actor_user_id", "user.id"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("batch_id", "version", name="uq_import_preview_version"),
    )
    op.execute("""
    CREATE FUNCTION kay_import_guard() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE parent_state text;
    BEGIN
      IF current_setting('kay.synthetic_cleanup',true)='on' THEN IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'IMPORT_EVIDENCE_RETAINED' USING ERRCODE='23514'; END IF;
      IF TG_OP='INSERT' THEN
        IF EXISTS(SELECT 1 FROM import_batch WHERE id=NEW.batch_id AND state='committed')
          THEN RAISE EXCEPTION 'IMPORT_ROW_IMMUTABLE' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END IF;
      IF TG_TABLE_NAME='import_preview' THEN RAISE EXCEPTION 'IMPORT_PREVIEW_IMMUTABLE' USING ERRCODE='23514'; END IF;
      IF TG_TABLE_NAME='import_batch' THEN
        IF OLD.state='committed' OR (NEW.id,NEW.author_user_id,NEW.create_key,NEW.filename,NEW.size_bytes,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.author_user_id,OLD.create_key,OLD.filename,OLD.size_bytes,OLD.created_at)
          OR (OLD.file_hash IS NOT NULL AND (NEW.file_hash,NEW.object_key) IS DISTINCT FROM (OLD.file_hash,OLD.object_key))
          THEN RAISE EXCEPTION 'IMPORT_BATCH_IMMUTABLE' USING ERRCODE='23514'; END IF;
      ELSE
        SELECT state INTO parent_state FROM import_batch WHERE id=NEW.batch_id;
        IF parent_state='committed' OR (NEW.batch_id,NEW.row_number,NEW.values) IS DISTINCT FROM (OLD.batch_id,OLD.row_number,OLD.values)
          OR OLD.contact_id IS NOT NULL THEN RAISE EXCEPTION 'IMPORT_ROW_IMMUTABLE' USING ERRCODE='23514'; END IF;
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER import_batch_guard BEFORE UPDATE OR DELETE ON import_batch FOR EACH ROW EXECUTE FUNCTION kay_import_guard();
    CREATE TRIGGER import_row_guard BEFORE INSERT OR UPDATE OR DELETE ON import_row FOR EACH ROW EXECUTE FUNCTION kay_import_guard();
    CREATE TRIGGER import_preview_guard BEFORE UPDATE OR DELETE ON import_preview FOR EACH ROW EXECUTE FUNCTION kay_import_guard();
    CREATE FUNCTION kay_import_validate() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE batch import_batch%ROWTYPE; bid uuid;
    BEGIN
      IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
      IF TG_TABLE_NAME='import_batch' THEN bid:=NEW.id; ELSE bid:=NEW.batch_id; END IF;
      SELECT * INTO batch FROM import_batch WHERE id=bid;
      IF batch.state='committed' AND (batch.approval_key IS NULL OR batch.approval_hash IS NULL OR batch.approved_at IS NULL OR batch.approved_by_user_id IS NULL OR batch.result IS NULL
        OR NOT EXISTS(SELECT 1 FROM import_preview WHERE batch_id=bid AND preview_hash=batch.preview_hash AND version=batch.version)
        OR EXISTS(SELECT 1 FROM import_row r LEFT JOIN contact c ON c.id=r.contact_id WHERE r.batch_id=bid AND
          (r.status NOT IN ('committed','skipped_existing') OR (r.status='committed' AND (r.contact_id IS NULL OR c.source<>'csv_import' OR c.source_submission_id<>bid OR c.created_by_user_id<>batch.approved_by_user_id OR c.primary_agent_id<>r.agent_id))
           OR (r.status='skipped_existing' AND r.contact_id IS NOT NULL)))
        OR (SELECT count(*) FROM import_row WHERE batch_id=bid AND status='committed')<>(batch.counts->>'committed')::integer
        OR (SELECT count(*) FROM import_row WHERE batch_id=bid AND status='skipped_existing')<>(batch.counts->>'skipped_existing')::integer)
        THEN RAISE EXCEPTION 'IMPORT_ATOMIC_RESULT_REQUIRED' USING ERRCODE='23514'; END IF;
      RETURN NULL;
    END $$;
    CREATE CONSTRAINT TRIGGER import_batch_consistent AFTER INSERT OR UPDATE ON import_batch DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_import_validate();
    """)


def downgrade() -> None:
    if op.get_bind().scalar(
        sa.text("SELECT current_database()='kayrealestate' OR EXISTS(SELECT 1 FROM import_batch)")
    ):
        raise RuntimeError("IMPORT_EVIDENCE_DOWNGRADE_REFUSED")
    for table in ("import_preview", "import_row", "import_batch"):
        op.drop_table(table)
    op.execute("DROP FUNCTION kay_import_validate()")
    op.execute("DROP FUNCTION kay_import_guard()")
    audit_actions(False)


def audit_actions(imports: bool) -> None:
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        "action LIKE 'identity.%' OR action LIKE 'users.%' OR action LIKE 'contacts.%' "
        "OR action LIKE 'enquiries.%' OR action LIKE 'properties.%' "
        "OR action LIKE 'offerings.%' OR action LIKE 'developments.%' "
        "OR action LIKE 'documents.%' OR action LIKE 'requirements.%' OR action LIKE 'deals.%' "
        "OR action LIKE 'visits.%' OR action LIKE 'tasks.%'"
        + (" OR action LIKE 'imports.%'" if imports else ""),
    )
