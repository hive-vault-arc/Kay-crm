"""Immutable commercial outcomes and linked reopenings, never financial corrections."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class DealOutcome(Base):
    __tablename__ = "deal_outcome"
    __table_args__ = (
        CheckConstraint("outcome IN ('won','lost','cancelled')", name="deal_outcome_kind"),
        CheckConstraint(
            "length(btrim(explanation)) BETWEEN 1 AND 1000", name="deal_outcome_reason"
        ),
        CheckConstraint("close_version>1", name="deal_outcome_version"),
        CheckConstraint(
            "previous_stage IN ('new','visit','negotiation','documents','reserved')",
            name="deal_outcome_previous",
        ),
        CheckConstraint(
            "(outcome='won' AND offering_id IS NOT NULL AND agreed_amount_mad IS NOT NULL "
            "AND agreed_amount_mad>0 AND agreed_amount_mad!='NaN'::numeric) OR "
            "(outcome<>'won' AND agreed_amount_mad IS NULL)",
            name="deal_outcome_amount",
        ),
        CheckConstraint(
            "price_period IS NULL OR price_period IN ('month','year')", name="deal_outcome_period"
        ),
        Index("uq_deal_outcome_version", "deal_id", "close_version", unique=True),
        Index("ix_deal_outcome_time", "deal_id", "created_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    deal_id: Mapped[UUID] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"))
    offering_id: Mapped[UUID | None] = mapped_column(ForeignKey("offering.id", ondelete="RESTRICT"))
    outcome: Mapped[str] = mapped_column(String(12))
    agreed_amount_mad: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    price_period: Mapped[str | None] = mapped_column(String(5))
    completed_on: Mapped[date] = mapped_column(Date)
    explanation: Mapped[str] = mapped_column(String(1000))
    primary_agent_at_close_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    primary_agent_at_close_name: Mapped[str] = mapped_column(String(160))
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    actor_name: Mapped[str] = mapped_column(String(160))
    previous_stage: Mapped[str] = mapped_column(String(16))
    close_version: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DealReopening(Base):
    __tablename__ = "deal_reopening"
    __table_args__ = (
        CheckConstraint("length(btrim(reason)) BETWEEN 1 AND 1000", name="deal_reopening_reason"),
        CheckConstraint("reopen_version>1", name="deal_reopening_version"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    deal_id: Mapped[UUID] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"), index=True)
    outcome_id: Mapped[UUID] = mapped_column(
        ForeignKey("deal_outcome.id", ondelete="RESTRICT"), unique=True
    )
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    actor_name: Mapped[str] = mapped_column(String(160))
    reason: Mapped[str] = mapped_column(String(1000))
    reopen_version: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
