"""Financial facts are append-only; the commission row is only a versioned head."""

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


class Commission(Base):
    __tablename__ = "commission"
    __table_args__ = (CheckConstraint("version>0", name="commission_version"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    deal_id: Mapped[UUID] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"), index=True)
    version: Mapped[int] = mapped_column(BigInteger, default=1)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CommissionRevision(Base):
    __tablename__ = "commission_revision"
    __table_args__ = (
        CheckConstraint("version>0", name="commission_revision_version"),
        CheckConstraint("state IN ('expected','recognized')", name="commission_revision_state"),
        CheckConstraint(
            "action IN ('created','recognized','commission_corrected','receipt',"
            "'receipt_corrected','reopen_review')",
            name="commission_revision_action",
        ),
        CheckConstraint(
            "base_mad>0 AND base_mad<'Infinity'::numeric "
            "AND amount_mad>0 AND amount_mad<'Infinity'::numeric",
            name="commission_revision_finite",
        ),
        CheckConstraint(
            "(kind='fixed' AND rate_percent IS NULL) OR (kind='percentage' "
            "AND rate_percent>0 AND rate_percent<'Infinity'::numeric "
            "AND amount_mad=round(base_mad*rate_percent/100,2))",
            name="commission_revision_calculation",
        ),
        CheckConstraint(
            "(version=1)=(previous_revision_id IS NULL)", name="commission_revision_previous"
        ),
        Index("uq_commission_revision_version", "commission_id", "version", unique=True),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    commission_id: Mapped[UUID] = mapped_column(ForeignKey("commission.id", ondelete="RESTRICT"))
    version: Mapped[int] = mapped_column(BigInteger)
    previous_revision_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("commission_revision.id", ondelete="RESTRICT"), unique=True
    )
    kind: Mapped[str] = mapped_column(String(12))
    base_mad: Mapped[Decimal] = mapped_column(Numeric(24, 8))
    rate_percent: Mapped[Decimal | None] = mapped_column(Numeric(12, 8))
    amount_mad: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    due_on: Mapped[date | None] = mapped_column(Date)
    state: Mapped[str] = mapped_column(String(12))
    review_required: Mapped[bool] = mapped_column(default=False)
    action: Mapped[str] = mapped_column(String(24))
    reason: Mapped[str] = mapped_column(String(1000), default="")
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    actor_name: Mapped[str] = mapped_column(String(160))
    receipt_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("receipt.id", ondelete="RESTRICT"), unique=True
    )
    reopening_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("deal_reopening.id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Receipt(Base):
    __tablename__ = "receipt"
    __table_args__ = (
        CheckConstraint(
            "amount_mad IS NULL OR (amount_mad>0 AND amount_mad<'Infinity'::numeric)",
            name="receipt_positive_finite",
        ),
        CheckConstraint(
            "supersedes_id IS NOT NULL OR amount_mad IS NOT NULL",
            name="receipt_void_correction_only",
        ),
        CheckConstraint("length(btrim(reason)) BETWEEN 1 AND 1000", name="receipt_reason"),
        CheckConstraint(
            "(evidence_document_id IS NULL)=(evidence_version_id IS NULL)",
            name="receipt_evidence_pair",
        ),
        Index("ix_receipt_commission_date", "commission_id", "received_on", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    commission_id: Mapped[UUID] = mapped_column(ForeignKey("commission.id", ondelete="RESTRICT"))
    supersedes_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("receipt.id", ondelete="RESTRICT"), unique=True
    )
    amount_mad: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    received_on: Mapped[date] = mapped_column(Date)
    evidence_document_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("document.id", ondelete="RESTRICT")
    )
    evidence_version_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("document_version.id", ondelete="RESTRICT")
    )
    reason: Mapped[str] = mapped_column(String(1000))
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    actor_name: Mapped[str] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FinanceReceipt(Base):
    __tablename__ = "finance_command_receipt"
    __table_args__ = (
        CheckConstraint("octet_length(request_hash)=32", name="finance_receipt_hash"),
    )
    actor_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    route: Mapped[str] = mapped_column(String(120), primary_key=True)
    key: Mapped[UUID] = mapped_column(primary_key=True)
    commission_id: Mapped[UUID] = mapped_column(ForeignKey("commission.id", ondelete="RESTRICT"))
    request_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    result: Mapped[dict[str, object]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
