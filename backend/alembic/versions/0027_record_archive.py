"""Recoverable 30-day archive state for individual enquiries and deals."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0027_record_archive"
down_revision = "0026_staff_deletion"
branch_labels = None
depends_on = None

PREVIOUS_TIMELINE_ACTIONS = (
    "message",
    "visit",
    "tasks.created",
    "tasks.updated",
    "tasks.completed",
    "tasks.cancelled",
    "tasks.contact_merged",
    "visits.created",
    "visits.updated",
    "visits.confirmed",
    "visits.rescheduled",
    "visits.completed",
    "visits.cancelled",
    "visits.contact_merged",
    "deals.closed",
    "deals.reopened",
    "deals.stock.flagged",
    "deals.reservation.created",
    "deals.reservation.released",
    "deals.created",
    "deals.updated",
    "deals.transition",
    "deals.customer_offer.created",
    "deals.customer_offer.updated",
    "deals.contact_merged",
    "requirements.created",
    "requirements.updated",
    "requirements.shortlisted",
    "requirements.unshortlisted",
    "contacts.created",
    "contacts.updated",
    "enquiries.created",
    "enquiries.updated",
    "enquiries.converted",
    "contacts.assign",
    "contacts.collaborators",
    "contacts.archive",
    "contacts.restore",
    "contacts.merge",
    "note",
    "call",
    "email",
    "meeting",
    "other",
    "enquiries.assign",
)
ARCHIVE_TIMELINE_ACTIONS = (
    "enquiries.archive",
    "enquiries.restore",
    "deals.archived",
    "deals.restored",
)
PREVIOUS_DEAL_ACTIONS = (
    "created",
    "updated",
    "transition",
    "customer_offer.created",
    "customer_offer.updated",
    "contact_merged",
    "reservation.created",
    "reservation.released",
    "closed",
    "reopened",
    "stock.flagged",
)


def action_check(actions: tuple[str, ...]) -> str:
    return "action IN (" + ",".join(repr(value) for value in actions) + ")"


def upgrade() -> None:
    for table in ("enquiry", "deal"):
        op.add_column(table, sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
        op.add_column(
            table,
            sa.Column("archived_by_user_id", sa.UUID(), nullable=True),
        )
        op.create_foreign_key(
            f"fk_{table}_archived_by_user",
            table,
            "user",
            ["archived_by_user_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        op.create_check_constraint(
            f"{table}_archive_pair",
            table,
            "(archived_at IS NULL) = (archived_by_user_id IS NULL)",
        )
        op.create_index(f"ix_{table}_archive_updated", table, ["archived_at", "updated_at", "id"])
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    op.create_check_constraint(
        "timeline_action",
        "timeline_event",
        action_check(PREVIOUS_TIMELINE_ACTIONS + ARCHIVE_TIMELINE_ACTIONS),
    )
    op.drop_constraint("deal_event_action", "deal_stage_event", type_="check")
    op.create_check_constraint(
        "deal_event_action",
        "deal_stage_event",
        action_check(PREVIOUS_DEAL_ACTIONS + ("archived", "restored")),
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("RECORD_ARCHIVE_DOWNGRADE_REFUSED")
    bind = op.get_bind()
    archived_enquiry = bind.scalar(
        sa.text("SELECT EXISTS(SELECT 1 FROM enquiry WHERE archived_at IS NOT NULL)")
    )
    archived_deal = bind.scalar(
        sa.text("SELECT EXISTS(SELECT 1 FROM deal WHERE archived_at IS NOT NULL)")
    )
    if archived_enquiry or archived_deal:
        raise RuntimeError("RECORD_ARCHIVE_HISTORY_DOWNGRADE_REFUSED")
    op.drop_constraint("deal_event_action", "deal_stage_event", type_="check")
    op.create_check_constraint(
        "deal_event_action", "deal_stage_event", action_check(PREVIOUS_DEAL_ACTIONS)
    )
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    op.create_check_constraint(
        "timeline_action",
        "timeline_event",
        action_check(PREVIOUS_TIMELINE_ACTIONS),
    )
    for table in ("deal", "enquiry"):
        op.drop_index(f"ix_{table}_archive_updated", table_name=table)
        op.drop_constraint(f"{table}_archive_pair", table, type_="check")
        op.drop_constraint(f"fk_{table}_archived_by_user", table, type_="foreignkey")
        op.drop_column(table, "archived_by_user_id")
        op.drop_column(table, "archived_at")
