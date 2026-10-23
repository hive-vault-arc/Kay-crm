"""Independent discussed/visited catalogue links on enquiries and deals."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0033_project_links"
down_revision = "0032_property_listing_details"
branch_labels = None
depends_on = None

LINK_ACTIONS = (
    "enquiries.project_link.added",
    "enquiries.project_link.removed",
    "deals.project_link.added",
    "deals.project_link.removed",
)

# Freeze the revision's check vocabulary. Importing ORM metadata here would make
# this old migration change whenever a later revision adds another action.
PREVIOUS_ACTIONS = (
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
    "enquiries.archive",
    "enquiries.restore",
    "deals.archived",
    "deals.restored",
)


def timeline_constraint(values: tuple[str, ...]) -> None:
    op.drop_constraint("timeline_action", "timeline_event", type_="check")
    op.create_check_constraint(
        "timeline_action", "timeline_event", "action IN (" + ",".join(repr(v) for v in values) + ")"
    )


def upgrade() -> None:
    op.create_table(
        "project_link",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("enquiry_id", sa.Uuid(), sa.ForeignKey("enquiry.id", ondelete="RESTRICT")),
        sa.Column("deal_id", sa.Uuid(), sa.ForeignKey("deal.id", ondelete="RESTRICT")),
        sa.Column(
            "development_id", sa.Uuid(), sa.ForeignKey("development.id", ondelete="RESTRICT")
        ),
        sa.Column("property_id", sa.Uuid(), sa.ForeignKey("property.id", ondelete="RESTRICT")),
        sa.Column("kind", sa.String(12), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column(
            "created_by_user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("removed_by_user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT")),
        sa.Column("removed_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("num_nonnulls(enquiry_id,deal_id)=1", name="project_link_parent"),
        sa.CheckConstraint(
            "num_nonnulls(development_id,property_id)=1", name="project_link_target"
        ),
        sa.CheckConstraint("kind IN ('discussed','visited')", name="project_link_kind"),
        sa.CheckConstraint("length(btrim(name))>0", name="project_link_name"),
        sa.CheckConstraint(
            "(removed_at IS NULL) = (removed_by_user_id IS NULL)", name="project_link_removal"
        ),
    )
    op.create_index(
        "ix_project_link_enquiry", "project_link", ["enquiry_id", "kind", "created_at", "id"]
    )
    op.create_index("ix_project_link_deal", "project_link", ["deal_id", "kind", "created_at", "id"])
    for parent in ("enquiry", "deal"):
        for target in ("development", "property"):
            op.create_index(
                f"uq_project_link_{parent}_{target}",
                "project_link",
                [f"{parent}_id", "kind", f"{target}_id"],
                unique=True,
                postgresql_where=sa.text(f"removed_at IS NULL AND {target}_id IS NOT NULL"),
            )
    timeline_constraint(PREVIOUS_ACTIONS + LINK_ACTIONS)


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("PROJECT_LINK_DOWNGRADE_REFUSED")
    bind = op.get_bind()
    if bind.scalar(sa.text("SELECT EXISTS(SELECT 1 FROM project_link)")) or bind.scalar(
        sa.text("SELECT EXISTS(SELECT 1 FROM timeline_event WHERE action = ANY(:actions))"),
        {"actions": list(LINK_ACTIONS)},
    ):
        raise RuntimeError("PROJECT_LINK_DATA_DOWNGRADE_REFUSED")
    timeline_constraint(PREVIOUS_ACTIONS)
    op.drop_table("project_link")
