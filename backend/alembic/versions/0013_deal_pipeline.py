"""Explicit deals, separate proposals and immutable actor/target history."""

import sqlalchemy as sa

from alembic import op

revision = "0013_deal_pipeline"
down_revision = "0012_requirements_shortlists"
branch_labels = None
depends_on = None

# Frozen reviewed DDL; runtime ORM changes cannot rewrite migration history.
TABLE_SQL = (
    """
    CREATE TABLE deal (
    id UUID NOT NULL,
    contact_id UUID NOT NULL,
    origin_contact_id UUID NOT NULL,
    enquiry_id UUID,
    requirement_id UUID,
    offering_id UUID,
    title VARCHAR(160) NOT NULL,
    stage VARCHAR(16) DEFAULT 'new' NOT NULL,
    next_action VARCHAR(1000) DEFAULT '' NOT NULL,
    version BIGINT DEFAULT '1' NOT NULL,
    created_by_user_id UUID NOT NULL,
    updated_by_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT deal_title CHECK (length(btrim(title)) > 0),
    CONSTRAINT deal_version CHECK (version > 0),
    CONSTRAINT deal_stage CHECK (stage IN
    ('new','visit','negotiation','reserved','documents','won','lost','cancelled')),
    CONSTRAINT deal_supported_stage CHECK (stage IN
    ('new','visit','negotiation','documents')),
    FOREIGN KEY(contact_id) REFERENCES contact (id) ON DELETE RESTRICT,
    FOREIGN KEY(origin_contact_id) REFERENCES contact (id) ON DELETE RESTRICT,
    FOREIGN KEY(enquiry_id) REFERENCES enquiry (id) ON DELETE RESTRICT,
    FOREIGN KEY(requirement_id) REFERENCES requirement (id) ON DELETE RESTRICT,
    FOREIGN KEY(offering_id) REFERENCES offering (id) ON DELETE RESTRICT,
    FOREIGN KEY(created_by_user_id) REFERENCES "user" (id) ON DELETE RESTRICT,
    FOREIGN KEY(updated_by_user_id) REFERENCES "user" (id) ON DELETE RESTRICT
    )
    """,
    """
    CREATE INDEX ix_deal_contact_stage_updated ON deal (contact_id, stage, updated_at, id)
    """,
    """
    CREATE INDEX ix_deal_enquiry_id ON deal (enquiry_id)
    """,
    """
    CREATE INDEX ix_deal_offering_id ON deal (offering_id)
    """,
    """
    CREATE INDEX ix_deal_origin_contact_id ON deal (origin_contact_id)
    """,
    """
    CREATE INDEX ix_deal_requirement_id ON deal (requirement_id)
    """,
    """
    CREATE INDEX ix_deal_updated_id ON deal (updated_at, id)
    """,
    """
    CREATE TABLE customer_offer (
    id UUID NOT NULL,
    deal_id UUID NOT NULL,
    amount_mad NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MAD' NOT NULL,
    price_period VARCHAR(5),
    conditions VARCHAR(4000) DEFAULT '' NOT NULL,
    expires_on DATE,
    status VARCHAR(10) DEFAULT 'pending' NOT NULL,
    version BIGINT DEFAULT '1' NOT NULL,
    created_by_user_id UUID NOT NULL,
    updated_by_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT customer_offer_amount CHECK (amount_mad > 0 AND amount_mad !=
    'NaN'::numeric),
    CONSTRAINT customer_offer_currency CHECK (currency='MAD'),
    CONSTRAINT customer_offer_period CHECK (price_period IS NULL OR price_period IN
    ('month','year')),
    CONSTRAINT customer_offer_status CHECK (status IN
    ('pending','accepted','rejected','withdrawn')),
    CONSTRAINT customer_offer_version CHECK (version > 0),
    FOREIGN KEY(deal_id) REFERENCES deal (id) ON DELETE RESTRICT,
    FOREIGN KEY(created_by_user_id) REFERENCES "user" (id) ON DELETE RESTRICT,
    FOREIGN KEY(updated_by_user_id) REFERENCES "user" (id) ON DELETE RESTRICT
    )
    """,
    """
    CREATE INDEX ix_customer_offer_deal_time ON customer_offer (deal_id, created_at, id)
    """,
    """
    CREATE TABLE deal_stage_event (
    id UUID NOT NULL,
    deal_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    actor_user_id UUID NOT NULL,
    actor_name VARCHAR(160) NOT NULL,
    action VARCHAR(32) NOT NULL,
    from_stage VARCHAR(16),
    to_stage VARCHAR(16) NOT NULL,
    before_version BIGINT NOT NULL,
    after_version BIGINT NOT NULL,
    title VARCHAR(160) NOT NULL,
    next_action VARCHAR(1000) NOT NULL,
    offering_id UUID,
    requirement_id UUID,
    customer_offer_id UUID,
    offer_version BIGINT,
    amount_mad NUMERIC(18, 2),
    price_period VARCHAR(5),
    conditions VARCHAR(4000),
    expires_on DATE,
    offer_status VARCHAR(10),
    reason VARCHAR(1000) DEFAULT '' NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT deal_event_action CHECK (action IN
    ('created','updated','transition','customer_offer.created','customer_offer.updated','contact_merged')),
    CONSTRAINT deal_event_identity CHECK (length(btrim(actor_name))>0 AND after_version>0
    AND before_version>=0 AND after_version=before_version+1),
    CONSTRAINT deal_event_from CHECK (from_stage IS NULL OR from_stage IN
    ('new','visit','negotiation','reserved','documents','won','lost','cancelled')),
    CONSTRAINT deal_event_to CHECK (to_stage IN
    ('new','visit','negotiation','reserved','documents','won','lost','cancelled')),
    CONSTRAINT deal_event_amount CHECK (amount_mad IS NULL OR (amount_mad>0 AND
    amount_mad!='NaN'::numeric)),
    CONSTRAINT deal_event_period CHECK (price_period IS NULL OR price_period IN
    ('month','year')),
    CONSTRAINT deal_event_offer_status CHECK (offer_status IS NULL OR offer_status IN
    ('pending','accepted','rejected','withdrawn')),
    CONSTRAINT deal_event_version_unique UNIQUE (deal_id, after_version),
    FOREIGN KEY(deal_id) REFERENCES deal (id) ON DELETE RESTRICT,
    FOREIGN KEY(contact_id) REFERENCES contact (id) ON DELETE RESTRICT,
    FOREIGN KEY(actor_user_id) REFERENCES "user" (id) ON DELETE RESTRICT,
    FOREIGN KEY(offering_id) REFERENCES offering (id) ON DELETE RESTRICT,
    FOREIGN KEY(requirement_id) REFERENCES requirement (id) ON DELETE RESTRICT,
    FOREIGN KEY(customer_offer_id) REFERENCES customer_offer (id) ON DELETE RESTRICT
    )
    """,
    """
    CREATE INDEX ix_deal_event_time ON deal_stage_event (deal_id, occurred_at, id)
    """,
    """
    CREATE TABLE deal_command_receipt (
    actor_id UUID NOT NULL,
    route VARCHAR(160) NOT NULL,
    key UUID NOT NULL,
    request_hash BYTEA NOT NULL,
    deal_id UUID NOT NULL,
    customer_offer_id UUID,
    result_version BIGINT NOT NULL,
    result_offer_version BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (actor_id, route, key),
    CONSTRAINT deal_receipt_valid CHECK (result_version>0 AND
    octet_length(request_hash)=32),
    FOREIGN KEY(actor_id) REFERENCES "user" (id) ON DELETE RESTRICT,
    FOREIGN KEY(deal_id) REFERENCES deal (id) ON DELETE RESTRICT,
    FOREIGN KEY(customer_offer_id) REFERENCES customer_offer (id) ON DELETE RESTRICT
    )
    """,
    """
    CREATE INDEX ix_deal_command_receipt_deal_id ON deal_command_receipt (deal_id)
    """,
)

