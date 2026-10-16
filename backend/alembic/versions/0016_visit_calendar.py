"""Versioned agency scheduling, scoped visits and retained actor history."""

# ruff: noqa: E501

import sqlalchemy as sa

from alembic import op

revision = "0016_visit_calendar"
down_revision = "0015_outcomes_reopening"
branch_labels = None
depends_on = None

VISIT_ACTIONS = (
    "created",
    "updated",
    "confirmed",
    "rescheduled",
    "completed",
    "cancelled",
    "contact_merged",
)
PRIOR_TIMELINE = (
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
    ) + (("visits",) if enabled else ())
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        " OR ".join(f"action LIKE '{family}.%'" for family in families),
    )
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    values = PRIOR_TIMELINE + (tuple(f"visits.{a}" for a in VISIT_ACTIONS) if enabled else ())
    op.create_check_constraint(
        "timeline_action", "timeline_event", "action IN (" + ",".join(repr(v) for v in values) + ")"
    )


def upgrade() -> None:
    actions(True)
    op.execute("""CREATE TABLE visit_schedule_policy (
      agency_id uuid PRIMARY KEY REFERENCES agency(id) ON DELETE RESTRICT,
      company_car_capacity_per_hour integer NOT NULL DEFAULT 2,
      version bigint NOT NULL DEFAULT 1,
      updated_by_user_id uuid REFERENCES "user"(id) ON DELETE RESTRICT,
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visit_policy_capacity CHECK(company_car_capacity_per_hour BETWEEN 1 AND 1000),
      CONSTRAINT visit_policy_version CHECK(version>0));
      INSERT INTO visit_schedule_policy(agency_id) SELECT id FROM agency;
    """)
    for name, check, index in (
        ("visit_working_window", "visit_work_window", "ix_visit_work_policy_weekday"),
        ("visit_break_window", "visit_break_window", "ix_visit_break_policy_weekday"),
    ):
        op.execute(f"""CREATE TABLE {name} (
          id uuid PRIMARY KEY, policy_id uuid NOT NULL REFERENCES visit_schedule_policy(agency_id) ON DELETE RESTRICT,
          weekday integer NOT NULL, start_local time NOT NULL, end_local time NOT NULL,
          CONSTRAINT {check} CHECK(weekday BETWEEN 1 AND 7 AND end_local>start_local));
          CREATE INDEX {index} ON {name}(policy_id,weekday);""")
    op.execute("""CREATE TABLE visit (
      id uuid PRIMARY KEY, contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE RESTRICT,
      origin_contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE RESTRICT,
      deal_id uuid REFERENCES deal(id) ON DELETE RESTRICT,
      property_id uuid REFERENCES property(id) ON DELETE RESTRICT,
      organizer_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      title varchar(160) NOT NULL, type varchar(24) NOT NULL, status varchar(12) NOT NULL,
      start_at timestamptz NOT NULL, end_at timestamptz NOT NULL, location varchar(1000) NOT NULL,
      overlap_reason varchar(1000) NOT NULL DEFAULT '', outcome varchar(1000) NOT NULL DEFAULT '',
      version bigint NOT NULL DEFAULT 1, policy_version bigint NOT NULL,
      updated_by_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visit_type CHECK(type IN ('company_car','without_company_car','office')),
      CONSTRAINT visit_status CHECK(status IN ('draft','scheduled','confirmed','completed','cancelled')),
      CONSTRAINT visit_period CHECK(end_at>start_at AND end_at<=start_at+interval '7 days'),
      CONSTRAINT visit_required_text CHECK(length(btrim(title))>0 AND length(btrim(location))>0),
      CONSTRAINT visit_version CHECK(version>0 AND policy_version>0));
      CREATE INDEX ix_visit_start_end_id ON visit(start_at,end_at,id);
      CREATE INDEX ix_visit_type_status_time ON visit(type,status,start_at,end_at);
      CREATE INDEX ix_visit_contact_id ON visit(contact_id,id);
      CREATE TABLE visit_participant (
        visit_id uuid NOT NULL REFERENCES visit(id) ON DELETE RESTRICT,
        user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT, PRIMARY KEY(visit_id,user_id));
      CREATE TABLE visit_schedule_event (
        id uuid PRIMARY KEY, policy_id uuid NOT NULL REFERENCES visit_schedule_policy(agency_id) ON DELETE RESTRICT,
        actor_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT, actor_name varchar(160) NOT NULL,
        version bigint NOT NULL, snapshot jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT visit_schedule_event_version CHECK(version>0));
      CREATE UNIQUE INDEX ix_visit_schedule_event_version ON visit_schedule_event(version);
      CREATE TABLE visit_event (
        id uuid PRIMARY KEY, visit_id uuid NOT NULL REFERENCES visit(id) ON DELETE RESTRICT,
        actor_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT, actor_name varchar(160) NOT NULL,
        action varchar(24) NOT NULL, version bigint NOT NULL, snapshot jsonb NOT NULL,
        reason varchar(1000) NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT visit_event_action CHECK(action IN ('created','updated','confirmed','rescheduled','completed','cancelled','contact_merged')),
        CONSTRAINT visit_event_version CHECK(version>0));
      CREATE UNIQUE INDEX ix_visit_event_visit_version ON visit_event(visit_id,version);
      CREATE TABLE visit_command_receipt (
        actor_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT, route varchar(100) NOT NULL,
        key uuid NOT NULL, request_hash bytea NOT NULL, visit_id uuid REFERENCES visit(id) ON DELETE RESTRICT,
        result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,route,key),
        CONSTRAINT visit_receipt_hash CHECK(octet_length(request_hash)=32));
    """)
    for table in ("visit_event", "visit_schedule_event"):
        op.execute(
            f"CREATE TRIGGER {table}_immutable BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION kay_history_immutable()"
        )
    guards()


