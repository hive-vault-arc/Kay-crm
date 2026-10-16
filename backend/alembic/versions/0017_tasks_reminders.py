"""Durable internal task/visit work extends the existing PostgreSQL queue."""

# ruff: noqa: E501

import sqlalchemy as sa

from alembic import op

revision = "0017_tasks_reminders"
down_revision = "0016_visit_calendar"
branch_labels = None
depends_on = None

TASK_ACTIONS = ("created", "updated", "completed", "cancelled", "contact_merged")
PRIOR_TIMELINE = (
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
PRIOR_OUTBOX = (
    "(kind='file.scan' AND version_id IS NOT NULL AND inventory_event_id IS NULL) OR "
    "(kind IN ('inventory.reservation.created','inventory.reservation.released',"
    "'inventory.outcome.created','inventory.outcome.reopened') AND version_id IS NULL AND inventory_event_id IS NOT NULL)"
)


def actions(enabled: bool) -> None:
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
    ) + (("tasks",) if enabled else ())
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        " OR ".join(f"action LIKE '{f}.%'" for f in families),
    )
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    values = PRIOR_TIMELINE + (tuple(f"tasks.{a}" for a in TASK_ACTIONS) if enabled else ())
    op.create_check_constraint(
        "timeline_action", "timeline_event", "action IN (" + ",".join(repr(v) for v in values) + ")"
    )


