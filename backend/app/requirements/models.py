"""Independent searches, typed criteria, exact offering links and safe retry identities."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    LargeBinary,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Requirement(Base):
    __tablename__ = "requirement"
    __table_args__ = (
        CheckConstraint("intent IN ('sale','rental')", name="requirement_intent"),
        CheckConstraint("currency='MAD'", name="requirement_currency"),
        CheckConstraint("length(btrim(title)) > 0", name="requirement_title"),
        CheckConstraint("version > 0", name="requirement_version"),
        CheckConstraint(
            "(intent='sale' AND budget_period IS NULL) OR (intent='rental' AND "
            "budget_period IS NOT NULL AND budget_period IN ('month','year'))",
            name="requirement_period",
        ),
        CheckConstraint(
            "budget_min_mad IS NULL OR (budget_min_mad > 0 AND budget_min_mad != 'NaN'::numeric)",
            name="requirement_min",
        ),
        CheckConstraint(
            "budget_max_mad IS NULL OR (budget_max_mad > 0 AND budget_max_mad != 'NaN'::numeric)",
            name="requirement_max",
        ),
        CheckConstraint(
            "budget_min_mad IS NULL OR budget_max_mad IS NULL OR budget_min_mad <= budget_max_mad",
            name="requirement_range",
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    contact_id: Mapped[UUID] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    origin_contact_id: Mapped[UUID] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    intent: Mapped[str] = mapped_column(String(8))
    currency: Mapped[str] = mapped_column(String(3), server_default="MAD")
    budget_min_mad: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    budget_max_mad: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    budget_period: Mapped[str | None] = mapped_column(String(5))
    version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    updated_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RequirementCriterion(Base):
    __tablename__ = "requirement_criterion"
    __table_args__ = (
        CheckConstraint("importance IN ('required','preferred')", name="criterion_importance"),
        CheckConstraint(
            "key IN ('category','location','area_sqm','rooms','parking','elevator')",
            name="criterion_key",
        ),
        CheckConstraint(
            "num_nonnulls(value_text,value_number,value_bool) <= 1", name="criterion_one_value"
        ),
        CheckConstraint(
            "(key='category' AND value_number IS NULL AND value_bool IS NULL AND "
            "(value_text IS NULL OR value_text IN "
            "('villa','house','apartment','land','commercial'))) "
            "OR (key='location' AND value_number IS NULL AND value_bool IS NULL AND "
            "(value_text IS NULL OR length(btrim(value_text))>0)) OR (key IN "
            "('area_sqm','rooms') AND value_text IS NULL AND value_bool IS NULL AND "
            "(value_number IS NULL OR (value_number>0 AND value_number!='NaN'::numeric "
            "AND (key<>'rooms' OR (value_number=trunc(value_number) AND "
            "value_number<=1000))))) OR (key IN ('parking','elevator') AND value_text IS "
            "NULL AND value_number IS NULL)",
            name="criterion_typed_value",
        ),
    )
    requirement_id: Mapped[UUID] = mapped_column(
        ForeignKey("requirement.id", ondelete="RESTRICT"), primary_key=True
    )
    key: Mapped[str] = mapped_column(String(16), primary_key=True)
    importance: Mapped[str] = mapped_column(String(10))
    value_text: Mapped[str | None] = mapped_column(String(500))
    value_number: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    value_bool: Mapped[bool | None]


class ShortlistEntry(Base):
    __tablename__ = "shortlist_entry"
    requirement_id: Mapped[UUID] = mapped_column(
        ForeignKey("requirement.id", ondelete="RESTRICT"), primary_key=True
    )
    offering_id: Mapped[UUID] = mapped_column(
        ForeignKey("offering.id", ondelete="RESTRICT"), primary_key=True
    )
    feedback: Mapped[str | None] = mapped_column(String(2000))
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    updated_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RequirementReceipt(Base):
    __tablename__ = "requirement_command_receipt"
    __table_args__ = (
        CheckConstraint(
            "result_version>0 AND octet_length(request_hash)=32", name="requirement_receipt_valid"
        ),
    )
    actor_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    route: Mapped[str] = mapped_column(String(160), primary_key=True)
    key: Mapped[UUID] = mapped_column(primary_key=True)
    request_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    requirement_id: Mapped[UUID] = mapped_column(
        ForeignKey("requirement.id", ondelete="RESTRICT"), index=True
    )
    result_version: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
