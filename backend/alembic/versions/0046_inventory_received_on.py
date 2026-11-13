"""Add the optional date a property or development was received."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0046_inventory_received_on"
down_revision = "0045_property_periods"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("property", "development"):
        op.add_column(table, sa.Column("received_on", sa.Date()))


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("INVENTORY_RECEIVED_ON_DOWNGRADE_REFUSED")
    op.drop_column("development", "received_on")
    op.drop_column("property", "received_on")
