"""Persistent holds retain their original target and a single explicit release."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Reservation(Base):
    __tablename__ = "reservation"
    __table_args__ = (
        Index(
            "uq_reservation_active_offering",
            "offering_id",
            unique=True,
            postgresql_where=text("released_at IS NULL"),
        ),
        Index(
            "uq_reservation_active_deal",
            "deal_id",
            unique=True,
            postgresql_where=text("released_at IS NULL"),
        ),
        CheckConstraint(
            "previous_stage IN ('new','visit','negotiation','documents')",
            name="reservation_previous_stage",
        ),
        CheckConstraint(
            "(released_at IS NULL AND released_by_user_id IS NULL AND "
            "release_reason IS NULL AND release_event_id IS NULL) OR "
            "(released_at IS NOT NULL AND released_at>=created_at AND "
            "released_by_user_id IS NOT NULL AND release_event_id IS NOT NULL "
            "AND release_reason IS NOT NULL AND length(btrim(release_reason)) BETWEEN 1 AND 1000)",
            name="reservation_release",
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    deal_id: Mapped[UUID] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"), index=True)
    offering_id: Mapped[UUID] = mapped_column(ForeignKey("offering.id", ondelete="RESTRICT"))
    previous_stage: Mapped[str] = mapped_column(String(16))
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reserve_event_id: Mapped[UUID] = mapped_column(
        ForeignKey("inventory_event.id", ondelete="RESTRICT")
    )
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    released_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    release_reason: Mapped[str | None] = mapped_column(String(1000))
    release_event_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("inventory_event.id", ondelete="RESTRICT")
    )
