"""Permanent inventory removal with retained, typed historical identities."""

import sqlalchemy as sa

from alembic import op

revision = "0054_inventory_deletion"
down_revision = "0053_confirmed_visit_reports"
branch_labels = None
depends_on = None

REFERENCES = (
    ("audit_event", "development_id", "development"),
    ("audit_event", "property_id", "property"),
    ("deal_project", "development_id", "development"),
    ("deal_project", "property_id", "property"),
    ("development_owner", "development_id", "development"),
    ("document", "development_id", "development"),
    ("document", "property_id", "property"),
    ("inventory_command_receipt", "development_id", "development"),
    ("inventory_command_receipt", "property_id", "property"),
    ("inventory_event", "development_id", "development"),
    ("inventory_event", "property_id", "property"),
    ("offering", "development_id", "development"),
    ("offering", "property_id", "property"),
    ("project_link", "development_id", "development"),
    ("project_link", "property_id", "property"),
    ("property_owner", "property_id", "property"),
    ("property_period", "property_id", "property"),
    ("task", "property_id", "property"),
    ("visit", "property_id", "property"),
)


PHASE_HISTORY = """
CREATE OR REPLACE FUNCTION kay_development_phase_history_validate() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE current_row development; stored text;
BEGIN
  IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN NULL; END IF;
  SELECT * INTO current_row FROM development WHERE id=NEW.id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT development_phase INTO stored FROM inventory_event
    WHERE development_id=current_row.id AND property_version=current_row.version
    ORDER BY occurred_at DESC,id LIMIT 1;
  IF NOT FOUND OR stored IS DISTINCT FROM current_row.phase THEN
    RAISE EXCEPTION 'DEVELOPMENT_PHASE_HISTORY_REQUIRED' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
"""


def redirect(reverse: bool = False) -> None:
    inspector = sa.inspect(op.get_bind())
    for table, column, parent in REFERENCES:
        previous = parent + "_identity" if reverse else parent
        following = parent if reverse else parent + "_identity"
        constraints = [
            fk
            for fk in inspector.get_foreign_keys(table)
            if fk["constrained_columns"] == [column] and fk["referred_table"] == previous
        ]
        if len(constraints) != 1:
            raise RuntimeError("INVENTORY_REFERENCE_MIGRATION_MISMATCH")
        name = constraints[0]["name"]
        op.drop_constraint(name, table, type_="foreignkey")
        op.create_foreign_key(name, table, following, [column], ["id"], ondelete="RESTRICT")


def upgrade() -> None:
    op.execute("SET LOCAL lock_timeout='3s'")
    for parent in ("property", "development"):
        op.create_table(
            parent + "_identity",
            sa.Column("id", sa.UUID(), primary_key=True),
            sa.Column(
                "created_by_user_id",
                sa.UUID(),
                sa.ForeignKey("user.id", ondelete="RESTRICT"),
                nullable=False,
            ),
            sa.Column("deleted_at", sa.DateTime(timezone=True)),
            sa.Column(
                "snapshot", sa.dialects.postgresql.JSONB(), nullable=False, server_default="{}"
            ),
        )
        source = sa.table(parent, sa.column("id"), sa.column("created_by_user_id"))
        destination = sa.table(
            parent + "_identity", sa.column("id"), sa.column("created_by_user_id")
        )
        op.execute(
            destination.insert().from_select(
                ["id", "created_by_user_id"], sa.select(source.c.id, source.c.created_by_user_id)
            )
        )
    redirect()
    op.execute(PHASE_HISTORY)
    op.create_table(
        "inventory_blob_deletion",
        sa.Column("object_key", sa.UUID(), primary_key=True),
        sa.Column(
            "available_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.String(40)),
    )
    op.execute("""
    CREATE FUNCTION kay_inventory_live_identity() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE removed timestamptz;
    BEGIN
      IF TG_TABLE_NAME='property' THEN
        SELECT deleted_at INTO removed FROM property_identity WHERE id=NEW.id;
        IF removed IS NOT NULL THEN
          RAISE EXCEPTION 'INVENTORY_DELETED' USING ERRCODE='23514';
        END IF;
        INSERT INTO property_identity(id,created_by_user_id)
          VALUES(NEW.id,NEW.created_by_user_id) ON CONFLICT DO NOTHING;
      ELSE
        SELECT deleted_at INTO removed FROM development_identity WHERE id=NEW.id;
        IF removed IS NOT NULL THEN
          RAISE EXCEPTION 'INVENTORY_DELETED' USING ERRCODE='23514';
        END IF;
        INSERT INTO development_identity(id,created_by_user_id)
          VALUES(NEW.id,NEW.created_by_user_id) ON CONFLICT DO NOTHING;
      END IF;
      RETURN NEW;
    END $$;
    CREATE FUNCTION kay_inventory_delete_guard() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF current_setting('kay.synthetic_cleanup',true)='on' THEN RETURN OLD; END IF;
      IF current_setting('kay.inventory_deletion',true) IS DISTINCT FROM OLD.id::text THEN
        RAISE EXCEPTION 'INVENTORY_DELETE_COMMAND_REQUIRED' USING ERRCODE='23514';
      END IF;
      RETURN OLD;
    END $$;
    """)
    for parent in ("property", "development"):
        op.execute(
            f"CREATE TRIGGER {parent}_live_identity BEFORE INSERT ON {parent} "
            "FOR EACH ROW EXECUTE FUNCTION kay_inventory_live_identity()"
        )
        op.execute(
            f"CREATE TRIGGER {parent}_delete_guard BEFORE DELETE ON {parent} "
            "FOR EACH ROW EXECUTE FUNCTION kay_inventory_delete_guard()"
        )


def downgrade() -> None:
    if op.get_bind().scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM property_identity WHERE deleted_at IS NOT NULL "
            "UNION ALL SELECT 1 FROM development_identity WHERE deleted_at IS NOT NULL)"
        )
    ):
        raise RuntimeError("INVENTORY_DELETION_DOWNGRADE_REFUSED")
    op.execute(PHASE_HISTORY.replace("  IF NOT FOUND THEN RETURN NULL; END IF;\n", ""))
    redirect(reverse=True)
    for parent in ("property", "development"):
        op.execute(f"DROP TRIGGER {parent}_live_identity ON {parent}")
        op.execute(f"DROP TRIGGER {parent}_delete_guard ON {parent}")
    op.execute(
        "DROP FUNCTION kay_inventory_live_identity(); DROP FUNCTION kay_inventory_delete_guard()"
    )
    op.drop_table("inventory_blob_deletion")
    op.drop_table("property_identity")
    op.drop_table("development_identity")
