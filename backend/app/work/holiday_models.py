"""Durable Moroccan holiday occurrences and per-source sync state."""

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class HolidayOccurrence(Base):
    __tablename__ = "holiday_occurrence"
    __table_args__ = (
        Index("ix_holiday_occurrence_start", "start_on"),
        UniqueConstraint("year", "code", name="uq_holiday_year_code"),
        CheckConstraint("category IN ('national','amazigh','religious')", name="holiday_category"),
        CheckConstraint(
            "status IN ('pending','estimated','fixed','confirmed','manual') "
            "AND ((status='pending' AND start_on IS NULL AND end_on IS NULL) OR "
            "(status<>'pending' AND start_on IS NOT NULL AND end_on IS NOT NULL "
            "AND end_on BETWEEN start_on AND start_on + 1 "
            "AND EXTRACT(year FROM start_on)=year))",
            name="holiday_date_state",
        ),
        CheckConstraint("version>0", name="holiday_version"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    year: Mapped[int]
    code: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(12))
    status: Mapped[str] = mapped_column(String(12))
    start_on: Mapped[date | None] = mapped_column(Date)
    end_on: Mapped[date | None] = mapped_column(Date)
    source_url: Mapped[str] = mapped_column(String(2048))
    version: Mapped[int] = mapped_column(BigInteger, default=1)


class HolidaySync(Base):
    __tablename__ = "holiday_sync"
    provider: Mapped[str] = mapped_column(String(20), primary_key=True)
    year: Mapped[int] = mapped_column(primary_key=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    succeeded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(24))


class HolidayConfirmation(Base):
    __tablename__ = "holiday_confirmation"
    __table_args__ = (
        UniqueConstraint(
            "occurrence_id", "actor_id", "request_key", name="uq_holiday_confirmation_retry"
        ),
    )
    occurrence_id: Mapped[UUID] = mapped_column(
        ForeignKey("holiday_occurrence.id", ondelete="RESTRICT"), primary_key=True
    )
    version: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    request_key: Mapped[UUID]
    start_on: Mapped[date] = mapped_column(Date)
    end_on: Mapped[date] = mapped_column(Date)
    source_url: Mapped[str] = mapped_column(String(2048))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
