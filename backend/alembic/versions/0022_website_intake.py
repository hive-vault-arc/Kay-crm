"""Durable source authority, opaque receipts and typed atomic website work."""

# ruff: noqa: E501

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0022_website_intake"
down_revision = "0021_discovery_indexes"
branch_labels = None
depends_on = None

ACTORS = {
    "contact": "created_by_user_id",
    "contact_phone": "created_by_user_id",
    "contact_email": "created_by_user_id",
    "enquiry": "created_by_user_id",
    "timeline_event": "actor_user_id",
    "audit_event": "actor_user_id",
}


def upgrade() -> None:
    op.execute("""CREATE TABLE website_source (
      id uuid PRIMARY KEY, source_key varchar(40) NOT NULL UNIQUE,
      name varchar(160) NOT NULL, key_digest bytea NOT NULL,
      default_agent_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      active boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT website_source_bounds CHECK(source_key ~ '^[a-z0-9_-]{1,40}$' AND length(btrim(name))>0 AND octet_length(key_digest)=32))""")
    op.execute("""CREATE TABLE website_receipt (
      id uuid PRIMARY KEY, source_id uuid NOT NULL REFERENCES website_source(id) ON DELETE RESTRICT,
      submission_id varchar(100) NOT NULL, request_hash bytea NOT NULL, payload jsonb NOT NULL,
      state varchar(16) NOT NULL, enquiry_id uuid UNIQUE REFERENCES enquiry(id) ON DELETE RESTRICT,
      received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
      CONSTRAINT uq_website_submission UNIQUE(source_id,submission_id),
      CONSTRAINT website_receipt_state CHECK(state IN ('queued','processed','failed')),
      CONSTRAINT website_receipt_result CHECK((state='processed')=(enquiry_id IS NOT NULL)),
      CONSTRAINT website_receipt_bounds CHECK(submission_id ~ '^[A-Za-z0-9_-]{1,100}$' AND octet_length(request_hash)=32 AND jsonb_typeof(payload)='object'),
      CONSTRAINT website_receipt_time CHECK((state='processed')=(processed_at IS NOT NULL)))""")
    op.execute("""CREATE FUNCTION kay_website_source_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' AND current_database()<>'kayrealestate'
        THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'WEBSITE_AUTHORITY_RETAINED' USING ERRCODE='23514'; END IF;
        IF (NEW.id,NEW.source_key,NEW.name,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.source_key,OLD.name,OLD.created_at)
        THEN RAISE EXCEPTION 'WEBSITE_AUTHORITY_IMMUTABLE' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER website_source_guard BEFORE UPDATE OR DELETE ON website_source
        FOR EACH ROW EXECUTE FUNCTION kay_website_source_guard();""")
    for table, actor in ACTORS.items():
        op.alter_column(table, actor, nullable=True)
        op.add_column(
            table,
            sa.Column(
                "website_source_id",
                sa.Uuid(),
                sa.ForeignKey("website_source.id", ondelete="RESTRICT"),
            ),
        )
        op.create_check_constraint(
            f"{table}_true_actor", table, f"num_nonnulls({actor},website_source_id)=1"
        )
    op.execute("""CREATE FUNCTION kay_source_actor_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF (to_jsonb(NEW)->'website_source_id') IS DISTINCT FROM (to_jsonb(OLD)->'website_source_id')
          OR (to_jsonb(NEW)->TG_ARGV[0]) IS DISTINCT FROM (to_jsonb(OLD)->TG_ARGV[0])
          OR (TG_TABLE_NAME IN ('contact','enquiry') AND
            ((to_jsonb(NEW)->'source',to_jsonb(NEW)->'source_submission_id') IS DISTINCT FROM
             (to_jsonb(OLD)->'source',to_jsonb(OLD)->'source_submission_id')))
        THEN RAISE EXCEPTION 'SOURCE_ACTOR_IMMUTABLE' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$""")
    for table, actor in ACTORS.items():
        op.execute(
            f"CREATE TRIGGER {table}_source_actor BEFORE UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION kay_source_actor_guard('{actor}')"
        )  # noqa: E501,S608
    for table in ("contact", "enquiry"):
        op.create_check_constraint(
            f"{table}_website_source", table, "(source='website')=(website_source_id IS NOT NULL)"
        )
    op.add_column(
        "outbox_event",
        sa.Column(
            "website_receipt_id",
            sa.Uuid(),
            sa.ForeignKey("website_receipt.id", ondelete="RESTRICT"),
            unique=True,
        ),
    )
    old = op.get_bind().scalar(
        sa.text(
            "SELECT pg_get_expr(conbin,conrelid) FROM pg_constraint WHERE conrelid='outbox_event'::regclass AND conname='outbox_typed_parent'"
        )
    )
    op.drop_constraint("outbox_typed_parent", "outbox_event", type_="check")
    op.create_check_constraint(
        "outbox_typed_parent",
        "outbox_event",
        f"(website_receipt_id IS NULL AND ({old})) OR (kind='website.process' AND website_receipt_id IS NOT NULL AND num_nonnulls(export_id,version_id,inventory_event_id,visit_id,task_id,schedule_version,due_at)=0)",
    )
    op.execute("""CREATE FUNCTION kay_website_receipt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' AND current_database()<>'kayrealestate'
        THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'WEBSITE_RECEIPT_RETAINED' USING ERRCODE='23514'; END IF;
        IF (NEW.id,NEW.source_id,NEW.submission_id,NEW.request_hash,NEW.payload,NEW.received_at)
          IS DISTINCT FROM (OLD.id,OLD.source_id,OLD.submission_id,OLD.request_hash,OLD.payload,OLD.received_at)
          OR (OLD.state='processed' AND NEW IS DISTINCT FROM OLD)
        THEN RAISE EXCEPTION 'WEBSITE_RECEIPT_IMMUTABLE' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER website_receipt_guard BEFORE UPDATE OR DELETE ON website_receipt
        FOR EACH ROW EXECUTE FUNCTION kay_website_receipt_guard();
      CREATE FUNCTION kay_website_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE r website_receipt;
      BEGIN
        IF TG_TABLE_NAME='enquiry' THEN
          IF NEW.source<>'website' THEN RETURN NULL; END IF;
          SELECT * INTO r FROM website_receipt WHERE id=NEW.source_submission_id;
          IF NOT FOUND OR r.enquiry_id<>NEW.id OR r.source_id<>NEW.website_source_id OR r.state<>'processed'
          THEN RAISE EXCEPTION 'WEBSITE_ENQUIRY_RECEIPT_REQUIRED' USING ERRCODE='23514'; END IF;
        ELSE SELECT * INTO r FROM website_receipt WHERE id=NEW.id; END IF;
        IF NOT EXISTS(SELECT 1 FROM outbox_event WHERE website_receipt_id=r.id AND kind='website.process')
          OR (r.state='processed' AND NOT EXISTS(SELECT 1 FROM enquiry e WHERE e.id=r.enquiry_id
            AND e.source='website' AND e.source_submission_id=r.id AND e.website_source_id=r.source_id))
        THEN RAISE EXCEPTION 'WEBSITE_ATOMIC_RESULT_REQUIRED' USING ERRCODE='23514'; END IF;
        RETURN NULL;
      END $$;
      CREATE CONSTRAINT TRIGGER website_receipt_consistency AFTER INSERT OR UPDATE ON website_receipt
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_website_consistency();
      CREATE CONSTRAINT TRIGGER website_enquiry_consistency AFTER INSERT OR UPDATE ON enquiry
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_website_consistency();
    """)


