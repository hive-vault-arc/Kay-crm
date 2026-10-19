"""Development-scoped structure; templates never represent physical stock."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Development(Base):
    __tablename__ = "development"
    __table_args__ = (
        CheckConstraint(
            "category IN ('mixed','villa','house','apartment','land','commercial')",
            name="development_category",
        ),
        CheckConstraint(
            "reference = upper(btrim(reference)) AND length(reference)>0",
            name="development_reference",
        ),
        CheckConstraint(
            "briefing_text IS NULL OR length(briefing_text)<=10000", name="development_briefing"
        ),
        CheckConstraint("version>0", name="development_version"),
        Index("ix_development_updated_id", "updated_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    reference: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(20), server_default="mixed")
    location: Mapped[str | None] = mapped_column(String(500))
    briefing_text: Mapped[str | None] = mapped_column(Text)
    developer_contact_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    developer_marketing_display: Mapped[str | None] = mapped_column(String(160))
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DevelopmentOwner(Base):
    __tablename__ = "development_owner"
    __table_args__ = (
        Index(
            "uq_development_owner_active",
            "development_id",
            "contact_id",
            unique=True,
            postgresql_where=text("archived_at IS NULL"),
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    development_id: Mapped[UUID] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT"), index=True
    )
    contact_id: Mapped[UUID] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    origin_contact_id: Mapped[UUID] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    marketing_display: Mapped[str | None] = mapped_column(String(160))
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Block(Base):
    __tablename__ = "block"
    __table_args__ = (
        UniqueConstraint("development_id", "code", name="uq_block_code"),
        CheckConstraint("display_order>=0", name="block_order"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    development_id: Mapped[UUID] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT"), index=True
    )
    code: Mapped[str] = mapped_column(String(40))
    label: Mapped[str] = mapped_column(String(160))
    display_order: Mapped[int] = mapped_column(server_default="0")


class Floor(Base):
    __tablename__ = "floor"
    __table_args__ = (
        UniqueConstraint("block_id", "code", name="uq_floor_code"),
        CheckConstraint("display_order>=0", name="floor_order"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    block_id: Mapped[UUID] = mapped_column(ForeignKey("block.id", ondelete="RESTRICT"), index=True)
    code: Mapped[str] = mapped_column(String(40))
    label: Mapped[str] = mapped_column(String(160))
    display_order: Mapped[int] = mapped_column(server_default="0")


class UnitType(Base):
    __tablename__ = "unit_type"
    __table_args__ = (
        UniqueConstraint("development_id", "code", name="uq_unit_type_code"),
        CheckConstraint(
            "category IN ('villa','house','apartment','land','commercial')",
            name="unit_type_category",
        ),
        CheckConstraint(
            "default_area_sqm IS NULL OR (default_area_sqm>0 AND default_area_sqm!='NaN'::numeric)",
            name="unit_type_area",
        ),
        CheckConstraint(
            "default_rooms IS NULL OR default_rooms BETWEEN 1 AND 1000", name="unit_type_rooms"
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    development_id: Mapped[UUID] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT"), index=True
    )
    code: Mapped[str] = mapped_column(String(40))
    label: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(20))
    default_area_sqm: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    default_rooms: Mapped[int | None]
