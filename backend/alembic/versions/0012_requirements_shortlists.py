"""Independent contact searches and precise offering shortlists, without stock mutation."""

import sqlalchemy as sa

from alembic import op

revision = "0012_requirements_shortlists"
down_revision = "0011_file_session_binding"
branch_labels = None
depends_on = None


def action_constraints(enabled: bool) -> None:
    families = [
        "identity",
        "users",
        "contacts",
        "enquiries",
        "properties",
        "offerings",
        "developments",
        "documents",
    ]
    timeline = [
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
    ]
    if enabled:
        families.append("requirements")
        timeline += [
            "requirements.created",
            "requirements.updated",
            "requirements.shortlisted",
            "requirements.unshortlisted",
        ]
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        " OR ".join(f"action LIKE '{p}.%'" for p in families),
    )
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    op.create_check_constraint(
        "timeline_action",
        "timeline_event",
        "action IN (" + ",".join(repr(a) for a in timeline) + ")",
    )


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE requirement (
        id UUID NOT NULL,
        contact_id UUID NOT NULL,
        origin_contact_id UUID NOT NULL,
        title VARCHAR(160) NOT NULL,
        intent VARCHAR(8) NOT NULL,
        currency VARCHAR(3) DEFAULT 'MAD' NOT NULL,
        budget_min_mad NUMERIC(18, 2),
        budget_max_mad NUMERIC(18, 2),
        budget_period VARCHAR(5),
        version BIGINT DEFAULT '1' NOT NULL,
        created_by_user_id UUID NOT NULL,
        updated_by_user_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT requirement_intent CHECK (intent IN ('sale','rental')),
        CONSTRAINT requirement_currency CHECK (currency='MAD'),
        CONSTRAINT requirement_title CHECK (length(btrim(title)) > 0),
        CONSTRAINT requirement_version CHECK (version > 0),
        CONSTRAINT requirement_period CHECK ((intent='sale' AND budget_period IS NULL) OR
        (intent='rental' AND budget_period IS NOT NULL AND budget_period IN
        ('month','year'))),
        CONSTRAINT requirement_min CHECK (budget_min_mad IS NULL OR (budget_min_mad > 0 AND
        budget_min_mad != 'NaN'::numeric)),
        CONSTRAINT requirement_max CHECK (budget_max_mad IS NULL OR (budget_max_mad > 0 AND
        budget_max_mad != 'NaN'::numeric)),
        CONSTRAINT requirement_range CHECK (budget_min_mad IS NULL OR budget_max_mad IS NULL
        OR budget_min_mad <= budget_max_mad),
        FOREIGN KEY(contact_id) REFERENCES contact (id) ON DELETE RESTRICT,
        FOREIGN KEY(origin_contact_id) REFERENCES contact (id) ON DELETE RESTRICT,
        FOREIGN KEY(created_by_user_id) REFERENCES "user" (id) ON DELETE RESTRICT,
        FOREIGN KEY(updated_by_user_id) REFERENCES "user" (id) ON DELETE RESTRICT
        )
        """
    )
    op.execute(
        """
        CREATE TABLE requirement_criterion (
        requirement_id UUID NOT NULL,
        key VARCHAR(16) NOT NULL,
        importance VARCHAR(10) NOT NULL,
        value_text VARCHAR(500),
        value_number NUMERIC(18, 2),
        value_bool BOOLEAN,
        PRIMARY KEY (requirement_id, key),
        CONSTRAINT criterion_importance CHECK (importance IN ('required','preferred')),
        CONSTRAINT criterion_key CHECK (key IN
        ('category','location','area_sqm','rooms','parking','elevator')),
        CONSTRAINT criterion_one_value CHECK (num_nonnulls(value_text,value_number,value_bool)
        <= 1),
        CONSTRAINT criterion_typed_value CHECK ((key='category' AND value_number IS NULL AND
        value_bool IS NULL AND (value_text IS NULL OR value_text IN
        ('villa','house','apartment','land'))) OR (key='location' AND value_number IS NULL AND
        value_bool IS NULL AND (value_text IS NULL OR length(btrim(value_text))>0)) OR (key IN
        ('area_sqm','rooms') AND value_text IS NULL AND value_bool IS NULL AND (value_number
        IS NULL OR (value_number>0 AND value_number!='NaN'::numeric AND (key<>'rooms' OR
        (value_number=trunc(value_number) AND value_number<=1000))))) OR (key IN
        ('parking','elevator') AND value_text IS NULL AND value_number IS NULL)),
        FOREIGN KEY(requirement_id) REFERENCES requirement (id) ON DELETE RESTRICT
        )
        """
    )
    op.execute(
        """
        CREATE TABLE shortlist_entry (
        requirement_id UUID NOT NULL,
        offering_id UUID NOT NULL,
        feedback VARCHAR(2000),
        created_by_user_id UUID NOT NULL,
        updated_by_user_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (requirement_id, offering_id),
        FOREIGN KEY(requirement_id) REFERENCES requirement (id) ON DELETE RESTRICT,
        FOREIGN KEY(offering_id) REFERENCES offering (id) ON DELETE RESTRICT,
        FOREIGN KEY(created_by_user_id) REFERENCES "user" (id) ON DELETE RESTRICT,
        FOREIGN KEY(updated_by_user_id) REFERENCES "user" (id) ON DELETE RESTRICT
        )
        """
    )
    op.execute(
        """
        CREATE TABLE requirement_command_receipt (
        actor_id UUID NOT NULL,
        route VARCHAR(160) NOT NULL,
        key UUID NOT NULL,
        request_hash BYTEA NOT NULL,
        requirement_id UUID NOT NULL,
        result_version BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (actor_id, route, key),
        CONSTRAINT requirement_receipt_valid CHECK (result_version>0 AND
        octet_length(request_hash)=32),
        FOREIGN KEY(actor_id) REFERENCES "user" (id) ON DELETE RESTRICT,
        FOREIGN KEY(requirement_id) REFERENCES requirement (id) ON DELETE RESTRICT
        )
        """
    )
    op.execute("CREATE INDEX ix_requirement_contact_id ON requirement (contact_id)")
    op.execute("CREATE INDEX ix_requirement_origin_contact_id ON requirement (origin_contact_id)")
    op.execute(
        "CREATE INDEX ix_requirement_command_receipt_requirement_id ON "
        "requirement_command_receipt (requirement_id)"
    )
    action_constraints(True)
    op.execute("""CREATE FUNCTION kay_requirement_identity_check()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP='DELETE' THEN
        IF current_setting('kay.synthetic_cleanup',true)='on'
           AND current_database()='kayrealestate_test' THEN RETURN OLD; END IF;
        RAISE EXCEPTION 'REQUIREMENT_DELETE_REFUSED' USING ERRCODE='23514';
      END IF;
      IF ROW(NEW.id,NEW.origin_contact_id,NEW.created_by_user_id,NEW.created_at)
         IS DISTINCT FROM ROW(OLD.id,OLD.origin_contact_id,OLD.created_by_user_id,OLD.created_at)
         OR (NEW.contact_id IS DISTINCT FROM OLD.contact_id AND
             current_setting('kay.requirement_merge',true) IS DISTINCT FROM 'on') THEN
        RAISE EXCEPTION 'REQUIREMENT_IDENTITY_IMMUTABLE' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER requirement_identity_guard BEFORE UPDATE OR DELETE ON "
        "requirement FOR EACH ROW EXECUTE FUNCTION kay_requirement_identity_check()"
    )
    op.execute("""CREATE FUNCTION kay_shortlist_identity_check()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF ROW(NEW.requirement_id,NEW.offering_id,NEW.created_by_user_id,NEW.created_at)
         IS DISTINCT FROM ROW(OLD.requirement_id,OLD.offering_id,
             OLD.created_by_user_id,OLD.created_at) THEN
        RAISE EXCEPTION 'SHORTLIST_IDENTITY_IMMUTABLE' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER shortlist_identity_guard BEFORE UPDATE ON shortlist_entry FOR "
        "EACH ROW EXECUTE FUNCTION kay_shortlist_identity_check()"
    )
    op.execute("""CREATE FUNCTION kay_shortlist_intent_check()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE rid uuid; oid uuid;
    BEGIN
      IF TG_TABLE_NAME='requirement' THEN rid:=NEW.id;
      ELSIF TG_TABLE_NAME='offering' THEN oid:=NEW.id;
      ELSE rid:=NEW.requirement_id; oid:=NEW.offering_id; END IF;
      IF EXISTS(SELECT 1 FROM shortlist_entry s JOIN requirement r ON r.id=s.requirement_id
          JOIN offering o ON o.id=s.offering_id
          WHERE (rid IS NULL OR r.id=rid) AND (oid IS NULL OR o.id=oid) AND r.intent<>o.kind) THEN
        RAISE EXCEPTION 'OFFERING_INTENT_MISMATCH' USING ERRCODE='23514';
      END IF;
      RETURN NULL;
    END $$""")
    for table in ("requirement", "offering", "shortlist_entry"):
        op.execute(
            f"CREATE CONSTRAINT TRIGGER {table}_shortlist_intent AFTER INSERT OR UPDATE ON {table} "
            "DEFERRABLE INITIALLY DEFERRED FOR EACH ROW "
            "EXECUTE FUNCTION kay_shortlist_intent_check()"
        )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT current_database()")) == "kayrealestate":
        raise RuntimeError("DEVELOPMENT_DOWNGRADE_REFUSED")
    if connection.scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM requirement) OR EXISTS(SELECT 1 FROM audit_event "
            "WHERE action LIKE 'requirements.%') OR EXISTS(SELECT 1 FROM timeline_event "
            "WHERE action LIKE 'requirements.%')"
        )
    ):
        raise RuntimeError("REQUIREMENT_HISTORY_DOWNGRADE_REFUSED")
    for table in ("requirement", "offering", "shortlist_entry"):
        op.execute(f"DROP TRIGGER {table}_shortlist_intent ON {table}")
    op.execute("DROP FUNCTION kay_shortlist_intent_check()")
    op.execute("DROP TRIGGER shortlist_identity_guard ON shortlist_entry")
    op.execute("DROP FUNCTION kay_shortlist_identity_check()")
    op.execute("DROP TRIGGER requirement_identity_guard ON requirement")
    op.execute("DROP FUNCTION kay_requirement_identity_check()")
    for table in (
        "requirement_command_receipt",
        "shortlist_entry",
        "requirement_criterion",
        "requirement",
    ):
        op.drop_table(table)
    action_constraints(False)
