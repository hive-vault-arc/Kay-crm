"""Stock-only dispositions and exact immutable effects contain no client identity."""

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, CheckConstraint, Date, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class StockOutcome(Base):
    __tablename__ = "stock_outcome"
    __table_args__ = (
        CheckConstraint("length(after_fingerprint)=64", name="stock_outcome_fingerprint"),
        CheckConstraint(
            "length(btrim(explanation)) BETWEEN 1 AND 1000", name="stock_outcome_reason"
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    deal_outcome_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("deal_outcome.id", ondelete="RESTRICT"), unique=True
    )
    offering_id: Mapped[UUID] = mapped_column(
        ForeignKey("offering.id", ondelete="RESTRICT"), index=True
    )
    completed_on: Mapped[date] = mapped_column(Date)
    explanation: Mapped[str] = mapped_column(String(1000))
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    after_fingerprint: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StockEffect(Base):
    __tablename__ = "stock_effect"
    __table_args__ = (
        CheckConstraint(
            "before_version>0 AND after_version=before_version+1", name="stock_effect_version"
        ),
        CheckConstraint(
            "before_state IN ('draft','available','reserved','withdrawn','review') "
            "AND after_state IN ('sold','rented','withdrawn','review')",
            name="stock_effect_states",
        ),
        Index("uq_stock_effect_offering", "outcome_id", "offering_id", unique=True),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    outcome_id: Mapped[UUID] = mapped_column(
        ForeignKey("stock_outcome.id", ondelete="RESTRICT"), index=True
    )
    offering_id: Mapped[UUID] = mapped_column(
        ForeignKey("offering.id", ondelete="RESTRICT"), index=True
    )
    before_state: Mapped[str] = mapped_column(String(12))
    before_current: Mapped[bool]
    before_version: Mapped[int] = mapped_column(BigInteger)
    after_state: Mapped[str] = mapped_column(String(12))
    after_current: Mapped[bool]
    after_version: Mapped[int] = mapped_column(BigInteger)
    inventory_event_id: Mapped[UUID] = mapped_column(
        ForeignKey("inventory_event.id", ondelete="RESTRICT"), unique=True
    )


class StockReversal(Base):
    __tablename__ = "stock_reversal"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    effect_id: Mapped[UUID] = mapped_column(
        ForeignKey("stock_effect.id", ondelete="RESTRICT"), unique=True
    )
    reopening_id: Mapped[UUID] = mapped_column(
        ForeignKey("deal_reopening.id", ondelete="RESTRICT"), index=True
    )
    inventory_event_id: Mapped[UUID] = mapped_column(
        ForeignKey("inventory_event.id", ondelete="RESTRICT"), unique=True
    )