def upgrade() -> None:
    actions(True)
    op.execute("""CREATE TABLE task (
      id uuid PRIMARY KEY, contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE RESTRICT,
      origin_contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE RESTRICT,
      deal_id uuid REFERENCES deal(id) ON DELETE RESTRICT, property_id uuid REFERENCES property(id) ON DELETE RESTRICT,
      owner_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      created_by_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      updated_by_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      title varchar(160) NOT NULL, notes varchar(1000) NOT NULL DEFAULT '', outcome varchar(1000) NOT NULL DEFAULT '',
      due_at timestamptz NOT NULL, status varchar(12) NOT NULL DEFAULT 'open',
      version bigint NOT NULL DEFAULT 1, schedule_version bigint NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT task_status CHECK(status IN ('open','completed','cancelled')),
      CONSTRAINT task_versions CHECK(version>0 AND schedule_version>0), CONSTRAINT task_title CHECK(length(btrim(title))>0));
      CREATE INDEX ix_task_owner_due_status ON task(owner_user_id,due_at,status,id);
      CREATE INDEX ix_task_contact_due ON task(contact_id,due_at,id);
      CREATE TABLE task_event (
        id uuid PRIMARY KEY, task_id uuid NOT NULL REFERENCES task(id) ON DELETE RESTRICT,
        actor_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT, actor_name varchar(160) NOT NULL,
        action varchar(24) NOT NULL, version bigint NOT NULL, snapshot jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT task_event_action CHECK(action IN ('created','updated','completed','cancelled','contact_merged')),
        CONSTRAINT task_event_version CHECK(version>0));
      CREATE UNIQUE INDEX ix_task_event_version ON task_event(task_id,version);
      CREATE TABLE task_command_receipt (
        actor_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT, route varchar(100) NOT NULL,
        key uuid NOT NULL, task_id uuid NOT NULL REFERENCES task(id) ON DELETE RESTRICT,
        request_hash bytea NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY(actor_id,route,key), CONSTRAINT task_receipt_hash CHECK(octet_length(request_hash)=32));
      ALTER TABLE visit ADD COLUMN schedule_version bigint NOT NULL DEFAULT 1;
      ALTER TABLE visit ADD CONSTRAINT visit_schedule_version CHECK(schedule_version>0);
    """)
    for table in ("outbox_event", "notification"):
        for column, target in (("visit_id", "visit.id"), ("task_id", "task.id")):
            op.add_column(
                table, sa.Column(column, sa.Uuid(), sa.ForeignKey(target, ondelete="RESTRICT"))
            )
            op.create_index(f"ix_{table}_{column}", table, [column])
        op.add_column(table, sa.Column("schedule_version", sa.BigInteger()))
    op.add_column("outbox_event", sa.Column("due_at", sa.DateTime(timezone=True)))
    op.add_column("outbox_event", sa.Column("invalidated_at", sa.DateTime(timezone=True)))
    op.add_column(
        "notification",
        sa.Column("kind", sa.String(60), nullable=False, server_default="file.scanned"),
    )
    op.add_column("notification", sa.Column("read_at", sa.DateTime(timezone=True)))
    op.alter_column("notification", "document_id", nullable=True)
    op.create_index("ix_notification_user_created", "notification", ["user_id", "created_at", "id"])
    op.drop_constraint("outbox_typed_parent", "outbox_event", type_="check")
    op.create_check_constraint(
        "outbox_typed_parent",
        "outbox_event",
        """
      (kind='file.scan' AND version_id IS NOT NULL AND inventory_event_id IS NULL AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL AND due_at IS NULL) OR
      (kind IN ('inventory.reservation.created','inventory.reservation.released','inventory.outcome.created','inventory.outcome.reopened') AND version_id IS NULL AND inventory_event_id IS NOT NULL AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL AND due_at IS NULL) OR
      (kind IN ('visit.reminder.day','visit.reminder.hour') AND visit_id IS NOT NULL AND task_id IS NULL AND version_id IS NULL AND inventory_event_id IS NULL AND schedule_version IS NOT NULL AND schedule_version>0 AND due_at IS NOT NULL) OR
      (kind='task.due' AND task_id IS NOT NULL AND visit_id IS NULL AND version_id IS NULL AND inventory_event_id IS NULL AND schedule_version IS NOT NULL AND schedule_version>0 AND due_at IS NOT NULL)
    """,
    )
    op.create_check_constraint(
        "notification_typed_parent",
        "notification",
        """
      (kind='file.scanned' AND document_id IS NOT NULL AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL) OR
      (kind IN ('visit.reminder.day','visit.reminder.hour') AND visit_id IS NOT NULL AND document_id IS NULL AND task_id IS NULL AND schedule_version IS NOT NULL AND schedule_version>0) OR
      (kind='task.due' AND task_id IS NOT NULL AND document_id IS NULL AND visit_id IS NULL AND schedule_version IS NOT NULL AND schedule_version>0)
    """,
    )
    op.drop_constraint("job_state", "job", type_="check")
    op.create_check_constraint(
        "outbox_reminder_key",
        "outbox_event",
        "schedule_version IS NULL OR dedupe_key=kind||':'||coalesce(visit_id,task_id)::text||':'||schedule_version::text",
    )
    op.create_check_constraint(
        "notification_reminder_key",
        "notification",
        "schedule_version IS NULL OR event_key=kind||':'||coalesce(visit_id,task_id)::text||':'||schedule_version::text",
    )
    op.create_check_constraint(
        "job_state", "job", "state IN ('ready','running','retry','done','failed','invalidated')"
    )
    # Preserve existing visit/event/actor data; only create typed deferred reminder records.
    op.execute("""INSERT INTO outbox_event(id,kind,visit_id,schedule_version,due_at,dedupe_key)
      SELECT gen_random_uuid(),r.kind,v.id,v.schedule_version,v.start_at-r.delay,
        r.kind||':'||v.id::text||':'||v.schedule_version::text
      FROM visit v CROSS JOIN (VALUES ('visit.reminder.day',interval '24 hours'),('visit.reminder.hour',interval '1 hour')) r(kind,delay)
      WHERE v.status IN ('scheduled','confirmed') ON CONFLICT(dedupe_key) DO NOTHING;
      CREATE TRIGGER task_event_immutable BEFORE UPDATE OR DELETE ON task_event FOR EACH ROW EXECUTE FUNCTION kay_history_immutable();
    """)
    guards()