def downgrade() -> None:
    if load_settings().app_environment == "development" or op.get_bind().scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM website_source) OR EXISTS(SELECT 1 FROM website_receipt)"
        )
    ):
        raise RuntimeError("WEBSITE_HISTORY_DOWNGRADE_REFUSED")
    op.execute(
        "DROP TRIGGER website_enquiry_consistency ON enquiry; DROP TRIGGER website_receipt_consistency ON website_receipt; DROP FUNCTION kay_website_consistency()"
    )
    op.drop_constraint("outbox_typed_parent", "outbox_event", type_="check")
    op.drop_column("outbox_event", "website_receipt_id")
    from alembic.script import ScriptDirectory

    previous = (
        ScriptDirectory.from_config(op.get_context().config)
        .get_revision("0020_search_export_lifecycle")
        .module
    )
    op.create_check_constraint(
        "outbox_typed_parent",
        "outbox_event",
        f"(export_id IS NULL AND ({previous.BASE_OUTBOX})) OR (kind='export.generate' AND export_id IS NOT NULL AND num_nonnulls(version_id,inventory_event_id,visit_id,task_id,schedule_version,due_at)=0)",
    )
    for table in ("contact", "enquiry"):
        op.drop_constraint(f"{table}_website_source", table, type_="check")
    for table, actor in ACTORS.items():
        op.execute(f"DROP TRIGGER {table}_source_actor ON {table}")  # noqa: S608
        op.drop_constraint(f"{table}_true_actor", table, type_="check")
        op.drop_column(table, "website_source_id")
        op.alter_column(table, actor, nullable=False)
    op.execute("DROP FUNCTION kay_source_actor_guard()")
    op.drop_table("website_receipt")
    op.execute("DROP FUNCTION kay_website_receipt_guard()")
    op.drop_table("website_source")
    op.execute("DROP FUNCTION IF EXISTS kay_website_source_guard()")
