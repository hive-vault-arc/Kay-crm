"""Dated stock commitments, with a database-level overlap constraint."""

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    String,
    func,
    literal_column,
    text,
)
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

PERIOD_ORDER = "start_on < end_on AND start_on >= '2000-01-01' AND end_on <= '2101-01-01'"
PERIOD_KIND = "kind IN ('booking','closure')"
PERIOD_RELEASE = (
    "(cancelled_at IS NULL AND cancel_event_id IS NULL AND cancellation_reason IS NULL) OR "
    "(cancelled_at IS NOT NULL AND cancel_event_id IS NOT NULL AND cancellation_reason IS NOT NULL)"
)
OVERLAP = "property_period_no_overlap"


def overlap_constraint() -> ExcludeConstraint:
    return ExcludeConstraint(
        (
            # A closed singleton UUID range overlaps only the same property UUID.
            func.property_uuid_range(
                literal_column("property_id"), literal_column("property_id"), literal_column("'[]'")
            ),
            "&&",
        ),
        (func.daterange(literal_column("start_on"), literal_column("end_on")), "&&"),
        where=text("cancelled_at IS NULL"),
        name=OVERLAP,
    )


class PropertyPeriod(Base):
    __tablename__ = "property_period"
    __table_args__ = (
        CheckConstraint(PERIOD_ORDER, name="property_period_order"),
        CheckConstraint(PERIOD_KIND, name="property_period_kind"),
        CheckConstraint(PERIOD_RELEASE, name="property_period_release"),
        overlap_constraint(),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(
        ForeignKey("property.id", ondelete="RESTRICT"), index=True
    )
    kind: Mapped[str] = mapped_column(String(12))
    start_on: Mapped[date] = mapped_column(Date)
    end_on: Mapped[date] = mapped_column(Date)
    note: Mapped[str] = mapped_column(String(500), server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    create_event_id: Mapped[UUID] = mapped_column(
        ForeignKey("inventory_event.id", ondelete="RESTRICT")
    )
    cancellation_reason: Mapped[str | None] = mapped_column(String(500))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_event_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("inventory_event.id", ondelete="RESTRICT")
    )
