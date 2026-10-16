"""Immutable outcomes, exact stock effects and guarded linked reopenings."""

import sqlalchemy as sa

from alembic import op

revision = "0015_outcomes_reopening"
down_revision = "0014_reservations"
branch_labels = None
depends_on = None

HISTORY = ("deal_outcome", "deal_reopening", "stock_outcome", "stock_effect", "stock_reversal")
WATCHED = (*HISTORY, "deal", "deal_stage_event", "offering", "inventory_event", "outbox_event")
BASE_ACTIONS = (
    "created",
    "updated",
    "transition",
    "customer_offer.created",
    "customer_offer.updated",
    "contact_merged",
    "reservation.created",
    "reservation.released",
)
TIMELINE = (
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


def vocabulary(enabled: bool) -> None:
    actions = BASE_ACTIONS + (("closed", "reopened", "stock.flagged") if enabled else ())
    for table, name, expression in (
        (
            "deal",
            "deal_supported_stage",
            "stage IN ('new','visit','negotiation','documents','reserved'"
            + (",'won','lost','cancelled'" if enabled else "")
            + ")",
        ),
        (
            "offering",
            "offering_state",
            "state IN ('draft','available','reserved','withdrawn'"
            + (",'sold','rented','review'" if enabled else "")
            + ")",
        ),
        (
            "deal_stage_event",
            "deal_event_action",
            "action IN (" + ",".join(repr(a) for a in actions) + ")",
        ),
        (
            "timeline_event",
            "timeline_action",
            "action IN ("
            + ",".join(repr(a) for a in (*TIMELINE, *("deals." + a for a in actions)))
            + ")",
        ),
        (
            "outbox_event",
            "outbox_typed_parent",
            "(kind='file.scan' AND version_id IS NOT NULL AND inventory_event_id IS NULL) "
            "OR (kind IN ('inventory.reservation.created','inventory.reservation.released'"
            + (",'inventory.outcome.created','inventory.outcome.reopened'" if enabled else "")
            + ") AND version_id IS NULL AND inventory_event_id IS NOT NULL)",
        ),
    ):
        op.drop_constraint(name, table, type_="check")
        op.create_check_constraint(name, table, expression)


def upgrade() -> None:
    vocabulary(True)
    op.add_column(
        "deal",
        sa.Column("stock_review_required", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column("deal", sa.Column("primary_agent_at_close_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "deal_agent_at_close_fk",
        "deal",
        "user",
        ["primary_agent_at_close_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.add_column(
        "deal_stage_event",
        sa.Column("stock_review_required", sa.Boolean(), nullable=False, server_default="false"),
    )
    # Frozen reviewed DDL: migration behavior does not depend on future ORM imports.
    op.execute("""CREATE TABLE deal_outcome (
      id uuid PRIMARY KEY, deal_id uuid NOT NULL REFERENCES deal(id) ON DELETE RESTRICT,
      offering_id uuid REFERENCES offering(id) ON DELETE RESTRICT,
      outcome varchar(12) NOT NULL, agreed_amount_mad numeric(18,2), price_period varchar(5),
      completed_on date NOT NULL, explanation varchar(1000) NOT NULL,
      primary_agent_at_close_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      primary_agent_at_close_name varchar(160) NOT NULL,
      actor_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      actor_name varchar(160) NOT NULL, previous_stage varchar(16) NOT NULL,
      close_version bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT deal_outcome_kind CHECK (outcome IN ('won','lost','cancelled')),
      CONSTRAINT deal_outcome_reason CHECK (length(btrim(explanation)) BETWEEN 1 AND 1000),
      CONSTRAINT deal_outcome_version CHECK (close_version>1),
      CONSTRAINT deal_outcome_previous CHECK (previous_stage IN
      ('new','visit','negotiation','documents','reserved')),
      CONSTRAINT deal_outcome_amount CHECK ((outcome='won' AND offering_id IS NOT NULL
        AND agreed_amount_mad IS NOT NULL AND agreed_amount_mad>0 AND
        agreed_amount_mad!='NaN'::numeric)
        OR (outcome<>'won' AND agreed_amount_mad IS NULL)),
      CONSTRAINT deal_outcome_period CHECK (price_period IS NULL OR price_period IN
      ('month','year'))
    )""")
    op.execute("CREATE INDEX ix_deal_outcome_time ON deal_outcome(deal_id,created_at,id)")
    op.execute("CREATE UNIQUE INDEX uq_deal_outcome_version ON deal_outcome(deal_id,close_version)")
    op.execute("""CREATE TABLE deal_reopening (
      id uuid PRIMARY KEY, deal_id uuid NOT NULL REFERENCES deal(id) ON DELETE RESTRICT,
      outcome_id uuid NOT NULL UNIQUE REFERENCES deal_outcome(id) ON DELETE RESTRICT,
      actor_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      actor_name varchar(160) NOT NULL, reason varchar(1000) NOT NULL,
      reopen_version bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT deal_reopening_reason CHECK(length(btrim(reason)) BETWEEN 1 AND 1000),
      CONSTRAINT deal_reopening_version CHECK(reopen_version>1)
    )""")
    op.execute("CREATE INDEX ix_deal_reopening_deal_id ON deal_reopening(deal_id)")
    op.execute("""CREATE TABLE stock_outcome (
      id uuid PRIMARY KEY, deal_outcome_id uuid UNIQUE REFERENCES deal_outcome(id) ON DELETE
      RESTRICT,
      offering_id uuid NOT NULL REFERENCES offering(id) ON DELETE RESTRICT,
      completed_on date NOT NULL, explanation varchar(1000) NOT NULL,
      actor_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      after_fingerprint varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT stock_outcome_fingerprint CHECK(length(after_fingerprint)=64),
      CONSTRAINT stock_outcome_reason CHECK(length(btrim(explanation)) BETWEEN 1 AND 1000)
    )""")
    op.execute("CREATE INDEX ix_stock_outcome_offering_id ON stock_outcome(offering_id)")
    op.execute("""CREATE TABLE stock_effect (
      id uuid PRIMARY KEY, outcome_id uuid NOT NULL REFERENCES stock_outcome(id) ON DELETE RESTRICT,
      offering_id uuid NOT NULL REFERENCES offering(id) ON DELETE RESTRICT,
      before_state varchar(12) NOT NULL, before_current boolean NOT NULL, before_version bigint
      NOT NULL,
      after_state varchar(12) NOT NULL, after_current boolean NOT NULL, after_version bigint NOT
      NULL,
      inventory_event_id uuid NOT NULL UNIQUE REFERENCES inventory_event(id) ON DELETE RESTRICT,
      CONSTRAINT stock_effect_version CHECK(before_version>0 AND after_version=before_version+1),
      CONSTRAINT stock_effect_states CHECK(before_state IN
      ('draft','available','reserved','withdrawn','review')
        AND after_state IN ('sold','rented','withdrawn','review'))
    )""")
    for column in ("offering_id", "outcome_id"):
        op.execute(f"CREATE INDEX ix_stock_effect_{column} ON stock_effect({column})")
    op.execute(
        "CREATE UNIQUE INDEX uq_stock_effect_offering ON stock_effect(outcome_id,offering_id)"
    )
    op.execute("""CREATE TABLE stock_reversal (
      id uuid PRIMARY KEY, effect_id uuid NOT NULL UNIQUE REFERENCES stock_effect(id) ON DELETE
      RESTRICT,
      reopening_id uuid NOT NULL REFERENCES deal_reopening(id) ON DELETE RESTRICT,
      inventory_event_id uuid NOT NULL UNIQUE REFERENCES inventory_event(id) ON DELETE RESTRICT
    )""")
    op.execute("CREATE INDEX ix_stock_reversal_reopening_id ON stock_reversal(reopening_id)")
    for table in HISTORY:
        op.execute(
            f"CREATE TRIGGER {table}_immutable BEFORE UPDATE OR DELETE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION kay_history_immutable()"
        )
    guards()


def guards() -> None:
    op.execute("""CREATE FUNCTION kay_outcome_offering_identity() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN
      IF EXISTS(SELECT 1 FROM stock_effect WHERE offering_id=OLD.id) AND
        ROW(NEW.kind,NEW.property_id,NEW.development_id) IS DISTINCT FROM
        ROW(OLD.kind,OLD.property_id,OLD.development_id) THEN
        RAISE EXCEPTION 'OUTCOME_TARGET_IMMUTABLE' USING ERRCODE='23514'; END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER outcome_offering_identity BEFORE UPDATE ON offering "
        "FOR EACH ROW EXECUTE FUNCTION kay_outcome_offering_identity()"
    )
    op.execute("""CREATE FUNCTION kay_outcome_write_lock() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE selected offering%ROWTYPE; parent uuid;
    BEGIN
      SELECT * INTO selected FROM offering WHERE id=NEW.offering_id;
      parent:=selected.development_id;
      IF parent IS NULL THEN SELECT development_id INTO parent FROM property WHERE
      id=selected.property_id; END IF;
      PERFORM id FROM development WHERE id=parent FOR UPDATE;
      PERFORM id FROM property WHERE id=selected.property_id FOR UPDATE;
      PERFORM o.id FROM offering o WHERE o.id=selected.id OR o.property_id=selected.property_id
        OR o.development_id=parent OR (selected.development_id IS NOT NULL AND o.property_id IN
        (SELECT id FROM property WHERE development_id=parent)) ORDER BY o.id FOR UPDATE;
      IF selected.development_id IS NOT NULL AND EXISTS(SELECT 1 FROM offering o JOIN property p
      ON p.id=o.property_id
          WHERE p.development_id=parent AND o.state IN ('sold','rented')) THEN
        RAISE EXCEPTION 'PARTIAL_DEVELOPMENT_REVIEW_REQUIRED' USING ERRCODE='23514'; END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER stock_outcome_lock BEFORE INSERT ON stock_outcome "
        "FOR EACH ROW EXECUTE FUNCTION kay_outcome_write_lock()"
    )
    op.execute("""CREATE FUNCTION kay_outcome_consistency() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN
      IF current_database()='kayrealestate_test' AND
      current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
      IF EXISTS(SELECT 1 FROM deal d WHERE
        ((d.stage IN ('won','lost','cancelled')) <> EXISTS(SELECT 1 FROM deal_outcome o
           WHERE o.deal_id=d.id AND NOT EXISTS(SELECT 1 FROM deal_reopening r WHERE
           r.outcome_id=o.id))) OR
        (d.stage IN ('won','lost','cancelled') AND NOT EXISTS(SELECT 1 FROM deal_outcome o
          WHERE o.deal_id=d.id AND o.outcome=d.stage AND
          o.primary_agent_at_close_id=d.primary_agent_at_close_id
          AND o.offering_id IS NOT DISTINCT FROM d.offering_id
          AND NOT EXISTS(SELECT 1 FROM deal_reopening r WHERE r.outcome_id=o.id))) OR
        NOT EXISTS(SELECT 1 FROM deal_stage_event h WHERE h.deal_id=d.id AND
        h.after_version=d.version
          AND h.stock_review_required=d.stock_review_required)) THEN
        RAISE EXCEPTION 'DEAL_OUTCOME_REQUIRED' USING ERRCODE='23514'; END IF;
      IF EXISTS(SELECT 1 FROM deal_outcome o WHERE NOT EXISTS(SELECT 1 FROM deal_stage_event h
        WHERE h.deal_id=o.deal_id AND h.after_version=o.close_version AND h.action='closed'
        AND h.to_stage=o.outcome AND h.from_stage=o.previous_stage AND
        h.actor_user_id=o.actor_user_id
        AND h.reason=o.explanation AND h.offering_id IS NOT DISTINCT FROM o.offering_id)
        OR (o.outcome='won' AND NOT EXISTS(SELECT 1 FROM stock_outcome s WHERE
        s.deal_outcome_id=o.id))) THEN
        RAISE EXCEPTION 'OUTCOME_HISTORY_REQUIRED' USING ERRCODE='23514'; END IF;
      IF EXISTS(SELECT 1 FROM deal_reopening r JOIN deal_outcome o ON o.id=r.outcome_id
        WHERE r.deal_id<>o.deal_id OR r.reopen_version<=o.close_version OR NOT EXISTS(
        SELECT 1 FROM deal_stage_event h WHERE h.deal_id=r.deal_id AND
        h.after_version=r.reopen_version
          AND h.action='reopened' AND h.to_stage='negotiation' AND h.from_stage=o.outcome
          AND h.actor_user_id=r.actor_user_id AND h.reason=r.reason)) THEN
        RAISE EXCEPTION 'REOPEN_HISTORY_REQUIRED' USING ERRCODE='23514'; END IF;
      IF EXISTS(SELECT 1 FROM stock_outcome s JOIN offering o ON o.id=s.offering_id WHERE
        (s.deal_outcome_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM deal_outcome d WHERE
        d.id=s.deal_outcome_id
          AND d.outcome='won' AND d.offering_id=s.offering_id AND d.actor_user_id=s.actor_user_id
          AND d.completed_on=s.completed_on AND EXISTS(SELECT 1 FROM stock_effect e
            JOIN inventory_event i ON i.id=e.inventory_event_id
            WHERE e.outcome_id=s.id AND e.offering_id=s.offering_id
            AND d.price_period IS NOT DISTINCT FROM i.price_period)))
        OR NOT EXISTS(SELECT 1 FROM stock_effect e WHERE e.outcome_id=s.id AND
        e.offering_id=s.offering_id
          AND e.after_state=CASE WHEN o.kind='sale' THEN 'sold' ELSE 'rented' END)) THEN
        RAISE EXCEPTION 'STOCK_OUTCOME_CONTEXT_INVALID' USING ERRCODE='23514'; END IF;
      IF EXISTS(SELECT 1 FROM stock_effect e JOIN stock_outcome s ON s.id=e.outcome_id
        WHERE NOT EXISTS(SELECT 1 FROM inventory_event i JOIN outbox_event b ON
        b.inventory_event_id=i.id
          WHERE i.id=e.inventory_event_id AND i.offering_id=e.offering_id AND i.state=e.after_state
          AND i.offering_version=e.after_version AND i.actor_user_id=s.actor_user_id
          AND i.action='offerings.outcome.created' AND b.kind='inventory.outcome.created')) THEN
        RAISE EXCEPTION 'STOCK_EFFECT_HISTORY_REQUIRED' USING ERRCODE='23514'; END IF;
      IF EXISTS(SELECT 1 FROM stock_reversal v JOIN stock_effect e ON e.id=v.effect_id
        JOIN stock_outcome s ON s.id=e.outcome_id JOIN deal_reopening r ON r.id=v.reopening_id
        WHERE r.outcome_id IS DISTINCT FROM s.deal_outcome_id OR NOT EXISTS(
          SELECT 1 FROM inventory_event i JOIN outbox_event b ON b.inventory_event_id=i.id
          WHERE i.id=v.inventory_event_id AND i.offering_id=e.offering_id
          AND i.state=CASE WHEN e.before_state='reserved' THEN 'available' ELSE e.before_state END
          AND i.offering_version=e.after_version+1 AND i.actor_user_id=r.actor_user_id
          AND i.action='offerings.outcome.reopened' AND b.kind='inventory.outcome.reopened')) THEN
        RAISE EXCEPTION 'STOCK_REVERSAL_HISTORY_REQUIRED' USING ERRCODE='23514'; END IF;
      IF EXISTS(SELECT 1 FROM offering o WHERE o.state IN ('sold','rented','review') AND NOT EXISTS(
        SELECT 1 FROM stock_effect e WHERE e.offering_id=o.id AND e.after_state=o.state
          AND e.after_version=o.version AND e.after_current=o.is_current
          AND NOT EXISTS(SELECT 1 FROM stock_reversal r WHERE r.effect_id=e.id))) THEN
        RAISE EXCEPTION 'STOCK_EFFECT_REQUIRED' USING ERRCODE='23514'; END IF;
      IF EXISTS(SELECT 1 FROM stock_effect e JOIN offering o ON o.id=e.offering_id
        JOIN inventory_event i ON i.id=e.inventory_event_id
        WHERE NOT EXISTS(SELECT 1 FROM stock_reversal r WHERE r.effect_id=e.id)
        AND NOT EXISTS(SELECT 1 FROM stock_effect later WHERE later.offering_id=e.offering_id
          AND later.after_version>e.after_version AND NOT EXISTS(
            SELECT 1 FROM stock_reversal r WHERE r.effect_id=later.id))
        AND ROW(o.state,o.is_current,o.version,o.price_mad,o.price_period,o.conditions)
        IS DISTINCT FROM ROW(e.after_state,e.after_current,e.after_version,
          i.price_mad,i.price_period,i.conditions)) THEN
        RAISE EXCEPTION 'COMMITTED_STOCK_REOPEN_REQUIRED' USING ERRCODE='23514'; END IF;
      IF EXISTS(SELECT 1 FROM offering whole JOIN property p ON
      p.development_id=whole.development_id
        JOIN offering child ON child.property_id=p.id WHERE whole.state IN ('sold','rented')
        AND child.state IN ('available','reserved','sold','rented')
        AND (whole.state='sold' OR child.kind=whole.kind)) THEN
        RAISE EXCEPTION 'COMMITTED_DEVELOPMENT_OVERLAP' USING ERRCODE='23514'; END IF;
      IF EXISTS(SELECT 1 FROM deal_outcome o WHERE o.outcome='won' AND EXISTS(
        SELECT 1 FROM deal_reopening r WHERE r.outcome_id=o.id) AND EXISTS(
        SELECT 1 FROM stock_effect e JOIN stock_outcome s ON s.id=e.outcome_id
        WHERE s.deal_outcome_id=o.id AND NOT EXISTS(SELECT 1 FROM stock_reversal v WHERE
        v.effect_id=e.id))) THEN
        RAISE EXCEPTION 'STOCK_REVERSAL_REQUIRED' USING ERRCODE='23514'; END IF;
      RETURN NULL;
    END $$""")
    for table in WATCHED:
        op.execute(
            f"CREATE CONSTRAINT TRIGGER {table}_outcome_consistency "
            f"AFTER INSERT OR UPDATE OR DELETE ON {table} "
            "DEFERRABLE INITIALLY DEFERRED FOR EACH ROW "
            "EXECUTE FUNCTION kay_outcome_consistency()"
        )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT current_database()")) == "kayrealestate":
        raise RuntimeError("DEVELOPMENT_DOWNGRADE_REFUSED")
    if connection.scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM deal_outcome UNION ALL SELECT 1 FROM deal_reopening "
            "UNION ALL SELECT 1 FROM stock_outcome UNION ALL SELECT 1 FROM stock_effect "
            "UNION ALL SELECT 1 FROM stock_reversal)"
        )
    ):
        raise RuntimeError("OUTCOME_HISTORY_DOWNGRADE_REFUSED")
    for table in WATCHED:
        op.execute(f"DROP TRIGGER {table}_outcome_consistency ON {table}")
    op.execute("DROP FUNCTION kay_outcome_consistency()")
    op.execute("DROP TRIGGER IF EXISTS outcome_offering_identity ON offering")
    op.execute("DROP FUNCTION IF EXISTS kay_outcome_offering_identity()")
    op.execute("DROP TRIGGER stock_outcome_lock ON stock_outcome")
    op.execute("DROP FUNCTION kay_outcome_write_lock()")
    for table in reversed(HISTORY):
        op.drop_table(table)
    op.drop_column("deal_stage_event", "stock_review_required")
    op.drop_constraint("deal_agent_at_close_fk", "deal", type_="foreignkey")
    op.drop_column("deal", "primary_agent_at_close_id")
    op.drop_column("deal", "stock_review_required")
    vocabulary(False)
