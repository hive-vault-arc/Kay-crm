"""Default new visits to confirmed and retain distinct report reminder deliveries."""

import sqlalchemy as sa

from alembic import op

revision = "0053_confirmed_visit_reports"
down_revision = "0052_agent_handoff_notes"
branch_labels = None
depends_on = None

LEGACY = (
    "schedule_version IS NULL OR event_key=kind||':'||"
    "coalesce(visit_id,task_id)::text||':'||schedule_version::text"
)
REPEAT = (
    "(kind='visit.follow_up' AND event_key ~ "
    "('^visit[.]follow_up:'||visit_id::text||':'||schedule_version::text||':r:[0-9]+$'))"
)


def upgrade() -> None:
    op.execute("SET LOCAL lock_timeout = '2s'")
    op.alter_column("visit", "status", server_default="confirmed")
    op.drop_constraint("notification_reminder_key", "notification", type_="check")
    op.create_check_constraint(
        "notification_reminder_key", "notification", LEGACY + " OR " + REPEAT
    )
    op.create_index(
        "ix_notification_visit_follow_up",
        "notification",
        ["visit_id", "schedule_version", "user_id", "created_at", "id"],
        postgresql_where=sa.text("kind='visit.follow_up'"),
    )
    op.create_index(
        "ix_visit_due_report",
        "visit",
        ["end_at", "id"],
        postgresql_where=sa.text("status IN ('scheduled','confirmed')"),
    )


def downgrade() -> None:
    if op.get_bind().scalar(
        sa.text(
            "SELECT EXISTS (SELECT FROM notification "
            "WHERE kind='visit.follow_up' AND event_key LIKE '%:r:%')"
        )
    ):
        raise RuntimeError("VISIT_REPORT_REMINDERS_RETAINED")
    op.drop_index("ix_notification_visit_follow_up", table_name="notification")
    op.drop_index("ix_visit_due_report", table_name="visit")
    op.drop_constraint("notification_reminder_key", "notification", type_="check")
    op.create_check_constraint("notification_reminder_key", "notification", LEGACY)
    op.alter_column("visit", "status", server_default="scheduled")
