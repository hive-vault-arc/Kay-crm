"""Versioned scheduling records; history and origins have restricted foreign keys."""

from datetime import datetime, time
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    LargeBinary,
    String,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SchedulePolicy(Base):
    __tablename__ = "visit_schedule_policy"
    __table_args__ = (
        CheckConstraint(
            "company_car_capacity_per_hour BETWEEN 1 AND 1000", name="visit_policy_capacity"
        ),
        CheckConstraint("version > 0", name="visit_policy_version"),
    )
    agency_id: Mapped[UUID] = mapped_column(
        ForeignKey("agency.id", ondelete="RESTRICT"), primary_key=True
    )
    company_car_capacity_per_hour: Mapped[int] = mapped_column(server_default="2")
    version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    updated_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WorkingWindow(Base):
    __tablename__ = "visit_working_window"
    __table_args__ = (
        CheckConstraint(
            "weekday BETWEEN 1 AND 7 AND end_local > start_local", name="visit_work_window"
        ),
        Index("ix_visit_work_policy_weekday", "policy_id", "weekday"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    policy_id: Mapped[UUID] = mapped_column(
        ForeignKey("visit_schedule_policy.agency_id", ondelete="RESTRICT")
    )
    weekday: Mapped[int]
    start_local: Mapped[time] = mapped_column(Time)
    end_local: Mapped[time] = mapped_column(Time)


class BreakWindow(Base):
    __tablename__ = "visit_break_window"
    __table_args__ = (
        CheckConstraint(
            "weekday BETWEEN 1 AND 7 AND end_local > start_local", name="visit_break_window"
        ),
        Index("ix_visit_break_policy_weekday", "policy_id", "weekday"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    policy_id: Mapped[UUID] = mapped_column(
        ForeignKey("visit_schedule_policy.agency_id", ondelete="RESTRICT")
    )
    weekday: Mapped[int]
    start_local: Mapped[time] = mapped_column(Time)
    end_local: Mapped[time] = mapped_column(Time)


class Visit(Base):
    __tablename__ = "visit"
    __table_args__ = (
        CheckConstraint(
            "type IN ('company_car','without_company_car','office')", name="visit_type"
        ),
        CheckConstraint(
            "status IN ('draft','scheduled','confirmed','completed','not_completed','cancelled')",
            name="visit_status",
        ),
        CheckConstraint(
            "end_at > start_at AND end_at <= start_at + interval '7 days'", name="visit_period"
        ),
        CheckConstraint(
            "length(btrim(title)) > 0 AND length(btrim(location)) > 0", name="visit_required_text"
        ),
        CheckConstraint("version > 0 AND policy_version > 0", name="visit_version"),
        CheckConstraint("schedule_version>0", name="visit_schedule_version"),
        CheckConstraint("num_nonnulls(enquiry_id,deal_id)<=1", name="visit_single_context"),
        Index("ix_visit_start_end_id", "start_at", "end_at", "id"),
        Index("ix_visit_type_status_time", "type", "status", "start_at", "end_at"),
        Index("ix_visit_contact_id", "contact_id", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    origin_contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    deal_id: Mapped[UUID | None] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"))
    enquiry_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("enquiry.id", ondelete="RESTRICT"), index=True
    )
    property_id: Mapped[UUID | None] = mapped_column(ForeignKey("property.id", ondelete="RESTRICT"))
    organizer_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    title: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(24))
    status: Mapped[str] = mapped_column(String(16))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    location: Mapped[str] = mapped_column(String(1000))
    overlap_reason: Mapped[str] = mapped_column(String(1000), server_default="")
    outcome: Mapped[str] = mapped_column(String(1000), server_default="")
    version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    policy_version: Mapped[int] = mapped_column(BigInteger)
    schedule_version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    updated_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class VisitParticipant(Base):
    __tablename__ = "visit_participant"
    visit_id: Mapped[UUID] = mapped_column(
        ForeignKey("visit.id", ondelete="RESTRICT"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )


class ScheduleEvent(Base):
    __tablename__ = "visit_schedule_event"
    __table_args__ = (
        CheckConstraint("version > 0", name="visit_schedule_event_version"),
        Index("ix_visit_schedule_event_version", "version", unique=True),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    policy_id: Mapped[UUID] = mapped_column(
        ForeignKey("visit_schedule_policy.agency_id", ondelete="RESTRICT")
    )
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    actor_name: Mapped[str] = mapped_column(String(160))
    version: Mapped[int] = mapped_column(BigInteger)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class VisitEvent(Base):
    __tablename__ = "visit_event"
    __table_args__ = (
        CheckConstraint(
            "action IN ('created','updated','confirmed','rescheduled','completed',"
            "'cancelled','not_completed','contact_merged')",
            name="visit_event_action",
        ),
        CheckConstraint("version > 0", name="visit_event_version"),
        Index("ix_visit_event_visit_version", "visit_id", "version", unique=True),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    visit_id: Mapped[UUID] = mapped_column(ForeignKey("visit.id", ondelete="RESTRICT"))
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    actor_name: Mapped[str] = mapped_column(String(160))
    action: Mapped[str] = mapped_column(String(24))
    version: Mapped[int] = mapped_column(BigInteger)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB)
    reason: Mapped[str] = mapped_column(String(1000))
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ScheduleReceipt(Base):
    __tablename__ = "visit_command_receipt"
    __table_args__ = (CheckConstraint("octet_length(request_hash)=32", name="visit_receipt_hash"),)
    actor_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    route: Mapped[str] = mapped_column(String(100), primary_key=True)
    key: Mapped[UUID] = mapped_column(primary_key=True)
    request_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    visit_id: Mapped[UUID | None] = mapped_column(ForeignKey("visit.id", ondelete="RESTRICT"))
    result: Mapped[dict[str, object]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