TIMELINE = (
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
    ) + (("deals",) if enabled else ())
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        " OR ".join(f"action LIKE '{family}.%'" for family in families),
    )
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    values = [value for value in TIMELINE if enabled or not value.startswith("deals.")]
    op.create_check_constraint(
        "timeline_action",
        "timeline_event",
        "action IN (" + ",".join(repr(value) for value in values) + ")",
    )


def document_identity(enabled: bool) -> None:
    new_deal = ",NEW.deal_id" if enabled else ""
    old_deal = ",OLD.deal_id" if enabled else ""
    op.execute(f"""CREATE OR REPLACE FUNCTION kay_document_identity_check() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        IF current_setting('kay.synthetic_cleanup',true)='on'
           AND current_database()='kayrealestate_test' THEN RETURN OLD; END IF;
        RAISE EXCEPTION 'DOCUMENT_DELETE_REFUSED' USING ERRCODE='23514';
      END IF;
      IF ROW(NEW.id,NEW.origin_contact_id,NEW.development_id,NEW.property_id{new_deal},
             NEW.filename,NEW.mime_type,NEW.size_bytes,NEW.created_by_user_id,NEW.created_at)
         IS DISTINCT FROM ROW(OLD.id,OLD.origin_contact_id,OLD.development_id,
             OLD.property_id{old_deal},OLD.filename,OLD.mime_type,OLD.size_bytes,
             OLD.created_by_user_id,OLD.created_at)
      OR (NEW.contact_id IS DISTINCT FROM OLD.contact_id AND
          current_setting('kay.document_merge',true) IS DISTINCT FROM 'on') THEN
        RAISE EXCEPTION 'DOCUMENT_IDENTITY_IMMUTABLE' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$""")


