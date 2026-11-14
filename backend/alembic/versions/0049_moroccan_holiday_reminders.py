"""Add Moroccan holiday reminders without changing existing inbox data."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0049_moroccan_holiday_reminders"
down_revision = "0048_contact_birthday_alerts"
branch_labels = None
depends_on = None

LEGACY = (
    "((contact_id IS NULL AND birthday_on IS NULL) AND ("
    "(kind='file.scanned' AND document_id IS NOT NULL AND visit_id IS NULL "
    "AND task_id IS NULL AND schedule_version IS NULL) OR "
    "(kind IN ('visit.reminder.day','visit.reminder.hour','visit.follow_up') "
    "AND visit_id IS NOT NULL AND document_id IS NULL AND task_id IS NULL "
    "AND schedule_version IS NOT NULL AND schedule_version>0) OR "
    "(kind IN ('task.reminder.day','task.reminder.hour','task.due') "
    "AND task_id IS NOT NULL AND document_id IS NULL AND visit_id IS NULL "
    "AND schedule_version IS NOT NULL AND schedule_version>0))) OR "
    "(kind IN ('contact.birthday.eve','contact.birthday.today') "
    "AND contact_id IS NOT NULL AND birthday_on IS NOT NULL "
    "AND document_id IS NULL AND visit_id IS NULL AND task_id IS NULL "
    "AND schedule_version IS NULL "
    "AND event_key=kind||':'||contact_id::text||':'||to_char(birthday_on,'YYYYMMDD'))"
)


def notification_guard(exception_sql: str) -> None:
    op.execute(f"""
        CREATE OR REPLACE FUNCTION kay_notification_guard() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF current_setting('kay.synthetic_cleanup',true)='on' THEN
                IF TG_OP='DELETE' THEN RETURN OLD; END IF;
                RETURN NEW;
            END IF;
            IF TG_OP='DELETE' THEN
                RAISE EXCEPTION 'NOTIFICATION_RETAINED' USING ERRCODE='23514';
            END IF;
            {exception_sql}
            IF (to_jsonb(NEW)-'read_at') IS DISTINCT FROM (to_jsonb(OLD)-'read_at')
                OR (OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at)
            THEN RAISE EXCEPTION 'NOTIFICATION_IMMUTABLE' USING ERRCODE='23514'; END IF;
            RETURN NEW;
        END $$;
    """)


def upgrade() -> None:
    op.create_table(
        "holiday_occurrence",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("category", sa.String(12), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("start_on", sa.Date()),
        sa.Column("end_on", sa.Date()),
        sa.Column("source_url", sa.String(2048), nullable=False),
        sa.Column("version", sa.BigInteger(), nullable=False),
        sa.UniqueConstraint("year", "code", name="uq_holiday_year_code"),
        sa.CheckConstraint(
            "category IN ('national','amazigh','religious')", name="holiday_category"
        ),
        sa.CheckConstraint(
            "status IN ('pending','estimated','fixed','confirmed','manual') "
            "AND ((status='pending' AND start_on IS NULL AND end_on IS NULL) OR "
            "(status<>'pending' AND start_on IS NOT NULL AND end_on IS NOT NULL "
            "AND end_on BETWEEN start_on AND start_on + 1 "
            "AND EXTRACT(year FROM start_on)=year))",
            name="holiday_date_state",
        ),
        sa.CheckConstraint("version>0", name="holiday_version"),
    )
    op.create_index("ix_holiday_occurrence_start", "holiday_occurrence", ["start_on"])
    op.create_table(
        "holiday_sync",
        sa.Column("provider", sa.String(20), primary_key=True),
        sa.Column("year", sa.Integer(), primary_key=True),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("succeeded_at", sa.DateTime(timezone=True)),
        sa.Column("error_code", sa.String(24)),
    )
    op.create_table(
        "holiday_confirmation",
        sa.Column(
            "occurrence_id",
            sa.Uuid(),
            sa.ForeignKey("holiday_occurrence.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("version", sa.BigInteger(), primary_key=True),
        sa.Column(
            "actor_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("request_key", sa.Uuid(), nullable=False),
        sa.Column("start_on", sa.Date(), nullable=False),
        sa.Column("end_on", sa.Date(), nullable=False),
        sa.Column("source_url", sa.String(2048), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "occurrence_id", "actor_id", "request_key", name="uq_holiday_confirmation_retry"
        ),
    )
    op.add_column("notification", sa.Column("holiday_id", sa.Uuid()))
    op.add_column(
        "notification",
        sa.Column("holiday_revision", sa.BigInteger()),
    )
    op.create_foreign_key(
        "fk_notification_holiday_id",
        "notification",
        "holiday_occurrence",
        ["holiday_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_notification_holiday_id",
        "notification",
        ["holiday_id"],
        postgresql_where=sa.text("holiday_id IS NOT NULL"),
    )
    op.create_check_constraint(
        "notification_holiday_parent",
        "notification",
        "(holiday_id IS NULL OR kind IN ('holiday.eve','holiday.today')) "
        "AND (holiday_revision IS NULL OR (kind='holiday.eve' AND holiday_revision>0))",
    )
    op.drop_constraint("notification_typed_parent", "notification", type_="check")
    op.create_check_constraint(
        "notification_typed_parent",
        "notification",
        LEGACY + " OR (kind IN ('holiday.eve','holiday.today') AND holiday_id IS NOT NULL "
        "AND contact_id IS NULL AND birthday_on IS NULL AND document_id IS NULL "
        "AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL "
        "AND event_key=kind||':'||holiday_id::text)",
    )

    notification_guard("""
        IF OLD.kind='holiday.eve' AND NEW.read_at IS NULL
            AND NEW.holiday_revision>coalesce(OLD.holiday_revision,0)
            AND NEW.holiday_revision=(SELECT version FROM holiday_occurrence
                                      WHERE id=OLD.holiday_id)
            AND (to_jsonb(NEW)-'read_at'-'holiday_revision')
                IS NOT DISTINCT FROM (to_jsonb(OLD)-'read_at'-'holiday_revision')
        THEN RETURN NEW; END IF;
    """)


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("MOROCCAN_HOLIDAYS_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(
        sa.text("SELECT EXISTS (SELECT FROM notification WHERE holiday_id IS NOT NULL)")
    ):
        raise RuntimeError("MOROCCAN_HOLIDAY_NOTICES_PRESENT")
    op.drop_constraint("notification_typed_parent", "notification", type_="check")
    op.create_check_constraint("notification_typed_parent", "notification", LEGACY)
    op.drop_constraint("notification_holiday_parent", "notification", type_="check")
    op.drop_index("ix_notification_holiday_id", table_name="notification")
    op.drop_constraint("fk_notification_holiday_id", "notification", type_="foreignkey")
    notification_guard("")
    op.drop_column("notification", "holiday_revision")
    op.drop_column("notification", "holiday_id")
    op.drop_table("holiday_confirmation")
    op.drop_table("holiday_sync")
    op.drop_table("holiday_occurrence")
