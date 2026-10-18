"""Retain staff attribution while separating deletion from legacy disabled state."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0026_staff_deletion"
down_revision = "0025_scoped_activities"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_check_constraint(
        "user_deleted_state", "user", "deleted_at IS NULL OR state = 'disabled'"
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("STAFF_DELETION_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(
        sa.text('SELECT EXISTS(SELECT 1 FROM "user" WHERE deleted_at IS NOT NULL)')
    ):
        raise RuntimeError("STAFF_DELETION_HISTORY_DOWNGRADE_REFUSED")
    op.drop_constraint("user_deleted_state", "user", type_="check")
    op.drop_column("user", "deleted_at")
