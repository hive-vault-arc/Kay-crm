"""Additional typed property facts and independent-property categories."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op
from app.settings import load_settings

revision = "0032_property_listing_details"
down_revision = "0031_realtime"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "property",
        sa.Column(
            "listing_details", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")
        ),
    )
    op.drop_constraint("property_category", "property", type_="check")
    op.create_check_constraint(
        "property_category",
        "property",
        "category IN ('villa','house','apartment','land','commercial',"
        "'riad','room','office','farm')",
    )
    op.drop_constraint("offering_kind", "offering", type_="check")
    op.create_check_constraint("offering_kind", "offering", "kind IN ('sale','rental','holiday')")
    op.drop_constraint("offering_period", "offering", type_="check")
    op.create_check_constraint(
        "offering_period",
        "offering",
        "(kind = 'sale' AND price_period IS NULL) OR "
        "(kind = 'rental' AND price_period IN ('month','year')) OR "
        "(kind = 'holiday' AND price_period IN ('day','week','month'))",
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("PROPERTY_LISTING_DOWNGRADE_REFUSED")
    bind = op.get_bind()
    if bind.scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM property WHERE "
            "category IN ('riad','room','office','farm') OR listing_details <> '{}'::jsonb)"
        )
    ):
        raise RuntimeError("PROPERTY_LISTING_DATA_DOWNGRADE_REFUSED")
    if bind.scalar(sa.text("SELECT EXISTS(SELECT 1 FROM offering WHERE kind = 'holiday')")):
        raise RuntimeError("HOLIDAY_OFFERING_DOWNGRADE_REFUSED")
    op.drop_constraint("offering_period", "offering", type_="check")
    op.create_check_constraint(
        "offering_period",
        "offering",
        "(kind = 'sale' AND price_period IS NULL) OR "
        "(kind = 'rental' AND price_period IN ('month','year'))",
    )
    op.drop_constraint("offering_kind", "offering", type_="check")
    op.create_check_constraint("offering_kind", "offering", "kind IN ('sale','rental')")
    op.drop_constraint("property_category", "property", type_="check")
    op.create_check_constraint(
        "property_category",
        "property",
        "category IN ('villa','house','apartment','land','commercial')",
    )
    op.drop_column("property", "listing_details")
