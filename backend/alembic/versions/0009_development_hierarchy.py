"""Development structure and target-exclusive campaigns, preserving SP-07 stock."""

import sqlalchemy as sa

from alembic import op

revision = "0009_development_hierarchy"
down_revision = "0008_inventory_finite_amounts"
branch_labels = None
depends_on = None


def ref(name: str, target: str, nullable: bool = False) -> sa.Column[sa.UUID]:
    return sa.Column(name, sa.UUID(), sa.ForeignKey(target, ondelete="RESTRICT"), nullable=nullable)


def upgrade() -> None:
    op.create_table(
        "development",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("reference", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("category", sa.String(20), nullable=False, server_default="mixed"),
        sa.Column("location", sa.String(500)),
        sa.Column("briefing_text", sa.Text()),
        ref("developer_contact_id", "contact.id", True),
        sa.Column("developer_marketing_display", sa.String(160)),
        ref("created_by_user_id", "user.id"),
        sa.Column("version", sa.BigInteger(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "category IN ('mixed','villa','house','apartment','land')", name="development_category"
        ),
        sa.CheckConstraint(
            "reference=upper(btrim(reference)) AND length(reference)>0",
            name="development_reference",
        ),
        sa.CheckConstraint(
            "briefing_text IS NULL OR length(briefing_text)<=10000", name="development_briefing"
        ),
        sa.CheckConstraint("version>0", name="development_version"),
    )
    op.create_index("ix_development_updated_id", "development", ["updated_at", "id"])
    op.create_index("ix_development_developer_contact_id", "development", ["developer_contact_id"])
    op.create_table(
        "development_owner",
        sa.Column("id", sa.UUID(), primary_key=True),
        ref("development_id", "development.id"),
        ref("contact_id", "contact.id"),
        ref("origin_contact_id", "contact.id"),
        sa.Column("marketing_display", sa.String(160)),
        ref("created_by_user_id", "user.id"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
    )
    for col in ("development_id", "contact_id", "origin_contact_id"):
        op.create_index(f"ix_development_owner_{col}", "development_owner", [col])
    op.create_index(
        "uq_development_owner_active",
        "development_owner",
        ["development_id", "contact_id"],
        unique=True,
        postgresql_where=sa.text("archived_at IS NULL"),
    )
    for table, parent, target in (
        ("block", "development_id", "development.id"),
        ("floor", "block_id", "block.id"),
    ):
        op.create_table(
            table,
            sa.Column("id", sa.UUID(), primary_key=True),
            ref(parent, target),
            sa.Column("code", sa.String(40), nullable=False),
            sa.Column("label", sa.String(160), nullable=False),
            sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
            sa.UniqueConstraint(parent, "code", name=f"uq_{table}_code"),
            sa.CheckConstraint("display_order>=0", name=f"{table}_order"),
        )
        op.create_index(f"ix_{table}_{parent}", table, [parent])
    op.create_table(
        "unit_type",
        sa.Column("id", sa.UUID(), primary_key=True),
        ref("development_id", "development.id"),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("label", sa.String(160), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("default_area_sqm", sa.Numeric(18, 2)),
        sa.Column("default_rooms", sa.Integer()),
        sa.UniqueConstraint("development_id", "code", name="uq_unit_type_code"),
        sa.CheckConstraint(
            "category IN ('villa','house','apartment','land')", name="unit_type_category"
        ),
        sa.CheckConstraint(
            "default_area_sqm IS NULL OR (default_area_sqm>0 AND default_area_sqm!='NaN'::numeric)",
            name="unit_type_area",
        ),
        sa.CheckConstraint(
            "default_rooms IS NULL OR default_rooms BETWEEN 1 AND 1000", name="unit_type_rooms"
        ),
    )
    op.create_index("ix_unit_type_development_id", "unit_type", ["development_id"])
    for col, target in (
        ("development_id", "development.id"),
        ("floor_id", "floor.id"),
        ("unit_type_id", "unit_type.id"),
    ):
        op.add_column("property", ref(col, target, True))
        op.create_index(f"ix_property_{col}", "property", [col])
    op.add_column("property", sa.Column("rooms", sa.Integer()))
    op.create_check_constraint(
        "property_rooms", "property", "rooms IS NULL OR rooms BETWEEN 1 AND 1000"
    )
    for table in ("offering", "inventory_event", "inventory_command_receipt"):
        op.alter_column(table, "property_id", nullable=True)
        op.add_column(table, ref("development_id", "development.id", True))
        op.create_index(f"ix_{table}_development_id", table, ["development_id"])
        op.create_check_constraint(
            f"{table}_target_xor", table, "(property_id IS NULL) != (development_id IS NULL)"
        )
    op.create_index(
        "uq_offering_development_current",
        "offering",
        ["development_id", "kind"],
        unique=True,
        postgresql_where=sa.text("is_current"),
    )
    op.add_column("audit_event", ref("development_id", "development.id", True))
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        "action LIKE 'identity.%' OR action LIKE 'users.%' OR action LIKE 'contacts.%' OR "
        "action LIKE 'enquiries.%' OR action LIKE 'properties.%' OR action LIKE "
        "'offerings.%' OR action LIKE 'developments.%'",
    )
    op.execute(
        "CREATE TRIGGER development_owner_origin_immutable BEFORE UPDATE ON "
        "development_owner FOR EACH ROW EXECUTE FUNCTION kay_origin_immutable()"
    )
    op.execute("""
CREATE FUNCTION kay_property_hierarchy_check() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.development_id IS NULL AND (NEW.floor_id IS NOT NULL OR NEW.unit_type_id IS NOT NULL)
        OR NEW.development_id IS NOT NULL AND NEW.category='apartment' AND (NEW.floor_id
        IS NULL OR NEW.unit_type_id IS NULL)
        OR NEW.floor_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM floor f JOIN block b ON
        b.id=f.block_id WHERE f.id=NEW.floor_id AND b.development_id=NEW.development_id)
        OR NEW.unit_type_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM unit_type t WHERE
        t.id=NEW.unit_type_id AND t.development_id=NEW.development_id AND
        t.category=NEW.category)
      THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='INVALID_HIERARCHY'; END IF;
      IF TG_OP='UPDATE' AND (NEW.development_id IS DISTINCT FROM OLD.development_id OR
      NEW.floor_id IS DISTINCT FROM OLD.floor_id OR NEW.unit_type_id IS DISTINCT FROM
      OLD.unit_type_id OR NEW.category<>OLD.category)
        AND EXISTS(SELECT 1 FROM offering WHERE property_id=OLD.id)
      THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='STOCK_REVIEW_REQUIRED'; END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER property_hierarchy_guard BEFORE INSERT OR UPDATE ON property FOR "
        "EACH ROW EXECUTE FUNCTION kay_property_hierarchy_check()"
    )
    op.execute("""
CREATE FUNCTION kay_structure_identity_check() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_TABLE_NAME='block' THEN
        IF NEW.development_id<>OLD.development_id AND EXISTS(SELECT 1 FROM floor WHERE
        block_id=OLD.id)
        THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='STOCK_REVIEW_REQUIRED'; END IF;
      ELSIF TG_TABLE_NAME='floor' THEN
        IF NEW.block_id<>OLD.block_id AND EXISTS(SELECT 1 FROM property WHERE floor_id=OLD.id)
        THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='STOCK_REVIEW_REQUIRED'; END IF;
      ELSE
        IF (NEW.development_id<>OLD.development_id OR NEW.category<>OLD.category) AND
        EXISTS(SELECT 1 FROM property WHERE unit_type_id=OLD.id)
        THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='STOCK_REVIEW_REQUIRED'; END IF;
      END IF;
      RETURN NEW;
    END $$""")
    for table in ("block", "floor", "unit_type"):
        op.execute(
            f"CREATE TRIGGER {table}_identity_guard BEFORE UPDATE ON {table} FOR EACH ROW "
            f"EXECUTE FUNCTION kay_structure_identity_check()"
        )
    op.execute("""
CREATE FUNCTION kay_offering_target_check() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.development_id IS
      DISTINCT FROM OLD.development_id
      THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='STOCK_REVIEW_REQUIRED'; END IF;
      RETURN NEW;
    END $$""")
    op.execute(
        "CREATE TRIGGER offering_target_guard BEFORE UPDATE ON offering FOR EACH ROW "
        "EXECUTE FUNCTION kay_offering_target_check()"
    )
    op.execute("""
CREATE FUNCTION kay_development_availability_check() RETURNS trigger LANGUAGE plpgsql AS
$$
    BEGIN
      IF EXISTS(SELECT 1 FROM offering o JOIN development d ON d.id=o.development_id WHERE
      o.state='available' AND
        (d.archived_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM development_owner po WHERE
        po.development_id=d.id AND po.archived_at IS NULL)
        OR d.category='apartment' AND NOT EXISTS(SELECT 1 FROM property p JOIN floor f ON
        f.id=p.floor_id JOIN block b ON b.id=f.block_id WHERE p.development_id=d.id AND
        b.development_id=d.id AND p.category='apartment')))
      THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='INVALID_MARKETABLE_DEVELOPMENT'; END IF;
      IF EXISTS(SELECT 1 FROM development_owner po JOIN contact c ON c.id=po.contact_id
      WHERE po.archived_at IS NULL AND c.merged_into_contact_id IS NOT NULL)
        OR EXISTS(SELECT 1 FROM development d JOIN contact c ON
        c.id=d.developer_contact_id WHERE c.merged_into_contact_id IS NOT NULL)
      THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='DEVELOPMENT_CONTACT_ALIAS'; END IF;
      IF EXISTS(SELECT 1 FROM development d WHERE d.archived_at IS NOT NULL AND
      (EXISTS(SELECT 1 FROM property p WHERE p.development_id=d.id) OR EXISTS(SELECT 1
      FROM offering o WHERE o.development_id=d.id AND o.is_current)))
      THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='STOCK_REVIEW_REQUIRED'; END IF;
      RETURN NULL;
    END $$""")
    for table in (
        "development",
        "development_owner",
        "property",
        "offering",
        "floor",
        "block",
        "unit_type",
    ):
        op.execute(
            f"CREATE CONSTRAINT TRIGGER {table}_development_guard AFTER INSERT OR UPDATE OR "
            f"DELETE ON {table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "
            f"kay_development_availability_check()"
        )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT current_database()")) == "kayrealestate":
        raise RuntimeError("DEVELOPMENT_DOWNGRADE_REFUSED")
    if connection.scalar(sa.text("SELECT EXISTS(SELECT 1 FROM development)")):
        raise RuntimeError("DEVELOPMENT_HISTORY_DOWNGRADE_REFUSED")
    for table in (
        "development",
        "development_owner",
        "property",
        "offering",
        "floor",
        "block",
        "unit_type",
    ):
        op.execute(f"DROP TRIGGER {table}_development_guard ON {table}")
    op.execute("DROP FUNCTION kay_development_availability_check()")
    op.execute("DROP TRIGGER property_hierarchy_guard ON property")
    op.execute("DROP FUNCTION kay_property_hierarchy_check()")
    op.execute("DROP TRIGGER offering_target_guard ON offering")
    op.execute("DROP FUNCTION kay_offering_target_check()")
    for table in ("block", "floor", "unit_type"):
        op.execute(f"DROP TRIGGER {table}_identity_guard ON {table}")
    op.execute("DROP FUNCTION kay_structure_identity_check()")
    op.drop_column("audit_event", "development_id")
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        "action LIKE 'identity.%' OR action LIKE 'users.%' OR action LIKE 'contacts.%' OR "
        "action LIKE 'enquiries.%' OR action LIKE 'properties.%' OR action LIKE "
        "'offerings.%'",
    )
    op.drop_index("uq_offering_development_current", "offering")
    for table in ("offering", "inventory_event", "inventory_command_receipt"):
        op.drop_constraint(f"{table}_target_xor", table, type_="check")
        op.drop_column(table, "development_id")
        op.alter_column(table, "property_id", nullable=False)
    op.drop_constraint("property_rooms", "property", type_="check")
    for col in ("rooms", "unit_type_id", "floor_id", "development_id"):
        op.drop_column("property", col)
    for table in ("unit_type", "floor", "block", "development_owner", "development"):
        op.drop_table(table)
