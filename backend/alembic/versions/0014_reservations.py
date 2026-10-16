"""Persistent, explicitly released stock holds with hierarchy-safe competition."""

import sqlalchemy as sa

from alembic import op

revision = "0014_reservations"
down_revision = "0013_deal_pipeline"
branch_labels = None
depends_on = None

TABLES = (
    "reservation",
    "offering",
    "deal",
    "property",
    "development",
    "property_owner",
    "development_owner",
    "inventory_event",
    "outbox_event",
)


def allowed_actions(enabled: bool) -> None:
    op.drop_constraint("deal_event_action", "deal_stage_event", type_="check")
    suffix = ",'reservation.created','reservation.released'" if enabled else ""
    op.create_check_constraint(
        "deal_event_action",
        "deal_stage_event",
        "action IN ('created','updated','transition','customer_offer.created',"
        "'customer_offer.updated','contact_merged'" + suffix + ")",
    )
    op.execute("ALTER TABLE timeline_event DROP CONSTRAINT timeline_action")
    # The previous allowed list is frozen here, not imported from runtime models.
    values = (
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
    if enabled:
        values += ("deals.reservation.created", "deals.reservation.released")
    op.create_check_constraint(
        "timeline_action", "timeline_event", "action IN (" + ",".join(repr(v) for v in values) + ")"
    )


def states(enabled: bool) -> None:
    for name in ("offering_state", "offering_available_price"):
        op.drop_constraint(name, "offering", type_="check")
    values = "'draft','available','withdrawn'" + (",'reserved'" if enabled else "")
    op.create_check_constraint("offering_state", "offering", f"state IN ({values})")
    live = "'available','reserved'" if enabled else "'available'"
    op.create_check_constraint(
        "offering_available_price",
        "offering",
        f"state NOT IN ({live}) OR (price_mad>0 AND price_mad IS NOT NULL "
        "AND availability_confirmed_at IS NOT NULL)",
    )
    op.drop_constraint("deal_supported_stage", "deal", type_="check")
    suffix = ",'reserved'" if enabled else ""
    op.create_check_constraint(
        "deal_supported_stage",
        "deal",
        "stage IN ('new','visit','negotiation','documents'" + suffix + ")",
    )


def upgrade() -> None:
    states(True)
    allowed_actions(True)
    op.execute("""CREATE TABLE reservation (
      id uuid PRIMARY KEY, deal_id uuid NOT NULL REFERENCES deal(id) ON DELETE RESTRICT,
      offering_id uuid NOT NULL REFERENCES offering(id) ON DELETE RESTRICT,
      previous_stage varchar(16) NOT NULL,
      created_by_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      reserve_event_id uuid NOT NULL REFERENCES inventory_event(id) ON DELETE RESTRICT,
      released_at timestamptz,
      released_by_user_id uuid REFERENCES "user"(id) ON DELETE RESTRICT,
      release_reason varchar(1000),
      release_event_id uuid REFERENCES inventory_event(id) ON DELETE RESTRICT,
      CONSTRAINT reservation_previous_stage CHECK
        (previous_stage IN ('new','visit','negotiation','documents')),
      CONSTRAINT reservation_release CHECK (
        (released_at IS NULL AND released_by_user_id IS NULL AND release_reason IS NULL
         AND release_event_id IS NULL) OR
        (released_at IS NOT NULL AND released_at>=created_at AND released_by_user_id IS NOT NULL
         AND release_event_id IS NOT NULL AND release_reason IS NOT NULL
         AND length(btrim(release_reason)) BETWEEN 1 AND 1000))
    )""")
    op.execute("CREATE INDEX ix_reservation_deal_id ON reservation(deal_id)")
    for name, column in (("offering", "offering_id"), ("deal", "deal_id")):
        op.execute(
            f"CREATE UNIQUE INDEX uq_reservation_active_{name} ON reservation({column}) "
            "WHERE released_at IS NULL"
        )
    op.alter_column("outbox_event", "version_id", nullable=True)
    op.add_column("outbox_event", sa.Column("inventory_event_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "outbox_inventory_event_fk",
        "outbox_event",
        "inventory_event",
        ["inventory_event_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "outbox_inventory_event_unique", "outbox_event", ["inventory_event_id"]
    )
    op.create_check_constraint(
        "outbox_typed_parent",
        "outbox_event",
        "(kind='file.scan' AND version_id IS NOT NULL AND inventory_event_id IS NULL) OR "
        "(kind IN ('inventory.reservation.created','inventory.reservation.released') "
        "AND version_id IS NULL AND inventory_event_id IS NOT NULL)",
    )
    identity_and_lock_guards()
    consistency_guards()


def identity_and_lock_guards() -> None:
    op.execute("""CREATE FUNCTION kay_reserved_offering_identity() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN
      IF EXISTS(SELECT 1 FROM reservation WHERE offering_id=OLD.id) AND NEW.kind<>OLD.kind
        OR (OLD.state='reserved' AND NEW.state='reserved' AND
          ROW(NEW.price_mad,NEW.price_period,NEW.conditions,NEW.is_current)
          IS DISTINCT FROM ROW(OLD.price_mad,OLD.price_period,OLD.conditions,OLD.is_current)) THEN
        RAISE EXCEPTION 'RESERVATION_RELEASE_REQUIRED' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER reserved_offering_identity BEFORE UPDATE ON offering "
        "FOR EACH ROW EXECUTE FUNCTION kay_reserved_offering_identity()"
    )
    op.execute("""CREATE FUNCTION kay_reservation_write() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE parent uuid; pid uuid; whole uuid; selected offering%ROWTYPE;
    BEGIN
      IF current_database()='kayrealestate_test' AND
         current_setting('kay.synthetic_cleanup',true)='on' THEN
        IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
      END IF;
      IF TG_OP='DELETE' THEN
        RAISE EXCEPTION 'RESERVATION_HISTORY_REQUIRED' USING ERRCODE='23514'; END IF;
      IF TG_OP='UPDATE' THEN
        IF ROW(NEW.id,NEW.deal_id,NEW.offering_id,NEW.previous_stage,NEW.created_by_user_id,
               NEW.created_at,NEW.reserve_event_id) IS DISTINCT FROM
           ROW(OLD.id,OLD.deal_id,OLD.offering_id,OLD.previous_stage,OLD.created_by_user_id,
               OLD.created_at,OLD.reserve_event_id) OR OLD.released_at IS NOT NULL
           OR NEW.released_at IS NULL THEN
          RAISE EXCEPTION 'RESERVATION_IDENTITY_IMMUTABLE' USING ERRCODE='23514';
        END IF;
        RETURN NEW;
      END IF;
      SELECT * INTO selected FROM offering WHERE id=NEW.offering_id;
      pid:=selected.property_id; whole:=selected.development_id;
      SELECT coalesce(whole,p.development_id) INTO parent FROM (SELECT 1) seed
        LEFT JOIN property p ON p.id=pid;
      PERFORM id FROM development WHERE id=parent FOR UPDATE;
      PERFORM id FROM property WHERE id=pid FOR UPDATE;
      PERFORM o.id FROM offering o WHERE o.id=selected.id OR o.development_id=parent
        OR (whole IS NOT NULL AND o.property_id IN
            (SELECT p.id FROM property p WHERE p.development_id=parent)) ORDER BY o.id FOR UPDATE;
      IF EXISTS(SELECT 1 FROM reservation r JOIN offering o ON o.id=r.offering_id
         LEFT JOIN property p ON p.id=o.property_id WHERE r.released_at IS NULL
         AND o.kind=selected.kind AND (o.id=selected.id OR
         (parent IS NOT NULL AND o.development_id=parent) OR
         (whole IS NOT NULL AND p.development_id=parent))) THEN
        RAISE EXCEPTION 'RESERVATION_OVERLAP' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER reservation_write BEFORE INSERT OR UPDATE OR DELETE ON reservation "
        "FOR EACH ROW EXECUTE FUNCTION kay_reservation_write()"
    )


def consistency_guards() -> None:
    op.execute("""CREATE FUNCTION kay_validate_reservation(oid uuid) RETURNS void
    LANGUAGE plpgsql AS $$
    BEGIN
      IF EXISTS(SELECT 1 FROM offering o WHERE o.id=oid AND
        ((o.state='reserved') <> EXISTS(SELECT 1 FROM reservation r
           WHERE r.offering_id=o.id AND r.released_at IS NULL))) THEN
        RAISE EXCEPTION 'RESERVATION_STOCK_MISMATCH' USING ERRCODE='23514';
      END IF;
      IF EXISTS(SELECT 1 FROM reservation r JOIN offering o ON o.id=r.offering_id
        JOIN deal d ON d.id=r.deal_id LEFT JOIN property p ON p.id=o.property_id
        LEFT JOIN development dev ON dev.id=coalesce(o.development_id,p.development_id)
        WHERE r.offering_id=oid AND r.released_at IS NULL AND
        (d.offering_id IS DISTINCT FROM o.id OR NOT o.is_current OR o.state<>'reserved'
         OR dev.archived_at IS NOT NULL OR
         (o.property_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM property_owner po
           WHERE po.property_id=o.property_id AND po.archived_at IS NULL)) OR
         (o.development_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM development_owner own
           WHERE own.development_id=o.development_id AND own.archived_at IS NULL)))) THEN
        RAISE EXCEPTION 'RESERVATION_CONTEXT_INVALID' USING ERRCODE='23514';
      END IF;
      IF EXISTS(SELECT 1 FROM reservation r WHERE r.offering_id=oid AND
        (NOT EXISTS(SELECT 1 FROM inventory_event e JOIN outbox_event b ON b.inventory_event_id=e.id
          WHERE e.id=r.reserve_event_id AND e.offering_id=r.offering_id
          AND e.actor_user_id=r.created_by_user_id AND e.state='reserved'
          AND e.action='offerings.reservation.created' AND b.kind='inventory.reservation.created')
        OR NOT EXISTS(SELECT 1 FROM deal_stage_event h WHERE h.deal_id=r.deal_id
          AND h.offering_id=r.offering_id AND h.actor_user_id=r.created_by_user_id
          AND h.action='reservation.created' AND h.to_stage='reserved')
        OR (r.released_at IS NOT NULL AND NOT EXISTS(
          SELECT 1 FROM inventory_event e JOIN outbox_event b ON b.inventory_event_id=e.id
          WHERE e.id=r.release_event_id AND e.offering_id=r.offering_id
          AND e.actor_user_id=r.released_by_user_id AND e.state='available'
          AND e.reason=r.release_reason AND e.action='offerings.reservation.released'
          AND b.kind='inventory.reservation.released')))) THEN
        RAISE EXCEPTION 'RESERVATION_HISTORY_REQUIRED' USING ERRCODE='23514';
      END IF;
      IF EXISTS(SELECT 1 FROM deal d WHERE d.offering_id=oid AND d.stage='reserved' AND
         NOT EXISTS(SELECT 1 FROM reservation r
           WHERE r.deal_id=d.id AND r.released_at IS NULL)) THEN
        RAISE EXCEPTION 'DEAL_RESERVATION_REQUIRED' USING ERRCODE='23514';
      END IF;
    END $$""")
    op.execute("""CREATE FUNCTION kay_stock_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE data jsonb; oid uuid; pid uuid; did uuid; eid uuid; target uuid;
    BEGIN
      IF current_database()='kayrealestate_test' AND
         current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
      data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
      IF TG_TABLE_NAME IN ('reservation','inventory_event') THEN
        oid:=(data->>'offering_id')::uuid;
      ELSIF TG_TABLE_NAME='offering' THEN oid:=(data->>'id')::uuid;
      ELSIF TG_TABLE_NAME='deal' THEN
        IF data->>'stage'='reserved' AND NOT EXISTS(SELECT 1 FROM reservation r
             WHERE r.deal_id=(data->>'id')::uuid AND r.released_at IS NULL) THEN
          RAISE EXCEPTION 'DEAL_RESERVATION_REQUIRED' USING ERRCODE='23514'; END IF;
        SELECT d.offering_id INTO oid FROM deal d WHERE d.id=(data->>'id')::uuid;
      ELSIF TG_TABLE_NAME='property' THEN pid:=(data->>'id')::uuid;
      ELSIF TG_TABLE_NAME='development' THEN did:=(data->>'id')::uuid;
      ELSIF TG_TABLE_NAME='property_owner' THEN pid:=(data->>'property_id')::uuid;
      ELSIF TG_TABLE_NAME='development_owner' THEN did:=(data->>'development_id')::uuid;
      ELSE eid:=(data->>'inventory_event_id')::uuid;
        SELECT e.offering_id INTO oid FROM inventory_event e WHERE e.id=eid;
      END IF;
      FOR target IN SELECT o.id FROM offering o LEFT JOIN property p ON p.id=o.property_id
          WHERE o.id=oid OR o.property_id=pid OR o.development_id=did OR p.development_id=did LOOP
        PERFORM kay_validate_reservation(target);
      END LOOP;
      RETURN NULL;
    END $$""")
    for table in TABLES:
        op.execute(
            f"CREATE CONSTRAINT TRIGGER {table}_stock_consistency AFTER INSERT OR UPDATE OR DELETE "
            f"ON {table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW "
            "EXECUTE FUNCTION kay_stock_consistency()"
        )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT current_database()")) == "kayrealestate":
        raise RuntimeError("DEVELOPMENT_DOWNGRADE_REFUSED")
    if connection.scalar(sa.text("SELECT EXISTS(SELECT 1 FROM reservation)")):
        raise RuntimeError("RESERVATION_HISTORY_DOWNGRADE_REFUSED")
    for table in TABLES:
        op.execute(f"DROP TRIGGER {table}_stock_consistency ON {table}")
    op.execute("DROP FUNCTION kay_stock_consistency()")
    op.execute("DROP FUNCTION kay_validate_reservation(uuid)")
    op.execute("DROP TRIGGER IF EXISTS reserved_offering_identity ON offering")
    op.execute("DROP FUNCTION IF EXISTS kay_reserved_offering_identity()")
    op.drop_table("reservation")
    op.execute("DROP FUNCTION kay_reservation_write()")
    op.drop_constraint("outbox_typed_parent", "outbox_event", type_="check")
    op.drop_constraint("outbox_inventory_event_unique", "outbox_event", type_="unique")
    op.drop_constraint("outbox_inventory_event_fk", "outbox_event", type_="foreignkey")
    op.drop_column("outbox_event", "inventory_event_id")
    op.alter_column("outbox_event", "version_id", nullable=False)
    states(False)
    allowed_actions(False)
