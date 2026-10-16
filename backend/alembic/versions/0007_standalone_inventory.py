"""Standalone physical assets, campaigns and append-only availability history."""

import sqlalchemy as sa

from alembic import op

revision = "0007_standalone_inventory"
down_revision = "0006_ownership_scope_guard"
branch_labels = None
depends_on = None


def ref(name: str, target: str, *, nullable: bool = False) -> sa.Column[sa.UUID]:
    return sa.Column(name, sa.UUID(), sa.ForeignKey(target, ondelete="RESTRICT"), nullable=nullable)


def upgrade() -> None:
    op.create_table(
        "property",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("reference", sa.String(80), nullable=False, unique=True),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("marketing_name", sa.String(160)),
        sa.Column("location", sa.String(500)),
        sa.Column("area_sqm", sa.Numeric(18, 2)),
        ref("created_by_user_id", "user.id"),
        sa.Column("version", sa.BigInteger(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "category IN ('villa','house','apartment','land')", name="property_category"
        ),
        sa.CheckConstraint(
            "reference = upper(btrim(reference)) AND length(reference) > 0",
            name="property_reference",
        ),
        sa.CheckConstraint("area_sqm IS NULL OR area_sqm > 0", name="property_area"),
        sa.CheckConstraint("version > 0", name="property_version"),
    )
    op.create_index("ix_property_updated_id", "property", ["updated_at", "id"])
    op.create_table(
        "property_owner",
        sa.Column("id", sa.UUID(), primary_key=True),
        ref("property_id", "property.id"),
        ref("contact_id", "contact.id"),
        ref("origin_contact_id", "contact.id"),
        sa.Column("marketing_display", sa.String(160)),
        ref("created_by_user_id", "user.id"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
    )
    for column in ("property_id", "contact_id", "origin_contact_id"):
        op.create_index(f"ix_property_owner_{column}", "property_owner", [column])
    op.create_index(
        "uq_property_owner_active",
        "property_owner",
        ["property_id", "contact_id"],
        unique=True,
        postgresql_where=sa.text("archived_at IS NULL"),
    )
    op.create_table(
        "offering",
        sa.Column("id", sa.UUID(), primary_key=True),
        ref("property_id", "property.id"),
        sa.Column("kind", sa.String(10), nullable=False),
        sa.Column("price_mad", sa.Numeric(18, 2)),
        sa.Column("currency", sa.String(3), nullable=False, server_default="MAD"),
        sa.Column("price_period", sa.String(10)),
        sa.Column("conditions", sa.String(2000), nullable=False, server_default=""),
        sa.Column("state", sa.String(12), nullable=False, server_default="draft"),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("availability_confirmed_at", sa.DateTime(timezone=True)),
        sa.Column("version", sa.BigInteger(), nullable=False, server_default="1"),
        ref("created_by_user_id", "user.id"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("kind IN ('sale','rental')", name="offering_kind"),
        sa.CheckConstraint("state IN ('draft','available','withdrawn')", name="offering_state"),
        sa.CheckConstraint("currency = 'MAD'", name="offering_currency"),
        sa.CheckConstraint("price_mad IS NULL OR price_mad > 0", name="offering_price"),
        sa.CheckConstraint(
            "(kind = 'sale' AND price_period IS NULL) OR (kind = 'rental' "
            "AND price_period IN ('month','year') AND price_period IS NOT NULL)",
            name="offering_period",
        ),
        sa.CheckConstraint(
            "(state = 'withdrawn') = (NOT is_current)", name="offering_current_state"
        ),
        sa.CheckConstraint(
            "state != 'available' OR (price_mad > 0 AND price_mad IS NOT NULL "
            "AND availability_confirmed_at IS NOT NULL)",
            name="offering_available_price",
        ),
        sa.CheckConstraint("version > 0", name="offering_version"),
    )
    op.create_index("ix_offering_property_id", "offering", ["property_id"])
    op.create_index(
        "uq_offering_current",
        "offering",
        ["property_id", "kind"],
        unique=True,
        postgresql_where=sa.text("is_current"),
    )
    op.create_table(
        "inventory_event",
        sa.Column("id", sa.UUID(), primary_key=True),
        ref("property_id", "property.id"),
        ref("offering_id", "offering.id", nullable=True),
        ref("actor_user_id", "user.id"),
        sa.Column("actor_display_name", sa.String(160), nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("property_version", sa.BigInteger(), nullable=False),
        sa.Column("offering_version", sa.BigInteger()),
        sa.Column("state", sa.String(12)),
        sa.Column("price_mad", sa.Numeric(18, 2)),
        sa.Column("price_period", sa.String(10)),
        sa.Column("conditions", sa.String(2000)),
        sa.Column("reason", sa.String(1000), nullable=False, server_default=""),
        sa.Column(
            "occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_inventory_event_property_time", "inventory_event", ["property_id", "occurred_at", "id"]
    )
    op.create_table(
        "inventory_command_receipt",
        ref("actor_id", "user.id"),
        sa.Column("route", sa.String(120), nullable=False),
        sa.Column("key", sa.UUID(), nullable=False),
        sa.Column("request_hash", sa.LargeBinary(32), nullable=False),
        ref("property_id", "property.id"),
        ref("offering_id", "offering.id", nullable=True),
        ref("event_id", "inventory_event.id"),
        sa.Column("version", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("actor_id", "route", "key"),
    )
    op.create_index(
        "ix_inventory_command_receipt_created_at", "inventory_command_receipt", ["created_at"]
    )
    op.add_column("audit_event", ref("property_id", "property.id", nullable=True))
    op.add_column("audit_event", ref("offering_id", "offering.id", nullable=True))
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        "action LIKE 'identity.%' OR action LIKE 'users.%' OR action LIKE 'contacts.%' "
        "OR action LIKE 'enquiries.%' OR action LIKE 'properties.%' OR action LIKE 'offerings.%'",
    )
    op.execute(
        "CREATE TRIGGER inventory_event_immutable BEFORE UPDATE OR DELETE ON inventory_event "
        "FOR EACH ROW EXECUTE FUNCTION kay_history_immutable()"
    )
    op.execute(
        "CREATE TRIGGER property_owner_origin_immutable BEFORE UPDATE ON property_owner "
        "FOR EACH ROW EXECUTE FUNCTION kay_origin_immutable()"
    )
    op.execute("""CREATE FUNCTION kay_inventory_availability_check()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE pid uuid;
    BEGIN
      IF TG_OP='DELETE' THEN pid:=OLD.property_id; ELSE pid:=NEW.property_id; END IF;
      PERFORM id FROM property WHERE id=pid FOR UPDATE;
      IF EXISTS(SELECT 1 FROM offering WHERE property_id=pid AND state='available')
        AND NOT EXISTS(SELECT 1 FROM property_owner
          WHERE property_id=pid AND archived_at IS NULL)
      THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='AVAILABLE_OWNER_REQUIRED'; END IF;
      IF EXISTS(SELECT 1 FROM property_owner po JOIN contact c ON c.id=po.contact_id
        WHERE po.property_id=pid AND po.archived_at IS NULL
          AND c.merged_into_contact_id IS NOT NULL)
      THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='OWNER_MERGE_ALIAS'; END IF;
      RETURN NULL;
    END $$""")
    op.execute(
        "CREATE CONSTRAINT TRIGGER offering_availability_guard AFTER INSERT OR UPDATE OR DELETE "
        "ON offering DEFERRABLE INITIALLY DEFERRED FOR EACH ROW "
        "EXECUTE FUNCTION kay_inventory_availability_check()"
    )
    op.execute(
        "CREATE CONSTRAINT TRIGGER owner_availability_guard AFTER INSERT OR UPDATE OR DELETE "
        "ON property_owner DEFERRABLE INITIALLY DEFERRED FOR EACH ROW "
        "EXECUTE FUNCTION kay_inventory_availability_check()"
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT current_database()")) == "kayrealestate":
        raise RuntimeError("DEVELOPMENT_DOWNGRADE_REFUSED")
    if connection.scalar(sa.text("SELECT EXISTS(SELECT 1 FROM property)")):
        raise RuntimeError("INVENTORY_HISTORY_DOWNGRADE_REFUSED")
    op.drop_column("audit_event", "offering_id")
    op.drop_column("audit_event", "property_id")
    op.drop_constraint("audit_identity_action", "audit_event", type_="check")
    op.create_check_constraint(
        "audit_identity_action",
        "audit_event",
        "action LIKE 'identity.%' OR action LIKE 'users.%' OR action LIKE 'contacts.%' "
        "OR action LIKE 'enquiries.%'",
    )
    op.drop_table("inventory_command_receipt")
    op.drop_table("inventory_event")
    op.drop_table("offering")
    op.drop_table("property_owner")
    op.drop_table("property")
    op.execute("DROP FUNCTION kay_inventory_availability_check()")
