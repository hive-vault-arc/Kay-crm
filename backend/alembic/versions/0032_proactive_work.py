"""Lead/Deal work context, advance alerts and a visit outcome follow-up."""

# ruff: noqa: E501, S608

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0032_proactive_work"
down_revision = "0031_project_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("task", "visit"):
        op.add_column(table, sa.Column("enquiry_id", sa.Uuid(), nullable=True))
        op.create_foreign_key(
            f"fk_{table}_enquiry_id", table, "enquiry", ["enquiry_id"], ["id"], ondelete="RESTRICT"
        )
        op.create_index(f"ix_{table}_enquiry_id", table, ["enquiry_id"])
        op.create_check_constraint(
            f"{table}_single_context", table, "num_nonnulls(enquiry_id,deal_id)<=1"
        )
    op.alter_column("visit", "status", type_=sa.String(16), existing_type=sa.String(12))
    op.drop_constraint("visit_status", "visit", type_="check")
    op.create_check_constraint(
        "visit_status",
        "visit",
        "status IN ('draft','scheduled','confirmed','completed','not_completed','cancelled')",
    )
    op.drop_constraint("visit_event_action", "visit_event", type_="check")
    op.create_check_constraint(
        "visit_event_action",
        "visit_event",
        "action IN ('created','updated','confirmed','rescheduled','completed','not_completed','cancelled','contact_merged')",
    )

    # The prior constraint's frozen vocabulary is extended without rewriting old history.
    bind = op.get_bind()
    definition = bind.scalar(
        sa.text(
            "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='timeline_event'::regclass AND conname='timeline_action'"
        )
    )
    if (
        not isinstance(definition, str)
        or not definition.startswith("CHECK (")
        or not definition.endswith(")")
    ):
        raise RuntimeError("TIMELINE_CONSTRAINT_UNEXPECTED")
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    op.create_check_constraint(
        "timeline_action",
        "timeline_event",
        f"({definition[7:-1]}) OR action='visits.not_completed'",
    )

    op.drop_constraint("outbox_typed_parent", "outbox_event", type_="check")
    op.create_check_constraint(
        "outbox_typed_parent",
        "outbox_event",
        "(website_receipt_id IS NULL AND ((export_id IS NULL AND "
        "((kind='file.scan' AND version_id IS NOT NULL AND inventory_event_id IS NULL "
        "AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL AND due_at IS NULL) OR "
        "(kind IN ('inventory.reservation.created','inventory.reservation.released','inventory.outcome.created','inventory.outcome.reopened') "
        "AND version_id IS NULL AND inventory_event_id IS NOT NULL AND visit_id IS NULL AND task_id IS NULL "
        "AND schedule_version IS NULL AND due_at IS NULL) OR "
        "(kind IN ('visit.reminder.day','visit.reminder.hour','visit.follow_up') AND visit_id IS NOT NULL "
        "AND task_id IS NULL AND version_id IS NULL AND inventory_event_id IS NULL "
        "AND schedule_version IS NOT NULL AND schedule_version>0 AND due_at IS NOT NULL) OR "
        "(kind IN ('task.reminder.day','task.reminder.hour','task.due') AND task_id IS NOT NULL "
        "AND visit_id IS NULL AND version_id IS NULL AND inventory_event_id IS NULL "
        "AND schedule_version IS NOT NULL AND schedule_version>0 AND due_at IS NOT NULL))) OR "
        "(kind='export.generate' AND export_id IS NOT NULL AND version_id IS NULL "
        "AND inventory_event_id IS NULL AND visit_id IS NULL AND task_id IS NULL "
        "AND schedule_version IS NULL AND due_at IS NULL))) OR "
        "(kind='website.process' AND website_receipt_id IS NOT NULL AND export_id IS NULL "
        "AND version_id IS NULL AND inventory_event_id IS NULL AND visit_id IS NULL "
        "AND task_id IS NULL AND schedule_version IS NULL AND due_at IS NULL)",
    )
    op.drop_constraint("notification_typed_parent", "notification", type_="check")
    op.create_check_constraint(
        "notification_typed_parent",
        "notification",
        "(kind='file.scanned' AND document_id IS NOT NULL AND visit_id IS NULL "
        "AND task_id IS NULL AND schedule_version IS NULL) OR "
        "(kind IN ('visit.reminder.day','visit.reminder.hour','visit.follow_up') AND visit_id IS NOT NULL "
        "AND document_id IS NULL AND task_id IS NULL AND schedule_version IS NOT NULL AND schedule_version>0) OR "
        "(kind IN ('task.reminder.day','task.reminder.hour','task.due') AND task_id IS NOT NULL "
        "AND document_id IS NULL AND visit_id IS NULL AND schedule_version IS NOT NULL AND schedule_version>0)",
    )

    op.execute("""
    CREATE OR REPLACE FUNCTION kay_visit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE p visit_schedule_policy; tick timestamptz; n integer;
    BEGIN
      IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NEW; END IF;
      SELECT * INTO p FROM visit_schedule_policy FOR UPDATE;
      IF TG_OP='UPDATE' THEN
        IF NEW.origin_contact_id<>OLD.origin_contact_id OR NEW.organizer_user_id<>OLD.organizer_user_id OR NEW.created_at<>OLD.created_at
          OR NEW.version<>OLD.version+1 OR (NEW.contact_id<>OLD.contact_id AND current_setting('kay.visit_merge',true) IS DISTINCT FROM 'on')
        THEN RAISE EXCEPTION 'VISIT_IDENTITY_IMMUTABLE' USING ERRCODE='23514'; END IF;
        IF OLD.status IN ('completed','not_completed','cancelled') AND current_setting('kay.visit_merge',true) IS DISTINCT FROM 'on'
        THEN RAISE EXCEPTION 'VISIT_TERMINAL' USING ERRCODE='23514'; END IF;
      END IF;
      IF date_trunc('minute',NEW.start_at)<>NEW.start_at OR date_trunc('minute',NEW.end_at)<>NEW.end_at
      THEN RAISE EXCEPTION 'VISIT_MINUTE_PRECISION' USING ERRCODE='23514'; END IF;
      IF current_setting('kay.visit_action',true) NOT IN ('created','updated','confirmed','rescheduled','completed','not_completed','cancelled','contact_merged')
        OR current_setting('kay.visit_action',true) IS NULL
      THEN RAISE EXCEPTION 'VISIT_COMMAND_REQUIRED' USING ERRCODE='23514'; END IF;
      IF NEW.status NOT IN ('scheduled','confirmed') OR current_setting('kay.visit_merge',true)='on' THEN RETURN NEW; END IF;
      IF NEW.type='company_car' THEN
        FOR tick IN SELECT generate_series(date_trunc('hour',NEW.start_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',NEW.end_at-interval '1 microsecond',interval '1 hour') LOOP
          SELECT count(*) INTO n FROM visit v WHERE v.id<>NEW.id AND v.type='company_car'
            AND v.status IN ('scheduled','confirmed') AND v.start_at<tick+interval '1 hour' AND v.end_at>tick;
          IF n>=p.company_car_capacity_per_hour THEN RAISE EXCEPTION 'COMPANY_CAR_CAPACITY_FULL' USING ERRCODE='23514'; END IF;
        END LOOP;
      END IF;
      RETURN NEW;
    END $$;

    CREATE OR REPLACE FUNCTION kay_reminder_validate() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE n integer; sv bigint; active boolean; target uuid; due timestamptz; finish timestamptz; v boolean;
    BEGIN
      IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
      v:=(TG_TABLE_NAME='visit'); target:=NEW.id;
      IF v THEN SELECT schedule_version,status IN ('scheduled','confirmed'),start_at,end_at INTO sv,active,due,finish FROM visit WHERE id=target;
      ELSE SELECT schedule_version,status='open',due_at INTO sv,active,due FROM task WHERE id=target; END IF;
      IF EXISTS(SELECT 1 FROM outbox_event o WHERE (CASE WHEN v THEN o.visit_id=target ELSE o.task_id=target END) AND o.schedule_version<>sv AND o.invalidated_at IS NULL)
        OR EXISTS(SELECT 1 FROM job j JOIN outbox_event o ON o.id=j.outbox_id WHERE (CASE WHEN v THEN o.visit_id=target ELSE o.task_id=target END) AND o.schedule_version<>sv AND j.state IN ('ready','running','retry','failed'))
      THEN RAISE EXCEPTION 'STALE_REMINDER_NOT_INVALIDATED' USING ERRCODE='23514'; END IF;
      IF active THEN
        SELECT count(*) INTO n FROM outbox_event o WHERE (CASE WHEN v THEN o.visit_id=target ELSE o.task_id=target END) AND o.schedule_version=sv AND o.invalidated_at IS NULL
          AND o.dedupe_key=o.kind||':'||target::text||':'||sv::text AND
          ((v AND ((o.kind='visit.reminder.day' AND o.due_at=due-interval '24 hours') OR (o.kind='visit.reminder.hour' AND o.due_at=due-interval '1 hour') OR (o.kind='visit.follow_up' AND o.due_at=finish+interval '2 hours')))
           OR (NOT v AND ((o.kind='task.reminder.day' AND o.due_at=due-interval '24 hours') OR (o.kind='task.reminder.hour' AND o.due_at=due-interval '1 hour') OR (o.kind='task.due' AND o.due_at=due))));
        IF n<>3 THEN RAISE EXCEPTION 'REMINDER_OUTBOX_REQUIRED' USING ERRCODE='23514'; END IF;
      END IF;
      RETURN NULL;
    END $$;
    """)
    for table, kind, due in (
        ("task", "task.reminder.day", "due_at - interval '24 hours'"),
        ("task", "task.reminder.hour", "due_at - interval '1 hour'"),
        ("visit", "visit.follow_up", "end_at + interval '2 hours'"),
    ):
        parent = "task_id" if table == "task" else "visit_id"
        status = "status='open'" if table == "task" else "status IN ('scheduled','confirmed')"
        op.execute(
            sa.text(
                f"INSERT INTO outbox_event(id,kind,{parent},schedule_version,due_at,dedupe_key) "
                f"SELECT gen_random_uuid(),'{kind}',id,schedule_version,{due}, "
                f"'{kind}:'||id::text||':'||schedule_version::text FROM {table} "
                f"WHERE {status} ON CONFLICT(dedupe_key) DO NOTHING"
            )
        )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("PROACTIVE_WORK_DOWNGRADE_REFUSED")
    bind = op.get_bind()
    if bind.scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM task) OR EXISTS(SELECT 1 FROM visit) "
            "OR EXISTS(SELECT 1 FROM outbox_event WHERE kind IN "
            "('task.reminder.day','task.reminder.hour','visit.follow_up')) "
            "OR EXISTS(SELECT 1 FROM notification WHERE kind IN "
            "('task.reminder.day','task.reminder.hour','visit.follow_up')) "
            "OR EXISTS(SELECT 1 FROM timeline_event WHERE action='visits.not_completed')"
        )
    ):
        raise RuntimeError("PROACTIVE_WORK_HISTORY_DOWNGRADE_REFUSED")

    from alembic.script import ScriptDirectory

    script = ScriptDirectory.from_config(op.get_context().config)
    previous_links = script.get_revision("0031_project_links").module
    previous_outbox = script.get_revision("0020_search_export_lifecycle").module
    previous_links.timeline_constraint(
        previous_links.PREVIOUS_ACTIONS + previous_links.LINK_ACTIONS
    )
    op.drop_constraint("notification_typed_parent", "notification", type_="check")
    op.create_check_constraint(
        "notification_typed_parent",
        "notification",
        "(kind='file.scanned' AND document_id IS NOT NULL AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL) OR "
        "(kind IN ('visit.reminder.day','visit.reminder.hour') AND visit_id IS NOT NULL AND document_id IS NULL AND task_id IS NULL AND schedule_version IS NOT NULL AND schedule_version>0) OR "
        "(kind='task.due' AND task_id IS NOT NULL AND document_id IS NULL AND visit_id IS NULL AND schedule_version IS NOT NULL AND schedule_version>0)",
    )
    op.drop_constraint("outbox_typed_parent", "outbox_event", type_="check")
    op.create_check_constraint(
        "outbox_typed_parent",
        "outbox_event",
        "(website_receipt_id IS NULL AND ((export_id IS NULL AND ("
        + previous_outbox.BASE_OUTBOX
        + ")) OR (kind='export.generate' AND export_id IS NOT NULL AND "
        "num_nonnulls(version_id,inventory_event_id,visit_id,task_id,schedule_version,due_at)=0))) "
        "OR (kind='website.process' AND website_receipt_id IS NOT NULL AND "
        "num_nonnulls(export_id,version_id,inventory_event_id,visit_id,task_id,schedule_version,due_at)=0)",
    )
    op.execute("""
    CREATE OR REPLACE FUNCTION kay_reminder_validate() RETURNS trigger LANGUAGE plpgsql AS $$
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
    CREATE OR REPLACE FUNCTION kay_visit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE p visit_schedule_policy; tick timestamptz; n integer;
    BEGIN
      IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NEW; END IF;
      SELECT * INTO p FROM visit_schedule_policy FOR UPDATE;
      IF TG_OP='UPDATE' THEN
        IF NEW.origin_contact_id<>OLD.origin_contact_id OR NEW.organizer_user_id<>OLD.organizer_user_id OR NEW.created_at<>OLD.created_at
          OR NEW.version<>OLD.version+1 OR (NEW.contact_id<>OLD.contact_id AND current_setting('kay.visit_merge',true) IS DISTINCT FROM 'on')
        THEN RAISE EXCEPTION 'VISIT_IDENTITY_IMMUTABLE' USING ERRCODE='23514'; END IF;
        IF OLD.status IN ('completed','cancelled') AND current_setting('kay.visit_merge',true) IS DISTINCT FROM 'on'
        THEN RAISE EXCEPTION 'VISIT_TERMINAL' USING ERRCODE='23514'; END IF;
      END IF;
      IF date_trunc('minute',NEW.start_at)<>NEW.start_at OR date_trunc('minute',NEW.end_at)<>NEW.end_at
      THEN RAISE EXCEPTION 'VISIT_MINUTE_PRECISION' USING ERRCODE='23514'; END IF;
      IF current_setting('kay.visit_action',true) NOT IN ('created','updated','confirmed','rescheduled','completed','cancelled','contact_merged')
        OR current_setting('kay.visit_action',true) IS NULL
      THEN RAISE EXCEPTION 'VISIT_COMMAND_REQUIRED' USING ERRCODE='23514'; END IF;
      IF NEW.status NOT IN ('scheduled','confirmed') OR current_setting('kay.visit_merge',true)='on' THEN RETURN NEW; END IF;
      IF NEW.type='company_car' THEN
        FOR tick IN SELECT generate_series(date_trunc('hour',NEW.start_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',NEW.end_at-interval '1 microsecond',interval '1 hour') LOOP
          SELECT count(*) INTO n FROM visit v WHERE v.id<>NEW.id AND v.type='company_car'
            AND v.status IN ('scheduled','confirmed') AND v.start_at<tick+interval '1 hour' AND v.end_at>tick;
          IF n>=p.company_car_capacity_per_hour THEN RAISE EXCEPTION 'COMPANY_CAR_CAPACITY_FULL' USING ERRCODE='23514'; END IF;
        END LOOP;
      END IF;
      RETURN NEW;
    END $$;
    """)
    op.drop_constraint("visit_event_action", "visit_event", type_="check")
    op.create_check_constraint(
        "visit_event_action",
        "visit_event",
        "action IN ('created','updated','confirmed','rescheduled','completed','cancelled','contact_merged')",
    )
    op.drop_constraint("visit_status", "visit", type_="check")
    op.create_check_constraint(
        "visit_status",
        "visit",
        "status IN ('draft','scheduled','confirmed','completed','cancelled')",
    )
    op.alter_column("visit", "status", type_=sa.String(12), existing_type=sa.String(16))
    for table in ("task", "visit"):
        op.drop_constraint(f"{table}_single_context", table, type_="check")
        op.drop_index(f"ix_{table}_enquiry_id", table_name=table)
        op.drop_constraint(f"fk_{table}_enquiry_id", table, type_="foreignkey")
        op.drop_column(table, "enquiry_id")