def upgrade() -> None:
    for statement in TABLE_SQL:
        op.execute(statement)
    for table in ("audit_event", "timeline_event", "document"):
        op.add_column(table, sa.Column("deal_id", sa.Uuid(), nullable=True))
        op.create_foreign_key(
            f"fk_{table}_deal", table, "deal", ["deal_id"], ["id"], ondelete="RESTRICT"
        )
    op.create_index("ix_document_deal_id", "document", ["deal_id"])
    op.drop_constraint("document_one_parent", "document", type_="check")
    op.create_check_constraint(
        "document_one_parent",
        "document",
        "num_nonnulls(contact_id,development_id,property_id,deal_id)=1",
    )
    actions(True)
    document_identity(True)
    identity_guards()
    consistency_guards()


def identity_guards() -> None:
    op.execute("""CREATE FUNCTION kay_deal_identity_check() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        IF current_database()='kayrealestate_test' AND
           current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN OLD; END IF;
        RAISE EXCEPTION 'DEAL_DELETE_REFUSED' USING ERRCODE='23514';
      END IF;
      IF ROW(NEW.id,NEW.created_by_user_id,NEW.created_at) IS DISTINCT FROM
         ROW(OLD.id,OLD.created_by_user_id,OLD.created_at) THEN
        RAISE EXCEPTION 'DEAL_IDENTITY_IMMUTABLE' USING ERRCODE='23514';
      END IF;
      IF TG_TABLE_NAME='deal' THEN
        IF ROW(NEW.origin_contact_id,NEW.enquiry_id) IS DISTINCT FROM
           ROW(OLD.origin_contact_id,OLD.enquiry_id) OR
           (NEW.contact_id IS DISTINCT FROM OLD.contact_id AND
            current_setting('kay.deal_merge',true) IS DISTINCT FROM 'on') THEN
          RAISE EXCEPTION 'DEAL_IDENTITY_IMMUTABLE' USING ERRCODE='23514';
        END IF;
      ELSIF NEW.deal_id<>OLD.deal_id THEN
        RAISE EXCEPTION 'CUSTOMER_OFFER_PARENT_IMMUTABLE' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$""")
    for table in ("deal", "customer_offer"):
        op.execute(
            f"CREATE TRIGGER {table}_identity_guard BEFORE UPDATE OR DELETE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION kay_deal_identity_check()"
        )
    op.execute(
        "CREATE TRIGGER deal_stage_event_immutable BEFORE UPDATE OR DELETE ON "
        "deal_stage_event FOR EACH ROW EXECUTE FUNCTION kay_history_immutable()"
    )