def guards() -> None:
    op.execute("""CREATE FUNCTION kay_visit_policy_validate() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE p visit_schedule_policy; e visit_schedule_event;
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
        SELECT * INTO p FROM visit_schedule_policy FOR UPDATE;
        IF EXISTS(SELECT 1 FROM visit_working_window a JOIN visit_working_window b
          ON a.id<b.id AND a.weekday=b.weekday AND a.start_local<b.end_local AND b.start_local<a.end_local)
          OR EXISTS(SELECT 1 FROM visit_break_window a JOIN visit_break_window b
          ON a.id<b.id AND a.weekday=b.weekday AND a.start_local<b.end_local AND b.start_local<a.end_local)
          OR EXISTS(SELECT 1 FROM visit_break_window b WHERE NOT EXISTS(
            SELECT 1 FROM visit_working_window w WHERE w.weekday=b.weekday AND w.start_local<=b.start_local AND w.end_local>=b.end_local))
        THEN RAISE EXCEPTION 'INVALID_SCHEDULE_WINDOWS' USING ERRCODE='23514'; END IF;
        IF p.version=1 AND (EXISTS(SELECT 1 FROM visit_working_window) OR EXISTS(SELECT 1 FROM visit_break_window))
        THEN RAISE EXCEPTION 'SCHEDULE_HISTORY_REQUIRED' USING ERRCODE='23514'; END IF;
        IF p.version>1 THEN
          SELECT * INTO e FROM visit_schedule_event WHERE version=p.version;
          IF e.id IS NULL OR e.actor_user_id<>p.updated_by_user_id
            OR (e.snapshot->>'company_car_capacity_per_hour')::integer<>p.company_car_capacity_per_hour
            OR e.snapshot->'working_windows' IS DISTINCT FROM
              (SELECT coalesce(jsonb_agg(jsonb_build_object('weekday',weekday,'start_local',to_char(start_local,'HH24:MI'),'end_local',to_char(end_local,'HH24:MI')) ORDER BY weekday,start_local),'[]') FROM visit_working_window)
            OR e.snapshot->'lunch_breaks' IS DISTINCT FROM
              (SELECT coalesce(jsonb_agg(jsonb_build_object('weekday',weekday,'start_local',to_char(start_local,'HH24:MI'),'end_local',to_char(end_local,'HH24:MI')) ORDER BY weekday,start_local),'[]') FROM visit_break_window)
          THEN RAISE EXCEPTION 'SCHEDULE_HISTORY_REQUIRED' USING ERRCODE='23514'; END IF;
        END IF;
        RETURN NULL;
      END $$;
      CREATE FUNCTION kay_visit_policy_guard() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NEW; END IF;
        IF TG_OP='DELETE' THEN RAISE EXCEPTION 'POLICY_SINGLETON_REQUIRED' USING ERRCODE='23514'; END IF;
        IF NEW.version<>OLD.version+1 OR NOT EXISTS(SELECT 1 FROM "user" u JOIN credential c ON c.user_id=u.id
          WHERE u.id=NEW.updated_by_user_id AND u.state='active' AND u.role='administrator' AND NOT c.must_change_password)
        THEN RAISE EXCEPTION 'ADMINISTRATOR_POLICY_REQUIRED' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER visit_policy_guard BEFORE UPDATE OR DELETE ON visit_schedule_policy FOR EACH ROW EXECUTE FUNCTION kay_visit_policy_guard();
      CREATE FUNCTION kay_visit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
      CREATE TRIGGER visit_guard BEFORE INSERT OR UPDATE ON visit FOR EACH ROW EXECUTE FUNCTION kay_visit_guard();
      CREATE FUNCTION kay_visit_history_validate() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE v visit; e visit_event; target uuid;
      BEGIN
        IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
        IF TG_TABLE_NAME='visit' THEN target:=NEW.id;
        ELSIF TG_OP='DELETE' THEN target:=OLD.visit_id;
        ELSE target:=NEW.visit_id; END IF;
        SELECT * INTO v FROM visit WHERE id=target;
        IF v.id IS NULL THEN RETURN NULL; END IF;
        SELECT * INTO e FROM visit_event WHERE visit_id=v.id AND version=v.version;
        IF e.id IS NULL OR e.actor_user_id<>v.updated_by_user_id OR e.snapshot->>'status'<>v.status
          OR e.snapshot->>'title'<>v.title OR e.snapshot->>'contact_id'<>v.contact_id::text
          OR (e.snapshot->>'start_at')::timestamptz<>v.start_at OR (e.snapshot->>'end_at')::timestamptz<>v.end_at
          OR NOT EXISTS(SELECT 1 FROM visit_participant WHERE visit_id=v.id)
          OR e.snapshot->'participant_ids' IS DISTINCT FROM
            (SELECT jsonb_agg(user_id::text ORDER BY user_id) FROM visit_participant WHERE visit_id=v.id)
        THEN RAISE EXCEPTION 'VISIT_HISTORY_REQUIRED' USING ERRCODE='23514'; END IF;
        RETURN NULL;
      END $$;
    """)
    for table in ("visit_schedule_policy", "visit_working_window", "visit_break_window"):
        op.execute(
            f"CREATE CONSTRAINT TRIGGER {table}_validate AFTER INSERT OR UPDATE OR DELETE ON {table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_visit_policy_validate()"
        )
    for table in ("visit", "visit_participant"):
        events = (
            "INSERT OR UPDATE OR DELETE" if table == "visit_participant" else "INSERT OR UPDATE"
        )
        op.execute(
            f"CREATE CONSTRAINT TRIGGER {table}_history AFTER {events} ON {table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_visit_history_validate()"
        )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(
        sa.text(
            "SELECT current_database()='kayrealestate' OR EXISTS(SELECT 1 FROM visit) OR EXISTS(SELECT 1 FROM visit_schedule_event) OR EXISTS(SELECT 1 FROM visit_command_receipt)"
        )
    ):
        raise RuntimeError("VISIT_HISTORY_DOWNGRADE_REFUSED")
    for table in (
        "visit_command_receipt",
        "visit_event",
        "visit_participant",
        "visit",
        "visit_schedule_event",
        "visit_break_window",
        "visit_working_window",
        "visit_schedule_policy",
    ):
        op.drop_table(table)
    for function in (
        "kay_visit_history_validate",
        "kay_visit_guard",
        "kay_visit_policy_validate",
        "kay_visit_policy_guard",
    ):
        op.execute(f"DROP FUNCTION {function}()")
    actions(False)
