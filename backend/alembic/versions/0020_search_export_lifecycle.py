"""Controlled export queue, physical lifecycle and audit page/retention indexes."""

# ruff: noqa: E501
import sqlalchemy as sa

from alembic import op

revision = "0020_search_export_lifecycle"
down_revision = "0019_atomic_contact_import"
branch_labels = None
depends_on = None

BASE_OUTBOX = "(kind='file.scan' AND version_id IS NOT NULL AND inventory_event_id IS NULL AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL AND due_at IS NULL) OR (kind IN ('inventory.reservation.created','inventory.reservation.released','inventory.outcome.created','inventory.outcome.reopened') AND version_id IS NULL AND inventory_event_id IS NOT NULL AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL AND due_at IS NULL) OR (kind IN ('visit.reminder.day','visit.reminder.hour') AND visit_id IS NOT NULL AND task_id IS NULL AND version_id IS NULL AND inventory_event_id IS NULL AND schedule_version IS NOT NULL AND schedule_version>0 AND due_at IS NOT NULL) OR (kind='task.due' AND task_id IS NOT NULL AND visit_id IS NULL AND version_id IS NULL AND inventory_event_id IS NULL AND schedule_version IS NOT NULL AND schedule_version>0 AND due_at IS NOT NULL)"


def audit_actions(exports: bool) -> None:
    families = (
        "identity",
        "users",
        "contacts",
        "enquiries",
        "properties",
        "offerings",
        "developments",
        "documents",
        "requirements",
        "deals",
        "visits",
        "tasks",
        "imports",
    ) + (("exports",) if exports else ())
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        " OR ".join(f"action LIKE '{f}.%'" for f in families),
    )


def upgrade() -> None:
    # Earlier visit-reminder backfills can leave deferred outbox FK events in this upgrade.
    op.execute("SET CONSTRAINTS ALL IMMEDIATE")
    op.execute("SET CONSTRAINTS ALL DEFERRED")
    audit_actions(True)
    op.add_column("property", sa.Column("archived_at", sa.DateTime(timezone=True)))
    op.execute("""CREATE TABLE export_job (
      id uuid PRIMARY KEY, author_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      request_session_id uuid NOT NULL REFERENCES session(id) ON DELETE RESTRICT,
      request_key uuid NOT NULL, request_hash bytea NOT NULL, kind varchar(16) NOT NULL,
      filters jsonb NOT NULL, state varchar(16) NOT NULL, error_code varchar(40),
      row_count integer NOT NULL, size_bytes bigint NOT NULL, object_key uuid UNIQUE, file_hash bytea,
      created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
      permit_hash bytea, binding_hash bytea, permit_session_id uuid REFERENCES session(id) ON DELETE RESTRICT,
      permit_expires_at timestamptz, permit_consumed_at timestamptz,
      CONSTRAINT uq_export_request UNIQUE(author_user_id,request_key),
      CONSTRAINT export_state CHECK(state IN ('queued','ready','failed','denied')),
      CONSTRAINT export_kind CHECK(kind IN ('contacts','enquiries')),
      CONSTRAINT export_bounds CHECK(row_count>=0 AND row_count<=50000 AND size_bytes>=0 AND size_bytes<=20971520),
      CONSTRAINT export_ready CHECK((state='ready')=(object_key IS NOT NULL AND file_hash IS NOT NULL AND completed_at IS NOT NULL))
    )""")
    op.create_index(
        "ix_export_author_created", "export_job", ["author_user_id", "created_at", "id"]
    )
    op.add_column(
        "outbox_event",
        sa.Column(
            "export_id", sa.Uuid(), sa.ForeignKey("export_job.id", ondelete="RESTRICT"), unique=True
        ),
    )
    op.drop_constraint("outbox_typed_parent", "outbox_event", type_="check")
    op.create_check_constraint(
        "outbox_typed_parent",
        "outbox_event",
        f"(export_id IS NULL AND ({BASE_OUTBOX})) OR (kind='export.generate' AND export_id IS NOT NULL AND version_id IS NULL AND inventory_event_id IS NULL AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL AND due_at IS NULL)",
    )
    op.execute("""CREATE FUNCTION kay_export_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
      IF current_setting('kay.synthetic_cleanup',true)='on' AND current_database()<>'kayrealestate' THEN
        IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
      END IF;
      IF TG_OP='DELETE' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='EXPORT_EVIDENCE_RETAINED'; END IF;
      IF (NEW.id,NEW.author_user_id,NEW.request_session_id,NEW.request_key,NEW.request_hash,NEW.kind,NEW.filters,NEW.created_at)
      IS DISTINCT FROM (OLD.id,OLD.author_user_id,OLD.request_session_id,OLD.request_key,OLD.request_hash,OLD.kind,OLD.filters,OLD.created_at)
      OR OLD.state='ready' AND (NEW.state,NEW.object_key,NEW.file_hash,NEW.row_count,NEW.size_bytes,NEW.completed_at)
      IS DISTINCT FROM (OLD.state,OLD.object_key,OLD.file_hash,OLD.row_count,OLD.size_bytes,OLD.completed_at)
      THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='EXPORT_EVIDENCE_IMMUTABLE'; END IF;
      RETURN NEW; END $$;
      CREATE TRIGGER export_evidence_guard BEFORE UPDATE OR DELETE ON export_job FOR EACH ROW EXECUTE FUNCTION kay_export_guard();
      CREATE FUNCTION kay_property_archive_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF EXISTS(SELECT 1 FROM property p JOIN offering o ON o.property_id=p.id WHERE p.archived_at IS NOT NULL AND o.is_current)
      THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='STOCK_REVIEW_REQUIRED'; END IF; RETURN NULL; END $$;
      CREATE CONSTRAINT TRIGGER property_archive_guard AFTER INSERT OR UPDATE ON property DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_property_archive_guard();
      CREATE CONSTRAINT TRIGGER offering_archive_guard AFTER INSERT OR UPDATE ON offering DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_property_archive_guard();
    """)


def downgrade() -> None:
    bind = op.get_bind()
    if bind.scalar(sa.text("SELECT current_database()")) == "kayrealestate" or bind.scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM export_job) OR EXISTS(SELECT 1 FROM property WHERE archived_at IS NOT NULL)"
        )
    ):
        raise RuntimeError("LIFECYCLE_EVIDENCE_DOWNGRADE_REFUSED")
    op.execute(
        "DROP TRIGGER offering_archive_guard ON offering; DROP TRIGGER property_archive_guard ON property; DROP FUNCTION kay_property_archive_guard()"
    )
    op.drop_constraint("outbox_typed_parent", "outbox_event", type_="check")
    op.drop_column("outbox_event", "export_id")
    op.create_check_constraint("outbox_typed_parent", "outbox_event", BASE_OUTBOX)
    op.drop_table("export_job")
    op.execute("DROP FUNCTION kay_export_guard()")
    op.drop_column("property", "archived_at")
    audit_actions(False)
