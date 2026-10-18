"""Bind every qualified deal and project set to its immutable revision snapshot."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0024_deal_qualification_history"
down_revision = "0023_lead_deal_qualification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "uq_deal_project_external",
        "deal_project",
        ["deal_id", sa.text("lower(btrim(external_name))")],
        unique=True,
        postgresql_where=sa.text("external_name IS NOT NULL"),
    )
    op.execute("""CREATE FUNCTION kay_validate_deal_qualification(did uuid, required boolean)
    RETURNS void LANGUAGE plpgsql AS $$
    DECLARE d deal%ROWTYPE; actual jsonb; expected jsonb; projects jsonb; BEGIN
      SELECT * INTO d FROM deal WHERE id=did;
      IF NOT FOUND THEN RETURN; END IF;
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'position',p.position,'name',p.name,'development_id',p.development_id,
        'property_id',p.property_id,'external_name',p.external_name) ORDER BY p.position),'[]')
        INTO projects FROM deal_project p WHERE p.deal_id=did;
      IF required AND (d.initial_budget IS NULL OR d.purchase_reasons='[]'::jsonb
        OR jsonb_typeof(d.client_snapshot->'languages') IS DISTINCT FROM 'array'
        OR jsonb_array_length(d.client_snapshot->'languages')=0 OR projects='[]'::jsonb)
      THEN RAISE EXCEPTION 'DEAL_QUALIFICATION_REQUIRED' USING ERRCODE='23514'; END IF;
      SELECT qualification INTO actual FROM deal_stage_event
        WHERE deal_id=did AND after_version=d.version;
      expected:=jsonb_build_object(
        'initial_budget',d.initial_budget,'campaign_source',d.campaign_source,'rating',d.rating,
        'purchase_reasons',d.purchase_reasons,'client_snapshot',d.client_snapshot,
        'notes',d.notes,'payment_method',d.payment_method,'number_of_rooms',d.number_of_rooms,
        'projects',projects);
      IF NOT required AND actual='{}'::jsonb AND expected=jsonb_build_object(
        'initial_budget',NULL,'campaign_source','unknown','rating','cold',
        'purchase_reasons','[]'::jsonb,'client_snapshot','{}'::jsonb,'notes','',
        'payment_method',NULL,'number_of_rooms',NULL,'projects','[]'::jsonb)
      THEN RETURN; END IF;
      IF actual IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'DEAL_QUALIFICATION_HISTORY_REQUIRED' USING ERRCODE='23514';
      END IF;
    END $$""")
    op.execute("""CREATE FUNCTION kay_deal_qualification_check() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN
      IF current_database()='kayrealestate_test' AND
        current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
      IF TG_TABLE_NAME='deal' THEN
        PERFORM kay_validate_deal_qualification(NEW.id,TG_OP='INSERT');
      ELSE
        IF TG_OP<>'INSERT' THEN
          PERFORM kay_validate_deal_qualification(OLD.deal_id,false);
        END IF;
        IF TG_OP<>'DELETE' THEN
          PERFORM kay_validate_deal_qualification(NEW.deal_id,false);
        END IF;
      END IF;
      RETURN NULL;
    END $$""")
    for table in ("deal", "deal_stage_event", "deal_project"):
        operations = "INSERT OR UPDATE OR DELETE" if table == "deal_project" else "INSERT OR UPDATE"
        op.execute(f"""CREATE CONSTRAINT TRIGGER {table}_qualification_consistency
          AFTER {operations} ON {table} DEFERRABLE INITIALLY DEFERRED
          FOR EACH ROW EXECUTE FUNCTION kay_deal_qualification_check()""")


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("QUALIFICATION_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(sa.text("SELECT EXISTS(SELECT 1 FROM deal)")):
        raise RuntimeError("QUALIFICATION_HISTORY_DOWNGRADE_REFUSED")
    for table in ("deal", "deal_stage_event", "deal_project"):
        op.execute(f"DROP TRIGGER {table}_qualification_consistency ON {table}")
    op.execute("DROP FUNCTION kay_deal_qualification_check()")
    op.execute("DROP FUNCTION kay_validate_deal_qualification(uuid,boolean)")
    op.drop_index("uq_deal_project_external", table_name="deal_project")
