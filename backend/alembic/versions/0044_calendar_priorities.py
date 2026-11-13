"""Add task priorities, follow-up reminders and calendar meetings."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0044_calendar_priorities"
down_revision = "0043_important_remarks"
branch_labels = None
depends_on = None

VISIT_TYPES = "type IN ('company_car','without_company_car','office')"


def upgrade() -> None:
    op.add_column(
        "task", sa.Column("important", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.add_column("task", sa.Column("kind", sa.String(12), nullable=False, server_default="task"))
    op.create_check_constraint("task_kind", "task", "kind IN ('task','reminder')")
    op.create_index(
        "ix_task_calendar_important",
        "task",
        ["due_at", "id"],
        postgresql_where=sa.text("important IS TRUE AND status='open'"),
    )
    op.drop_constraint("visit_type", "visit", type_="check")
    op.create_check_constraint("visit_type", "visit", f"{VISIT_TYPES} OR type='meeting'")


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("CALENDAR_PRIORITIES_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(sa.text("SELECT EXISTS (SELECT FROM visit WHERE type='meeting')")):
        raise RuntimeError("CALENDAR_MEETINGS_PRESENT")
    op.drop_constraint("visit_type", "visit", type_="check")
    op.create_check_constraint("visit_type", "visit", VISIT_TYPES)
    op.drop_index("ix_task_calendar_important", table_name="task")
    op.drop_constraint("task_kind", "task", type_="check")
    op.drop_column("task", "kind")
    op.drop_column("task", "important")