def guards() -> None:
    op.execute("""CREATE FUNCTION kay_task_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'TASK_HISTORY_RETAINED' USING ERRCODE='23514'; END IF;
        IF date_trunc('minute',NEW.due_at)<>NEW.due_at THEN RAISE EXCEPTION 'TASK_MINUTE_PRECISION' USING ERRCODE='23514'; END IF;
        IF TG_OP='UPDATE' THEN
          IF ROW(NEW.id,NEW.origin_contact_id,NEW.created_by_user_id,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.origin_contact_id,OLD.created_by_user_id,OLD.created_at)
            OR NEW.version<>OLD.version+1 OR (NEW.contact_id<>OLD.contact_id AND current_setting('kay.task_merge',true) IS DISTINCT FROM 'on')
          THEN RAISE EXCEPTION 'TASK_IDENTITY_IMMUTABLE' USING ERRCODE='23514'; END IF;
          IF OLD.status<>'open' AND current_setting('kay.task_merge',true) IS DISTINCT FROM 'on' THEN RAISE EXCEPTION 'TASK_TERMINAL' USING ERRCODE='23514'; END IF;
          IF NEW.schedule_version<>OLD.schedule_version+(CASE WHEN ROW(NEW.due_at,NEW.status,NEW.owner_user_id) IS DISTINCT FROM ROW(OLD.due_at,OLD.status,OLD.owner_user_id) THEN 1 ELSE 0 END)
          THEN RAISE EXCEPTION 'TASK_SCHEDULE_VERSION' USING ERRCODE='23514'; END IF;
        ELSIF NEW.version<>1 OR NEW.schedule_version<>1 THEN RAISE EXCEPTION 'TASK_INITIAL_VERSION' USING ERRCODE='23514'; END IF;
        IF current_setting('kay.task_action',true) IS NULL OR current_setting('kay.task_action',true) NOT IN ('created','updated','completed','cancelled','contact_merged')
        THEN RAISE EXCEPTION 'TASK_COMMAND_REQUIRED' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER task_guard BEFORE INSERT OR UPDATE OR DELETE ON task FOR EACH ROW EXECUTE FUNCTION kay_task_guard();
      CREATE FUNCTION kay_visit_reminder_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NEW; END IF;
        IF TG_OP='UPDATE' THEN
          IF NEW.schedule_version<>OLD.schedule_version+(CASE WHEN ROW(NEW.start_at,NEW.end_at,NEW.status) IS DISTINCT FROM ROW(OLD.start_at,OLD.end_at,OLD.status) THEN 1 ELSE 0 END)
          THEN RAISE EXCEPTION 'VISIT_SCHEDULE_VERSION' USING ERRCODE='23514'; END IF;
        ELSIF NEW.schedule_version<>1 THEN RAISE EXCEPTION 'VISIT_INITIAL_SCHEDULE_VERSION' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER visit_reminder_guard BEFORE INSERT OR UPDATE ON visit FOR EACH ROW EXECUTE FUNCTION kay_visit_reminder_guard();
      CREATE FUNCTION kay_task_history_validate() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE t task; e task_event;
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
        SELECT * INTO t FROM task WHERE id=NEW.id;
        SELECT * INTO e FROM task_event WHERE task_id=t.id AND version=t.version;
        IF e.id IS NULL OR e.actor_user_id IS DISTINCT FROM t.updated_by_user_id
          OR e.snapshot->>'title' IS DISTINCT FROM t.title OR e.snapshot->>'notes' IS DISTINCT FROM t.notes
          OR e.snapshot->>'status' IS DISTINCT FROM t.status OR e.snapshot->>'contact_id' IS DISTINCT FROM t.contact_id::text
          OR e.snapshot->>'origin_contact_id' IS DISTINCT FROM t.origin_contact_id::text
          OR e.snapshot->>'owner_user_id' IS DISTINCT FROM t.owner_user_id::text
          OR (e.snapshot->>'deal_id')::uuid IS DISTINCT FROM t.deal_id
          OR (e.snapshot->>'property_id')::uuid IS DISTINCT FROM t.property_id
          OR e.snapshot->>'outcome' IS DISTINCT FROM t.outcome
          OR (e.snapshot->>'due_at')::timestamptz IS DISTINCT FROM t.due_at
          OR (e.snapshot->>'schedule_version')::bigint IS DISTINCT FROM t.schedule_version
        THEN RAISE EXCEPTION 'TASK_HISTORY_REQUIRED' USING ERRCODE='23514'; END IF;
        RETURN NULL;
      END $$;
      CREATE CONSTRAINT TRIGGER task_history AFTER INSERT OR UPDATE ON task DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_task_history_validate();
      CREATE FUNCTION kay_reminder_validate() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE n integer; sv bigint; active boolean; target uuid; due timestamptz; v boolean;
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
        v:=(TG_TABLE_NAME='visit'); target:=NEW.id;
        IF v THEN SELECT schedule_version,status IN ('scheduled','confirmed'),start_at INTO sv,active,due FROM visit WHERE id=target;
        ELSE SELECT schedule_version,status='open',due_at INTO sv,active,due FROM task WHERE id=target; END IF;
        IF EXISTS(SELECT 1 FROM outbox_event o WHERE (CASE WHEN v THEN o.visit_id=target ELSE o.task_id=target END) AND o.schedule_version<>sv AND o.invalidated_at IS NULL)
          OR EXISTS(SELECT 1 FROM job j JOIN outbox_event o ON o.id=j.outbox_id WHERE (CASE WHEN v THEN o.visit_id=target ELSE o.task_id=target END) AND o.schedule_version<>sv AND j.state IN ('ready','running','retry','failed'))
        THEN RAISE EXCEPTION 'STALE_REMINDER_NOT_INVALIDATED' USING ERRCODE='23514'; END IF;
        IF active THEN
          SELECT count(*) INTO n FROM outbox_event o WHERE (CASE WHEN v THEN o.visit_id=target ELSE o.task_id=target END) AND o.schedule_version=sv AND o.invalidated_at IS NULL
            AND o.dedupe_key=o.kind||':'||target::text||':'||sv::text AND
            ((v AND ((o.kind='visit.reminder.day' AND o.due_at=due-interval '24 hours') OR (o.kind='visit.reminder.hour' AND o.due_at=due-interval '1 hour')))
             OR (NOT v AND o.kind='task.due' AND o.due_at=due));
          IF n<>(CASE WHEN v THEN 2 ELSE 1 END) THEN RAISE EXCEPTION 'REMINDER_OUTBOX_REQUIRED' USING ERRCODE='23514'; END IF;
        END IF;
        RETURN NULL;
      END $$;
      CREATE CONSTRAINT TRIGGER task_reminders AFTER INSERT OR UPDATE ON task DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_reminder_validate();
      CREATE CONSTRAINT TRIGGER visit_reminders AFTER INSERT OR UPDATE ON visit DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_reminder_validate();
      CREATE FUNCTION kay_notification_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'NOTIFICATION_RETAINED' USING ERRCODE='23514'; END IF;
        IF (to_jsonb(NEW)-'read_at') IS DISTINCT FROM (to_jsonb(OLD)-'read_at') OR (OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at)
        THEN RAISE EXCEPTION 'NOTIFICATION_IMMUTABLE' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER notification_guard BEFORE UPDATE OR DELETE ON notification FOR EACH ROW EXECUTE FUNCTION kay_notification_guard();
      CREATE FUNCTION kay_outbox_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'OUTBOX_RETAINED' USING ERRCODE='23514'; END IF;
        IF (to_jsonb(NEW)-'invalidated_at') IS DISTINCT FROM (to_jsonb(OLD)-'invalidated_at') OR (OLD.invalidated_at IS NOT NULL AND NEW.invalidated_at IS DISTINCT FROM OLD.invalidated_at)
        THEN RAISE EXCEPTION 'OUTBOX_IMMUTABLE' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER outbox_guard BEFORE UPDATE OR DELETE ON outbox_event FOR EACH ROW EXECUTE FUNCTION kay_outbox_guard();
    """)


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(
        sa.text(
            "SELECT current_database()='kayrealestate' OR EXISTS(SELECT 1 FROM task) OR EXISTS(SELECT 1 FROM outbox_event WHERE task_id IS NOT NULL OR visit_id IS NOT NULL)"
        )
    ):
        raise RuntimeError("WORK_HISTORY_DOWNGRADE_REFUSED")
    for table, trigger in (
        ("notification", "notification_guard"),
        ("outbox_event", "outbox_guard"),
        ("visit", "visit_reminders"),
        ("visit", "visit_reminder_guard"),
    ):
        op.execute(f"DROP TRIGGER {trigger} ON {table}")
    op.drop_constraint("notification_typed_parent", "notification", type_="check")
    op.execute("ALTER TABLE notification DROP CONSTRAINT IF EXISTS notification_reminder_key")
    op.execute("ALTER TABLE outbox_event DROP CONSTRAINT IF EXISTS outbox_reminder_key")
    op.drop_constraint("outbox_typed_parent", "outbox_event", type_="check")
    op.drop_index("ix_notification_user_created", "notification")
    for table in ("notification", "outbox_event"):
        for column in ("visit_id", "task_id"):
            op.drop_index(f"ix_{table}_{column}", table)
            op.drop_column(table, column)
        op.drop_column(table, "schedule_version")
    for column in ("due_at", "invalidated_at"):
        op.drop_column("outbox_event", column)
    for column in ("kind", "read_at"):
        op.drop_column("notification", column)
    for table in ("task_command_receipt", "task_event", "task"):
        op.drop_table(table)
    for function in (
        "kay_task_guard",
        "kay_task_history_validate",
        "kay_visit_reminder_guard",
        "kay_reminder_validate",
        "kay_notification_guard",
        "kay_outbox_guard",
    ):
        op.execute(f"DROP FUNCTION {function}()")
    op.alter_column("notification", "document_id", nullable=False)
    op.create_check_constraint("outbox_typed_parent", "outbox_event", PRIOR_OUTBOX)
    op.drop_constraint("job_state", "job", type_="check")
    op.create_check_constraint(
        "job_state", "job", "state IN ('ready','running','retry','done','failed')"
    )
    op.drop_constraint("visit_schedule_version", "visit", type_="check")
    op.drop_column("visit", "schedule_version")
    actions(False)
