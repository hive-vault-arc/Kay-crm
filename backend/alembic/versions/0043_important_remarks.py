"""Add optional internal remarks to contacts, properties and developments."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0043_important_remarks"
down_revision = "0042_property_costs"
branch_labels = None
depends_on = None

TABLES = ("contact", "property", "development")
CHECK = "important_remarks IS NULL OR char_length(important_remarks) BETWEEN 1 AND 1000"


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column("important_remarks", sa.Text()))
        op.create_check_constraint(f"{table}_important_remarks", table, CHECK)


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("IMPORTANT_REMARKS_DOWNGRADE_REFUSED")
    for table in reversed(TABLES):
        op.drop_constraint(f"{table}_important_remarks", table, type_="check")
        op.drop_column(table, "important_remarks")
