"""Add private annual contact reminders to the existing inbox."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0048_contact_birthday_alerts"
down_revision = "0047_property_primary_photo"
branch_labels = None
depends_on = None

EXISTING_PARENTS = (
    "(kind='file.scanned' AND document_id IS NOT NULL AND visit_id IS NULL "
    "AND task_id IS NULL AND schedule_version IS NULL) OR "
    "(kind IN ('visit.reminder.day','visit.reminder.hour','visit.follow_up') "
    "AND visit_id IS NOT NULL AND document_id IS NULL AND task_id IS NULL "
    "AND schedule_version IS NOT NULL AND schedule_version>0) OR "
    "(kind IN ('task.reminder.day','task.reminder.hour','task.due') "
    "AND task_id IS NOT NULL AND document_id IS NULL AND visit_id IS NULL "
    "AND schedule_version IS NOT NULL AND schedule_version>0)"
)
BIRTHDAY_PARENT = (
    "kind IN ('contact.birthday.eve','contact.birthday.today') "
    "AND contact_id IS NOT NULL AND birthday_on IS NOT NULL "
    "AND document_id IS NULL AND visit_id IS NULL AND task_id IS NULL "
    "AND schedule_version IS NULL "
    "AND event_key=kind||':'||contact_id::text||':'||to_char(birthday_on,'YYYYMMDD')"
)


def upgrade() -> None:
    op.add_column("notification", sa.Column("contact_id", sa.Uuid()))
    op.add_column("notification", sa.Column("birthday_on", sa.Date()))
    op.create_foreign_key(
        "fk_notification_contact_id",
        "notification",
        "contact",
        ["contact_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_notification_birthday_contact",
        "notification",
        ["contact_id", "birthday_on", "user_id", "kind"],
        postgresql_where=sa.text("contact_id IS NOT NULL"),
    )
    op.create_index(
        "ix_contact_birthday_active",
        "contact",
        [sa.text("EXTRACT(month FROM birth_date)"), sa.text("EXTRACT(day FROM birth_date)")],
        postgresql_where=sa.text(
            "archived_at IS NULL AND birth_date IS NOT NULL AND type='person'"
        ),
    )
    op.drop_constraint("notification_typed_parent", "notification", type_="check")
    op.create_check_constraint(
        "notification_typed_parent",
        "notification",
        f"((contact_id IS NULL AND birthday_on IS NULL) AND ({EXISTING_PARENTS})) "
        f"OR ({BIRTHDAY_PARENT})",
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("CONTACT_BIRTHDAY_ALERTS_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(
        sa.text("SELECT EXISTS (SELECT FROM notification WHERE contact_id IS NOT NULL)")
    ):
        raise RuntimeError("CONTACT_BIRTHDAY_ALERTS_PRESENT")
    op.drop_constraint("notification_typed_parent", "notification", type_="check")
    op.create_check_constraint("notification_typed_parent", "notification", EXISTING_PARENTS)
    op.drop_index("ix_contact_birthday_active", table_name="contact")
    op.drop_index("ix_notification_birthday_contact", table_name="notification")
    op.drop_constraint("fk_notification_contact_id", "notification", type_="foreignkey")
    op.drop_column("notification", "birthday_on")
    op.drop_column("notification", "contact_id")
