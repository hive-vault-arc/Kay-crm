"""Deal identity and mutable proposals with restricted historical foreign keys."""

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
    LargeBinary,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Deal(Base):
    __tablename__ = "deal"
    __table_args__ = (
        CheckConstraint("length(btrim(title)) > 0", name="deal_title"),
        CheckConstraint("version > 0", name="deal_version"),
        CheckConstraint("rating IN ('cold','warm','hot')", name="deal_rating"),
        CheckConstraint(
            "initial_budget IS NULL OR length(btrim(initial_budget)) BETWEEN 1 AND 160",
            name="deal_budget",
        ),
        CheckConstraint(
            "jsonb_typeof(purchase_reasons)='array' AND jsonb_array_length(purchase_reasons)<=8",
            name="deal_purchase_reasons",
        ),
        CheckConstraint("jsonb_typeof(client_snapshot)='object'", name="deal_client_snapshot"),
        CheckConstraint(
            "stage IN ('new','visit','negotiation','reserved','documents',"
            "'won','lost','cancelled')",
            name="deal_stage",
        ),
        CheckConstraint(
            "stage IN ('new','visit','negotiation','documents','reserved',"
            "'won','lost','cancelled')",
            name="deal_supported_stage",
        ),
        Index("ix_deal_contact_stage_updated", "contact_id", "stage", "updated_at", "id"),
        Index("ix_deal_updated_id", "updated_at", "id"),
        Index("ix_deal_archive_updated", "archived_at", "updated_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    origin_contact_id: Mapped[UUID] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    enquiry_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("enquiry.id", ondelete="RESTRICT"), index=True
    )
    requirement_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("requirement.id", ondelete="RESTRICT"), index=True
    )
    offering_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("offering.id", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    initial_budget: Mapped[str | None] = mapped_column(String(160))
    campaign_source: Mapped[str] = mapped_column(
        String(40), default="unknown", server_default="unknown"
    )
    rating: Mapped[str] = mapped_column(String(8), default="cold", server_default="cold")
    purchase_reasons: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    client_snapshot: Mapped[dict[str, object]] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )
    payment_method: Mapped[str | None] = mapped_column(String(24))
    number_of_rooms: Mapped[int | None]
    notes: Mapped[str] = mapped_column(String(4000), default="", server_default="")
    stage: Mapped[str] = mapped_column(String(16), server_default="new")
    next_action: Mapped[str] = mapped_column(String(1000), server_default="")
    stock_review_required: Mapped[bool] = mapped_column(server_default="false")
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    primary_agent_at_close_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    updated_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CustomerOffer(Base):
    __tablename__ = "customer_offer"
    __table_args__ = (
        CheckConstraint(
            "amount_mad > 0 AND amount_mad != 'NaN'::numeric", name="customer_offer_amount"
        ),
        CheckConstraint("currency='MAD'", name="customer_offer_currency"),
        CheckConstraint(
            "price_period IS NULL OR price_period IN ('month','year')", name="customer_offer_period"
        ),
        CheckConstraint(
            "status IN ('pending','accepted','rejected','withdrawn')", name="customer_offer_status"
        ),
        CheckConstraint("version > 0", name="customer_offer_version"),
        Index("ix_customer_offer_deal_time", "deal_id", "created_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    deal_id: Mapped[UUID] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"))
    amount_mad: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    currency: Mapped[str] = mapped_column(String(3), server_default="MAD")
    price_period: Mapped[str | None] = mapped_column(String(5))
    conditions: Mapped[str] = mapped_column(String(4000), server_default="")
    expires_on: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(10), server_default="pending")
    version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    updated_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DealReceipt(Base):
    __tablename__ = "deal_command_receipt"
    __table_args__ = (
        CheckConstraint(
            "result_version>0 AND octet_length(request_hash)=32", name="deal_receipt_valid"
        ),
    )
    actor_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    route: Mapped[str] = mapped_column(String(160), primary_key=True)
    key: Mapped[UUID] = mapped_column(primary_key=True)
    request_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    deal_id: Mapped[UUID] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"), index=True)
    customer_offer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("customer_offer.id", ondelete="RESTRICT")
    )
    result_version: Mapped[int] = mapped_column(BigInteger)
    result_offer_version: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
