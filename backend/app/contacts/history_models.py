"""Typed append-only business history, independent of security-audit retention."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

TIMELINE_ACTIONS = (
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


class TimelineEvent(Base):
    __tablename__ = "timeline_event"
    __table_args__ = (
        CheckConstraint("length(btrim(actor_name)) > 0", name="timeline_actor_name"),
        CheckConstraint(
            "length(body) <= 4000 AND length(reason) <= 1000", name="timeline_text_bounds"
        ),
        CheckConstraint(
            "action IN (" + ",".join(repr(v) for v in TIMELINE_ACTIONS) + ")",
            name="timeline_action",
        ),
        Index("ix_timeline_contact_time", "contact_id", "occurred_at", "id"),
        Index("ix_timeline_enquiry_time", "enquiry_id", "occurred_at", "id"),
        Index("ix_timeline_deal_time", "deal_id", "occurred_at", "id"),
        CheckConstraint(
            "duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 1440",
            name="timeline_duration",
        ),
        CheckConstraint(
            "direction IS NULL OR direction IN ('inbound','outbound')", name="timeline_direction"
        ),
        CheckConstraint(
            "kay_activity_projects_valid(activity_projects)", name="timeline_activity_projects"
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    actor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    website_source_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("website_source.id", ondelete="RESTRICT")
    )
    actor_name: Mapped[str] = mapped_column(String(160))
    action: Mapped[str] = mapped_column(String(40))
    body: Mapped[str] = mapped_column(Text, default="")
    reason: Mapped[str] = mapped_column(String(1000), default="")
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    direction: Mapped[str | None] = mapped_column(String(8))
    activity_projects: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    enquiry_id: Mapped[UUID | None] = mapped_column(ForeignKey("enquiry.id", ondelete="RESTRICT"))
    related_contact_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT")
    )
    deal_id: Mapped[UUID | None] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"))
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AssignmentEvent(Base):
    __tablename__ = "assignment_event"
    __table_args__ = (
        CheckConstraint(
            "action IN ('primary','collaborator_added','collaborator_removed','enquiry')",
            name="assignment_action",
        ),
        CheckConstraint("length(btrim(reason)) BETWEEN 1 AND 1000", name="assignment_reason"),
        Index("ix_assignment_contact_time", "contact_id", "occurred_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    actor_name: Mapped[str] = mapped_column(String(160))
    action: Mapped[str] = mapped_column(String(32))
    previous_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    new_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    previous_name: Mapped[str | None] = mapped_column(String(160))
    new_name: Mapped[str | None] = mapped_column(String(160))
    enquiry_id: Mapped[UUID | None] = mapped_column(ForeignKey("enquiry.id", ondelete="RESTRICT"))
    reason: Mapped[str] = mapped_column(String(1000))
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
