"""Append-only finance facts, derived balances and transactional reopen review."""

# ruff: noqa: E501

import sqlalchemy as sa

from alembic import op

revision = "0018_commissions_collections"
down_revision = "0017_tasks_reminders"
branch_labels = None
depends_on = None


def reference(
    name: str, target: str, *, nullable: bool = False, primary: bool = False, unique: bool = False
) -> sa.Column:
    return sa.Column(
        name,
        sa.Uuid(),
        sa.ForeignKey(target, ondelete="RESTRICT"),
        nullable=nullable,
        primary_key=primary,
        unique=unique,
    )


def upgrade() -> None:
    op.create_table(
        "commission",
        sa.Column("id", sa.Uuid(), primary_key=True),
        reference("deal_id", "deal.id"),
        sa.Column("version", sa.BigInteger(), nullable=False),
        reference("created_by_user_id", "user.id"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("version>0", name="commission_version"),
    )
    op.create_index("ix_commission_deal_id", "commission", ["deal_id"])
    op.create_table(
        "receipt",
        sa.Column("id", sa.Uuid(), primary_key=True),
        reference("commission_id", "commission.id"),
        reference("supersedes_id", "receipt.id", nullable=True, unique=True),
        sa.Column("amount_mad", sa.Numeric(18, 2)),
        sa.Column("received_on", sa.Date(), nullable=False),
        reference("evidence_document_id", "document.id", nullable=True),
        reference("evidence_version_id", "document_version.id", nullable=True),
        sa.Column("reason", sa.String(1000), nullable=False),
        reference("actor_user_id", "user.id"),
        sa.Column("actor_name", sa.String(160), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "amount_mad IS NULL OR (amount_mad>0 AND amount_mad<'Infinity'::numeric)",
            name="receipt_positive_finite",
        ),
        sa.CheckConstraint(
            "supersedes_id IS NOT NULL OR amount_mad IS NOT NULL",
            name="receipt_void_correction_only",
        ),
        sa.CheckConstraint("length(btrim(reason)) BETWEEN 1 AND 1000", name="receipt_reason"),
        sa.CheckConstraint(
            "(evidence_document_id IS NULL)=(evidence_version_id IS NULL)",
            name="receipt_evidence_pair",
        ),
    )
    op.create_index("ix_receipt_commission_date", "receipt", ["commission_id", "received_on", "id"])
    op.create_table(
        "commission_revision",
        sa.Column("id", sa.Uuid(), primary_key=True),
        reference("commission_id", "commission.id"),
        sa.Column("version", sa.BigInteger(), nullable=False),
        reference("previous_revision_id", "commission_revision.id", nullable=True, unique=True),
        sa.Column("kind", sa.String(12), nullable=False),
        sa.Column("base_mad", sa.Numeric(24, 8), nullable=False),
        sa.Column("rate_percent", sa.Numeric(12, 8)),
        sa.Column("amount_mad", sa.Numeric(18, 2), nullable=False),
        sa.Column("due_on", sa.Date()),
        sa.Column("state", sa.String(12), nullable=False),
        sa.Column("review_required", sa.Boolean(), nullable=False),
        sa.Column("action", sa.String(24), nullable=False),
        sa.Column("reason", sa.String(1000), nullable=False),
        reference("actor_user_id", "user.id"),
        sa.Column("actor_name", sa.String(160), nullable=False),
        reference("receipt_id", "receipt.id", nullable=True, unique=True),
        reference("reopening_id", "deal_reopening.id", nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("version>0", name="commission_revision_version"),
        sa.CheckConstraint("state IN ('expected','recognized')", name="commission_revision_state"),
        sa.CheckConstraint(
            "action IN ('created','recognized','commission_corrected','receipt','receipt_corrected','reopen_review')",
            name="commission_revision_action",
        ),
        sa.CheckConstraint(
            "base_mad>0 AND base_mad<'Infinity'::numeric AND amount_mad>0 AND amount_mad<'Infinity'::numeric",
            name="commission_revision_finite",
        ),
        sa.CheckConstraint(
            "(kind='fixed' AND rate_percent IS NULL) OR (kind='percentage' AND rate_percent>0 AND rate_percent<'Infinity'::numeric AND amount_mad=round(base_mad*rate_percent/100,2))",
            name="commission_revision_calculation",
        ),
        sa.CheckConstraint(
            "(version=1)=(previous_revision_id IS NULL)", name="commission_revision_previous"
        ),
    )
    op.create_index(
        "uq_commission_revision_version",
        "commission_revision",
        ["commission_id", "version"],
        unique=True,
    )
    op.create_table(
        "finance_command_receipt",
        reference("actor_id", "user.id", primary=True),
        sa.Column("route", sa.String(120), primary_key=True),
        sa.Column("key", sa.Uuid(), primary_key=True),
        reference("commission_id", "commission.id"),
        sa.Column("request_hash", sa.LargeBinary(32), nullable=False),
        sa.Column(
            "result",
            sa.JSON().with_variant(sa.dialects.postgresql.JSONB(), "postgresql"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("octet_length(request_hash)=32", name="finance_receipt_hash"),
    )
    guards()


def guards() -> None:
    op.execute("""
    CREATE FUNCTION kay_finance_guard() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE parent receipt%ROWTYPE; prior commission_revision%ROWTYPE; target_deal uuid; target_contact uuid;
    BEGIN
      IF current_setting('kay.synthetic_cleanup',true)='on' THEN IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCE_RETAINED' USING ERRCODE='23514'; END IF;
      IF TG_OP='UPDATE' THEN
        IF TG_TABLE_NAME<>'commission' THEN RAISE EXCEPTION 'FINANCE_IMMUTABLE' USING ERRCODE='23514'; END IF;
        IF (to_jsonb(NEW)-'version') IS DISTINCT FROM (to_jsonb(OLD)-'version') OR NEW.version<>OLD.version+1
          THEN RAISE EXCEPTION 'FINANCE_IMMUTABLE' USING ERRCODE='23514'; END IF;
        RETURN NEW;
      END IF;
      IF TG_TABLE_NAME='receipt' THEN
        PERFORM 1 FROM commission WHERE id=NEW.commission_id FOR UPDATE;
        IF NEW.supersedes_id IS NOT NULL THEN
          SELECT * INTO parent FROM receipt WHERE id=NEW.supersedes_id;
          IF NOT FOUND OR parent.commission_id<>NEW.commission_id OR parent.id=NEW.id
            THEN RAISE EXCEPTION 'FINANCE_RECEIPT_CHAIN' USING ERRCODE='23514'; END IF;
        END IF;
        IF NEW.evidence_document_id IS NOT NULL THEN
          SELECT d.id,d.contact_id INTO target_deal,target_contact FROM deal d JOIN commission c ON c.deal_id=d.id WHERE c.id=NEW.commission_id;
          IF NOT EXISTS(SELECT 1 FROM document d JOIN document_version v ON v.document_id=d.id
             WHERE d.id=NEW.evidence_document_id AND v.id=NEW.evidence_version_id AND v.state='clean' AND d.archived_at IS NULL
             AND (d.deal_id=target_deal OR d.contact_id=target_contact))
            THEN RAISE EXCEPTION 'FINANCE_EVIDENCE' USING ERRCODE='23514'; END IF;
        END IF;
      ELSIF TG_TABLE_NAME='commission_revision' AND NEW.previous_revision_id IS NOT NULL THEN
        SELECT * INTO prior FROM commission_revision WHERE id=NEW.previous_revision_id;
        IF NOT FOUND OR prior.commission_id<>NEW.commission_id OR prior.version<>NEW.version-1
          OR (prior.state='recognized' AND NEW.state<>'recognized')
          THEN RAISE EXCEPTION 'FINANCE_REVISION_CHAIN' USING ERRCODE='23514'; END IF;
        IF NEW.action IN ('receipt','receipt_corrected','reopen_review','recognized') AND
          (NEW.kind,NEW.base_mad,NEW.rate_percent,NEW.amount_mad,NEW.due_on) IS DISTINCT FROM
          (prior.kind,prior.base_mad,prior.rate_percent,prior.amount_mad,prior.due_on)
          THEN RAISE EXCEPTION 'FINANCE_TERMS_CHANGED' USING ERRCODE='23514'; END IF;
        IF (NEW.action='recognized') IS DISTINCT FROM (prior.state='expected' AND NEW.state='recognized')
          THEN RAISE EXCEPTION 'FINANCE_RECOGNITION_REQUIRED' USING ERRCODE='23514'; END IF;
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER commission_guard BEFORE UPDATE OR DELETE ON commission FOR EACH ROW EXECUTE FUNCTION kay_finance_guard();
    CREATE TRIGGER revision_guard BEFORE INSERT OR UPDATE OR DELETE ON commission_revision FOR EACH ROW EXECUTE FUNCTION kay_finance_guard();
    CREATE TRIGGER receipt_guard BEFORE INSERT OR UPDATE OR DELETE ON receipt FOR EACH ROW EXECUTE FUNCTION kay_finance_guard();

    CREATE FUNCTION kay_finance_validate() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE cid uuid; c commission%ROWTYPE; h commission_revision%ROWTYPE; total numeric;
    BEGIN
      IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
      IF TG_TABLE_NAME='commission' THEN cid:=NEW.id; ELSE cid:=NEW.commission_id; END IF;
      SELECT * INTO c FROM commission WHERE id=cid FOR UPDATE;
      SELECT * INTO h FROM commission_revision WHERE commission_id=cid AND version=c.version;
      IF NOT FOUND OR (SELECT count(*) FROM commission_revision WHERE commission_id=cid)<>c.version
        OR NOT EXISTS(SELECT 1 FROM commission_revision WHERE commission_id=cid AND version=1 AND action='created' AND state='expected' AND actor_user_id=c.created_by_user_id AND NOT review_required)
        OR EXISTS(SELECT 1 FROM commission_revision r LEFT JOIN receipt p ON p.id=r.receipt_id LEFT JOIN deal_reopening d ON d.id=r.reopening_id
          WHERE r.commission_id=cid AND (
           ((r.action IN ('receipt','receipt_corrected')) IS DISTINCT FROM (r.receipt_id IS NOT NULL))
           OR (r.receipt_id IS NOT NULL AND (p.commission_id<>cid OR p.actor_user_id<>r.actor_user_id OR (r.action='receipt') IS DISTINCT FROM (p.supersedes_id IS NULL)))
           OR ((r.action='reopen_review') IS DISTINCT FROM (r.reopening_id IS NOT NULL))
           OR (r.reopening_id IS NOT NULL AND (d.deal_id<>c.deal_id OR d.actor_user_id<>r.actor_user_id OR NOT r.review_required))
           OR (r.action IN ('commission_corrected','receipt_corrected') AND length(btrim(r.reason))=0)))
        OR EXISTS(SELECT 1 FROM receipt p WHERE p.commission_id=cid AND NOT EXISTS(SELECT 1 FROM commission_revision r WHERE r.receipt_id=p.id))
        THEN RAISE EXCEPTION 'FINANCE_HISTORY_REQUIRED' USING ERRCODE='23514'; END IF;
      SELECT coalesce(sum(p.amount_mad),0) INTO total FROM receipt p WHERE p.commission_id=cid AND NOT EXISTS(SELECT 1 FROM receipt n WHERE n.supersedes_id=p.id);
      IF (h.state='expected' AND EXISTS(SELECT 1 FROM receipt WHERE commission_id=cid)) OR total>h.amount_mad
        THEN RAISE EXCEPTION 'FINANCE_BALANCE_EXCEEDED' USING ERRCODE='23514'; END IF;
      RETURN NULL;
    END $$;
    CREATE CONSTRAINT TRIGGER commission_consistent AFTER INSERT OR UPDATE ON commission DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_finance_validate();
    CREATE CONSTRAINT TRIGGER revision_consistent AFTER INSERT ON commission_revision DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_finance_validate();
    CREATE CONSTRAINT TRIGGER receipt_consistent AFTER INSERT ON receipt DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kay_finance_validate();

    CREATE FUNCTION kay_finance_reopen() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE c commission%ROWTYPE; h commission_revision%ROWTYPE;
    BEGIN
      FOR c IN SELECT * FROM commission WHERE deal_id=NEW.deal_id ORDER BY id FOR UPDATE LOOP
        SELECT * INTO STRICT h FROM commission_revision WHERE commission_id=c.id AND version=c.version;
        UPDATE commission SET version=version+1 WHERE id=c.id;
        INSERT INTO commission_revision(id,commission_id,version,previous_revision_id,kind,base_mad,rate_percent,amount_mad,due_on,state,review_required,action,reason,actor_user_id,actor_name,reopening_id)
          VALUES(gen_random_uuid(),c.id,c.version+1,h.id,h.kind,h.base_mad,h.rate_percent,h.amount_mad,h.due_on,h.state,true,'reopen_review',NEW.reason,NEW.actor_user_id,NEW.actor_name,NEW.id);
        INSERT INTO audit_event(id,actor_user_id,deal_id,action,deployment_version) VALUES(gen_random_uuid(),NEW.actor_user_id,NEW.deal_id,'deals.finance.reopen_review','0.1.0');
      END LOOP;
      RETURN NEW;
    END $$;
    CREATE TRIGGER deal_financial_review AFTER INSERT ON deal_reopening FOR EACH ROW EXECUTE FUNCTION kay_finance_reopen();
    """)


def downgrade() -> None:
    if op.get_bind().scalar(
        sa.text("SELECT current_database()='kayrealestate' OR EXISTS(SELECT 1 FROM commission)")
    ):
        raise RuntimeError("FINANCIAL_HISTORY_DOWNGRADE_REFUSED")
    op.execute("DROP TRIGGER deal_financial_review ON deal_reopening")
    for table in ("finance_command_receipt", "commission_revision", "receipt", "commission"):
        op.drop_table(table)
    for function in ("kay_finance_reopen", "kay_finance_validate", "kay_finance_guard"):
        op.execute(f"DROP FUNCTION {function}()")
