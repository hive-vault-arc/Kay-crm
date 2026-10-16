"""Exclude PostgreSQL numeric NaN, which compares greater than ordinary numbers."""

import sqlalchemy as sa

from alembic import op

revision = "0008_inventory_finite_amounts"
down_revision = "0007_standalone_inventory"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "property_area_finite", "property", "area_sqm IS NULL OR area_sqm != 'NaN'::numeric"
    )
    op.create_check_constraint(
        "offering_price_finite", "offering", "price_mad IS NULL OR price_mad != 'NaN'::numeric"
    )
    op.create_check_constraint(
        "inventory_event_price",
        "inventory_event",
        "price_mad IS NULL OR (price_mad > 0 AND price_mad != 'NaN'::numeric)",
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT current_database()")) == "kayrealestate":
        raise RuntimeError("DEVELOPMENT_DOWNGRADE_REFUSED")
    if connection.scalar(sa.text("SELECT EXISTS(SELECT 1 FROM property)")):
        raise RuntimeError("INVENTORY_HISTORY_DOWNGRADE_REFUSED")
    op.drop_constraint("inventory_event_price", "inventory_event", type_="check")
    op.drop_constraint("offering_price_finite", "offering", type_="check")
    op.drop_constraint("property_area_finite", "property", type_="check")
