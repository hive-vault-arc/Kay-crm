"""Add dossier handoff notes and immutable personal reminders."""

import sqlalchemy as sa

from alembic import op

revision = "0052_agent_handoff_notes"
down_revision = "0051_visit_booking_defaults"
branch_labels = None
depends_on = None

LEGACY = (
    "((contact_id IS NULL AND birthday_on IS NULL) AND "
    "((kind='file.scanned' AND document_id IS NOT NULL AND visit_id IS NULL "
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
    "AND event_key=kind||':'||contact_id::text||':'||to_char(birthday_on,'YYYYMMDD')) OR "
    "(kind IN ('holiday.eve','holiday.today') AND holiday_id IS NOT NULL "
    "AND contact_id IS NULL AND birthday_on IS NULL AND document_id IS NULL "
    "AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL "
    "AND event_key=kind||':'||holiday_id::text)"
)


def upgrade() -> None:
    op.execute("SET LOCAL lock_timeout = '2s'")
    op.create_table(
        "coverage_note",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("enquiry_id", sa.Uuid(), sa.ForeignKey("enquiry.id", ondelete="RESTRICT")),
        sa.Column("deal_id", sa.Uuid(), sa.ForeignKey("deal.id", ondelete="RESTRICT")),
        sa.Column(
            "author_user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("author_name", sa.String(160), nullable=False),
        sa.Column("request_key", sa.Uuid(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("seen_at", sa.DateTime(timezone=True)),
        sa.Column("seen_by_user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT")),
        sa.CheckConstraint("num_nonnulls(enquiry_id, deal_id) = 1", name="coverage_note_parent"),
        sa.CheckConstraint("length(btrim(body)) BETWEEN 1 AND 4000", name="coverage_note_body"),
        sa.CheckConstraint(
            "(seen_at IS NULL) = (seen_by_user_id IS NULL)", name="coverage_note_seen"
        ),
        sa.UniqueConstraint("author_user_id", "request_key", name="uq_coverage_note_request"),
    )
    op.create_index("ix_coverage_note_enquiry", "coverage_note", ["enquiry_id", "created_at", "id"])
    op.create_index("ix_coverage_note_deal", "coverage_note", ["deal_id", "created_at", "id"])
    op.create_index(
        "ix_coverage_note_unseen",
        "coverage_note",
        ["created_at", "id"],
        postgresql_where=sa.text("seen_at IS NULL"),
    )
    op.add_column("notification", sa.Column("coverage_note_id", sa.Uuid()))
    op.create_foreign_key(
        "fk_notification_coverage_note",
        "notification",
        "coverage_note",
        ["coverage_note_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_notification_coverage",
        "notification",
        ["coverage_note_id", "user_id", "created_at", "id"],
        postgresql_where=sa.text("coverage_note_id IS NOT NULL"),
    )
    op.create_check_constraint(
        "notification_coverage_parent",
        "notification",
        "(kind='coverage.note') = (coverage_note_id IS NOT NULL)",
    )
    op.drop_constraint("notification_typed_parent", "notification", type_="check")
    op.create_check_constraint(
        "notification_typed_parent",
        "notification",
        LEGACY + " OR (kind='coverage.note' AND coverage_note_id IS NOT NULL "
        "AND contact_id IS NULL AND birthday_on IS NULL AND document_id IS NULL "
        "AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL "
        "AND event_key LIKE kind||':'||coverage_note_id::text||':%')",
    )


def downgrade() -> None:
    if op.get_bind().scalar(sa.text("SELECT EXISTS (SELECT FROM coverage_note)")):
        raise RuntimeError("COVERAGE_NOTES_PRESENT")
    op.drop_constraint("notification_typed_parent", "notification", type_="check")
    op.create_check_constraint("notification_typed_parent", "notification", LEGACY)
    op.drop_constraint("notification_coverage_parent", "notification", type_="check")
    op.drop_index("ix_notification_coverage", table_name="notification")
    op.drop_constraint("fk_notification_coverage_note", "notification", type_="foreignkey")
    op.drop_column("notification", "coverage_note_id")
    op.drop_table("coverage_note")