def consistency_guards() -> None:
    op.execute("""CREATE FUNCTION kay_validate_deal(did uuid) RETURNS void
    LANGUAGE plpgsql AS $$
    BEGIN
      IF EXISTS(SELECT 1 FROM deal d
          LEFT JOIN requirement r ON r.id=d.requirement_id
          LEFT JOIN enquiry e ON e.id=d.enquiry_id
          LEFT JOIN offering o ON o.id=d.offering_id
          WHERE d.id=did AND (r.contact_id<>d.contact_id OR e.contact_id<>d.contact_id
          OR r.intent<>o.kind OR EXISTS(SELECT 1 FROM customer_offer c WHERE c.deal_id=d.id
            AND coalesce(o.kind,r.intent) IS NOT NULL AND
            ((coalesce(o.kind,r.intent)='sale')<>(c.price_period IS NULL))))) THEN
        RAISE EXCEPTION 'INVALID_DEAL_CONTEXT' USING ERRCODE='23514';
      END IF;
      IF EXISTS(SELECT 1 FROM deal d WHERE d.id=did AND NOT EXISTS(
          SELECT 1 FROM deal_stage_event h WHERE h.deal_id=d.id AND h.after_version=d.version
          AND h.to_stage=d.stage AND h.contact_id=d.contact_id AND h.title=d.title
          AND h.next_action=d.next_action AND h.offering_id IS NOT DISTINCT FROM d.offering_id
          AND h.requirement_id IS NOT DISTINCT FROM d.requirement_id)) THEN
        RAISE EXCEPTION 'DEAL_HISTORY_REQUIRED' USING ERRCODE='23514';
      END IF;
      IF EXISTS(SELECT 1 FROM customer_offer c WHERE c.deal_id=did AND NOT EXISTS(
          SELECT 1 FROM deal_stage_event h WHERE h.customer_offer_id=c.id
          AND h.deal_id=c.deal_id AND h.offer_version=c.version AND h.amount_mad=c.amount_mad
          AND h.price_period IS NOT DISTINCT FROM c.price_period AND h.conditions=c.conditions
          AND h.expires_on IS NOT DISTINCT FROM c.expires_on AND h.offer_status=c.status)) THEN
        RAISE EXCEPTION 'CUSTOMER_OFFER_HISTORY_REQUIRED' USING ERRCODE='23514';
      END IF;
    END $$""")
    op.execute("""CREATE FUNCTION kay_deal_consistency_check() RETURNS trigger
    LANGUAGE plpgsql AS $$
    DECLARE did uuid; rid uuid; eid uuid; oid uuid; target uuid;
    BEGIN
      IF current_database()='kayrealestate_test' AND
         current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
      IF TG_TABLE_NAME='deal' THEN did:=NEW.id;
      ELSIF TG_TABLE_NAME IN ('customer_offer','deal_stage_event') THEN did:=NEW.deal_id;
      ELSIF TG_TABLE_NAME='requirement' THEN rid:=NEW.id;
      ELSIF TG_TABLE_NAME='enquiry' THEN eid:=NEW.id;
      ELSE oid:=NEW.id; END IF;
      FOR target IN SELECT d.id FROM deal d WHERE d.id=did OR d.requirement_id=rid
          OR d.enquiry_id=eid OR d.offering_id=oid LOOP
        PERFORM kay_validate_deal(target);
      END LOOP;
      RETURN NULL;
    END $$""")
    for table in (
        "deal",
        "customer_offer",
        "deal_stage_event",
        "requirement",
        "enquiry",
        "offering",
    ):
        op.execute(
            f"CREATE CONSTRAINT TRIGGER {table}_deal_consistency AFTER INSERT OR UPDATE "
            f"ON {table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW "
            "EXECUTE FUNCTION kay_deal_consistency_check()"
        )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT current_database()")) == "kayrealestate":
        raise RuntimeError("DEVELOPMENT_DOWNGRADE_REFUSED")
    if connection.scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM deal) OR "
            "EXISTS(SELECT 1 FROM audit_event WHERE action LIKE 'deals.%') OR "
            "EXISTS(SELECT 1 FROM timeline_event WHERE action LIKE 'deals.%')"
        )
    ):
        raise RuntimeError("DEAL_HISTORY_DOWNGRADE_REFUSED")
    for table in (
        "deal",
        "customer_offer",
        "deal_stage_event",
        "requirement",
        "enquiry",
        "offering",
    ):
        op.execute(f"DROP TRIGGER {table}_deal_consistency ON {table}")
    op.execute("DROP FUNCTION kay_deal_consistency_check()")
    op.execute("DROP FUNCTION kay_validate_deal(uuid)")
    for table in ("deal", "customer_offer"):
        op.execute(f"DROP TRIGGER {table}_identity_guard ON {table}")
    op.execute("DROP FUNCTION kay_deal_identity_check()")
    op.execute("DROP TRIGGER deal_stage_event_immutable ON deal_stage_event")
    actions(False)
    document_identity(False)
    op.drop_constraint("document_one_parent", "document", type_="check")
    op.create_check_constraint(
        "document_one_parent", "document", "num_nonnulls(contact_id,development_id,property_id)=1"
    )
    op.drop_index("ix_document_deal_id", table_name="document")
    for table in ("audit_event", "timeline_event", "document"):
        op.drop_constraint(f"fk_{table}_deal", table, type_="foreignkey")
        op.drop_column(table, "deal_id")
    for table in ("deal_command_receipt", "deal_stage_event", "customer_offer", "deal"):
        op.drop_table(table)
