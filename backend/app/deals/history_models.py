"""Append-only snapshots retain real authors and each selected target/proposal revision."""

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
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class DealStageEvent(Base):
    __tablename__ = "deal_stage_event"
    __table_args__ = (
        CheckConstraint(
            "action IN ('created','updated','transition','customer_offer.created',"
            "'customer_offer.updated','contact_merged','reservation.created','reservation.released',"
            "'closed','reopened','stock.flagged')",
            name="deal_event_action",
        ),
        CheckConstraint(
            "length(btrim(actor_name))>0 AND after_version>0 AND before_version>=0 "
            "AND after_version=before_version+1",
            name="deal_event_identity",
        ),
        CheckConstraint(
            "from_stage IS NULL OR from_stage IN ('new','visit','negotiation',"
            "'reserved','documents','won','lost','cancelled')",
            name="deal_event_from",
        ),
        CheckConstraint(
            "to_stage IN ('new','visit','negotiation','reserved','documents',"
            "'won','lost','cancelled')",
            name="deal_event_to",
        ),
        CheckConstraint(
            "amount_mad IS NULL OR (amount_mad>0 AND amount_mad!='NaN'::numeric)",
            name="deal_event_amount",
        ),
        CheckConstraint(
            "price_period IS NULL OR price_period IN ('month','year')", name="deal_event_period"
        ),
        CheckConstraint(
            "offer_status IS NULL OR offer_status IN ('pending','accepted','rejected','withdrawn')",
            name="deal_event_offer_status",
        ),
        Index("ix_deal_event_time", "deal_id", "occurred_at", "id"),
        UniqueConstraint("deal_id", "after_version", name="deal_event_version_unique"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    deal_id: Mapped[UUID] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"))
    contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    actor_name: Mapped[str] = mapped_column(String(160))
    action: Mapped[str] = mapped_column(String(32))
    from_stage: Mapped[str | None] = mapped_column(String(16))
    to_stage: Mapped[str] = mapped_column(String(16))
    before_version: Mapped[int] = mapped_column(BigInteger)
    after_version: Mapped[int] = mapped_column(BigInteger)
    title: Mapped[str] = mapped_column(String(160))
    next_action: Mapped[str] = mapped_column(String(1000))
    stock_review_required: Mapped[bool] = mapped_column(server_default="false")
    offering_id: Mapped[UUID | None] = mapped_column(ForeignKey("offering.id", ondelete="RESTRICT"))
    requirement_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("requirement.id", ondelete="RESTRICT")
    )
    customer_offer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("customer_offer.id", ondelete="RESTRICT")
    )
    offer_version: Mapped[int | None] = mapped_column(BigInteger)
    amount_mad: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    price_period: Mapped[str | None] = mapped_column(String(5))
    conditions: Mapped[str | None] = mapped_column(String(4000))
    expires_on: Mapped[date | None] = mapped_column(Date)
    offer_status: Mapped[str | None] = mapped_column(String(10))
    reason: Mapped[str] = mapped_column(String(1000), server_default="")
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
