"""Add optional owner asking prices and monthly syndic fees to properties."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0042_property_costs"
down_revision = "0041_owner_identity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("property", sa.Column("owner_asking_price_mad", sa.Numeric(18, 2)))
    op.add_column("property", sa.Column("monthly_syndic_fee_mad", sa.Numeric(18, 2)))
    op.create_check_constraint(
        "property_owner_asking_price",
        "property",
        "owner_asking_price_mad > 0 AND owner_asking_price_mad != 'NaN'::numeric",
    )
    op.create_check_constraint(
        "property_monthly_syndic_fee",
        "property",
        "monthly_syndic_fee_mad >= 0 AND monthly_syndic_fee_mad != 'NaN'::numeric",
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("PROPERTY_COSTS_DOWNGRADE_REFUSED")
    op.drop_constraint("property_monthly_syndic_fee", "property", type_="check")
    op.drop_constraint("property_owner_asking_price", "property", type_="check")
    op.drop_column("property", "monthly_syndic_fee_mad")
    op.drop_column("property", "owner_asking_price_mad")
