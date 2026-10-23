"""Standalone assets, distinct campaigns and durable typed provenance."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    LargeBinary,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Property(Base):
    __tablename__ = "property"
    __table_args__ = (
        CheckConstraint(
            "category IN ('villa','house','apartment','land','commercial',"
            "'riad','room','office','farm')",
            name="property_category",
        ),
        CheckConstraint(
            "reference = upper(btrim(reference)) AND length(reference) > 0",
            name="property_reference",
        ),
        CheckConstraint("area_sqm IS NULL OR area_sqm > 0", name="property_area"),
        CheckConstraint(
            "area_sqm IS NULL OR area_sqm != 'NaN'::numeric", name="property_area_finite"
        ),
        CheckConstraint("version > 0", name="property_version"),
        CheckConstraint("rooms IS NULL OR rooms BETWEEN 1 AND 1000", name="property_rooms"),
        Index("ix_property_updated_id", "updated_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    reference: Mapped[str] = mapped_column(String(80), unique=True)
    category: Mapped[str] = mapped_column(String(20))
    marketing_name: Mapped[str | None] = mapped_column(String(160))
    location: Mapped[str | None] = mapped_column(String(500))
    listing_details: Mapped[dict[str, object]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    area_sqm: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    development_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT"), index=True
    )
    floor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("floor.id", ondelete="RESTRICT"), index=True
    )
    unit_type_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("unit_type.id", ondelete="RESTRICT"), index=True
    )
    rooms: Mapped[int | None]
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PropertyOwner(Base):
    __tablename__ = "property_owner"
    __table_args__ = (
        Index(
            "uq_property_owner_active",
            "property_id",
            "contact_id",
            unique=True,
            postgresql_where=text("archived_at IS NULL"),
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(
        ForeignKey("property.id", ondelete="RESTRICT"), index=True
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


class Offering(Base):
    __tablename__ = "offering"
    __table_args__ = (
        CheckConstraint(
            "(property_id IS NULL) != (development_id IS NULL)", name="offering_target_xor"
        ),
        Index(
            "uq_offering_development_current",
            "development_id",
            "kind",
            unique=True,
            postgresql_where=text("is_current"),
        ),
        CheckConstraint("kind IN ('sale','rental','holiday')", name="offering_kind"),
        CheckConstraint(
            "state IN ('draft','available','reserved','withdrawn','sold','rented','review')",
            name="offering_state",
        ),
        CheckConstraint("currency = 'MAD'", name="offering_currency"),
        CheckConstraint("price_mad IS NULL OR price_mad > 0", name="offering_price"),
        CheckConstraint(
            "price_mad IS NULL OR price_mad != 'NaN'::numeric", name="offering_price_finite"
        ),
        CheckConstraint(
            "(kind = 'sale' AND price_period IS NULL) OR (kind = 'rental' "
            "AND price_period IN ('month','year')) OR (kind = 'holiday' "
            "AND price_period IN ('day','week','month'))",
            name="offering_period",
        ),
        CheckConstraint("(state = 'withdrawn') = (NOT is_current)", name="offering_current_state"),
        CheckConstraint(
            "state NOT IN ('available','reserved') OR (price_mad > 0 AND price_mad IS NOT NULL "
            "AND availability_confirmed_at IS NOT NULL)",
            name="offering_available_price",
        ),
        CheckConstraint("version > 0", name="offering_version"),
        Index(
            "uq_offering_current",
            "property_id",
            "kind",
            unique=True,
            postgresql_where=text("is_current"),
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    property_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("property.id", ondelete="RESTRICT"), index=True
    )
    development_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT"), index=True
    )
    kind: Mapped[str] = mapped_column(String(10))
    price_mad: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    currency: Mapped[str] = mapped_column(String(3), server_default="MAD")
    price_period: Mapped[str | None] = mapped_column(String(10))
    conditions: Mapped[str] = mapped_column(String(2000), server_default="")
    state: Mapped[str] = mapped_column(String(12), server_default="draft")
    is_current: Mapped[bool] = mapped_column(server_default="true")
    availability_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryEvent(Base):
    __tablename__ = "inventory_event"
    __table_args__ = (
        Index("ix_inventory_event_property_time", "property_id", "occurred_at", "id"),
        CheckConstraint(
            "price_mad IS NULL OR (price_mad > 0 AND price_mad != 'NaN'::numeric)",
            name="inventory_event_price",
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    property_id: Mapped[UUID | None] = mapped_column(ForeignKey("property.id", ondelete="RESTRICT"))
    development_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT"), index=True
    )
    offering_id: Mapped[UUID | None] = mapped_column(ForeignKey("offering.id", ondelete="RESTRICT"))
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    actor_display_name: Mapped[str] = mapped_column(String(160))
    action: Mapped[str] = mapped_column(String(40))
    property_version: Mapped[int] = mapped_column(BigInteger)
    offering_version: Mapped[int | None] = mapped_column(BigInteger)
    state: Mapped[str | None] = mapped_column(String(12))
    price_mad: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    price_period: Mapped[str | None] = mapped_column(String(10))
    conditions: Mapped[str | None] = mapped_column(String(2000))
    reason: Mapped[str] = mapped_column(String(1000), server_default="")
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class InventoryReceipt(Base):
    __tablename__ = "inventory_command_receipt"
    actor_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    route: Mapped[str] = mapped_column(String(120), primary_key=True)
    key: Mapped[UUID] = mapped_column(primary_key=True)
    request_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    property_id: Mapped[UUID | None] = mapped_column(ForeignKey("property.id", ondelete="RESTRICT"))
    development_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT"), index=True
    )
    offering_id: Mapped[UUID | None] = mapped_column(ForeignKey("offering.id", ondelete="RESTRICT"))
    event_id: Mapped[UUID] = mapped_column(ForeignKey("inventory_event.id", ondelete="RESTRICT"))
    version: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
