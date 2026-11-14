"""Deliver holiday notices and preserve confirmation history."""

from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated
from uuid import UUID

from pydantic import StringConstraints, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import Database
from app.files.models import Notification
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError
from app.identity.users import administrator
from app.schedule.contracts import Strict, Version
from app.schedule.rules import ZONE
from app.work.holiday_models import HolidayConfirmation, HolidayOccurrence, HolidaySync
from app.work.holiday_sources import Holiday, official_link

EVE = "holiday.eve"
TODAY = "holiday.today"
CONFIRMED = {"fixed", "confirmed", "manual"}
BATCH_SIZE = 100


class ConfirmHoliday(Strict):
    expected_version: Version
    start_on: date
    end_on: date
    source_url: Annotated[str, StringConstraints(max_length=2048)]

    @field_validator("start_on", "end_on", mode="before")
    @classmethod
    def parse_date(cls, value: object) -> date:
        if not isinstance(value, str) or len(value) != 10:
            raise ValueError("INVALID_HOLIDAY_DATE")
        day = date.fromisoformat(value)
        if day.isoformat() != value:
            raise ValueError("INVALID_HOLIDAY_DATE")
        return day

    @field_validator("source_url")
    @classmethod
    def validate_source(cls, value: str) -> str:
        if not official_link(value):
            raise ValueError("INVALID_HOLIDAY_SOURCE")
        return value


def holiday_at(day: date) -> datetime:
    return datetime.combine(day, time(9), ZONE)


def lock_agency(session: Session, *, skip_locked: bool = False) -> bool:
    return (
        session.scalar(
            select(Agency.id).where(Agency.id == AGENCY_ID).with_for_update(skip_locked=skip_locked)
        )
        is not None
    )


def deliver_holidays(database: Database, clock: datetime) -> int:
    day = clock.astimezone(ZONE).date()
    tomorrow = day + timedelta(days=1)
    delivered = 0
    with database.session() as session, session.begin():
        if not lock_agency(session, skip_locked=True):
            return 0
        occurrences = session.scalars(
            select(HolidayOccurrence)
            .where(HolidayOccurrence.start_on.in_([day, tomorrow]))
            .order_by(HolidayOccurrence.start_on, HolidayOccurrence.code)
        )
        for occurrence in occurrences:
            start = occurrence.start_on
            if start is None:
                continue
            at = holiday_at(start).astimezone(UTC)
            if start == tomorrow and clock >= at - timedelta(hours=24):
                kind = EVE
            elif start == day and occurrence.status in CONFIRMED and clock >= at:
                kind = TODAY
            else:
                continue
            key = f"{kind}:{occurrence.id}"
            recipients = session.scalars(
                select(User.id)
                .where(
                    User.state == "active",
                    User.deleted_at.is_(None),
                    ~select(Notification.id)
                    .where(Notification.user_id == User.id, Notification.event_key == key)
                    .exists(),
                )
                .order_by(User.id)
                .limit(BATCH_SIZE - delivered)
            ).all()
            session.add_all(
                Notification(
                    user_id=uid,
                    event_key=key,
                    kind=kind,
                    holiday_id=occurrence.id,
                    created_at=clock,
                )
                for uid in recipients
            )
            delivered += len(recipients)
            if delivered >= BATCH_SIZE:
                break
    return delivered


def revise(session: Session, row: HolidayOccurrence, value: Holiday) -> None:
    span = (row.start_on, row.end_on)
    new_span = (value.start_on, value.end_on)
    context_changed = (row.name, row.status, span) != (value.name, value.status, new_span)
    if not context_changed and row.source_url == value.source_url:
        return
    row.name = value.name
    row.status = value.status
    row.start_on, row.end_on = new_span
    row.source_url = value.source_url
    row.version += 1
    if not context_changed:
        return
    if span != new_span:
        session.flush()
        notices = session.scalars(
            select(Notification).where(Notification.holiday_id == row.id, Notification.kind == EVE)
        )
        for notice in notices:
            notice.read_at = None
            notice.holiday_revision = row.version
    # Existing notices render from the occurrence. Signal only their recipients.
    recipients = session.scalars(
        select(Notification.user_id).where(Notification.holiday_id == row.id).distinct()
    )
    session.info.setdefault("live_tables", set()).add("notification")
    session.info.setdefault("live_notifications", set()).update(str(uid) for uid in recipients)


def settings_view(
    database: Database, token: str, enabled: bool, clock: datetime
) -> dict[str, object]:
    year = clock.astimezone(ZONE).year
    with database.session() as session:
        administrator(session, token)
        occurrences = session.scalars(
            select(HolidayOccurrence)
            .where(HolidayOccurrence.year.in_([year, year + 1]))
            .order_by(HolidayOccurrence.year, HolidayOccurrence.start_on, HolidayOccurrence.name)
        )
        items = [
            {
                "id": str(row.id),
                "year": row.year,
                "name": row.name,
                "category": row.category,
                "status": row.status,
                "start_on": row.start_on.isoformat() if row.start_on else None,
                "end_on": row.end_on.isoformat() if row.end_on else None,
                "source_url": row.source_url,
                "version": row.version,
            }
            for row in occurrences
        ]
        sync = session.scalars(
            select(HolidaySync)
            .where(HolidaySync.year.in_([year, year + 1]))
            .order_by(HolidaySync.provider, HolidaySync.year)
        )
        return {
            "enabled": enabled,
            "items": items,
            "sync": [
                {
                    "provider": row.provider,
                    "year": row.year,
                    "attempted_at": row.attempted_at.isoformat(),
                    "succeeded_at": row.succeeded_at.isoformat() if row.succeeded_at else None,
                    "error_code": row.error_code,
                }
                for row in sync
            ],
        }


def confirm_holiday(
    database: Database,
    token: str,
    occurrence_id: UUID,
    key: UUID,
    body: ConfirmHoliday,
    clock: datetime,
    *,
    enabled: bool = True,
) -> dict[str, object]:
    with database.session() as session, session.begin():
        lock_agency(session)
        actor = administrator(session, token).user.id
        if not enabled:
            raise IdentityError("HOLIDAYS_DISABLED", 409)
        row = session.get(HolidayOccurrence, occurrence_id)
        if row is None or row.category != "religious":
            raise IdentityError("NOT_FOUND", 404)
        receipt = session.scalar(
            select(HolidayConfirmation).where(
                HolidayConfirmation.occurrence_id == occurrence_id,
                HolidayConfirmation.actor_id == actor,
                HolidayConfirmation.request_key == key,
            )
        )
        if receipt:
            if receipt.version != body.expected_version + 1 or (
                receipt.start_on,
                receipt.end_on,
                receipt.source_url,
            ) != (body.start_on, body.end_on, body.source_url):
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return {"id": str(row.id), "version": receipt.version}
        if body.expected_version != row.version:
            raise IdentityError("VERSION_CONFLICT", 409)
        if body.start_on.year != row.year or not 0 <= (body.end_on - body.start_on).days <= 1:
            raise IdentityError("VALIDATION_ERROR", 422)
        value = Holiday(
            row.code, row.name, row.category, "manual", body.start_on, body.end_on, body.source_url
        )
        before = row.version
        revise(session, row, value)
        # Record even an explicit confirmation matching a previous administrator decision.
        if before == row.version:
            row.version += 1
        session.add(
            HolidayConfirmation(
                occurrence_id=row.id,
                version=row.version,
                actor_id=actor,
                request_key=key,
                start_on=body.start_on,
                end_on=body.end_on,
                source_url=body.source_url,
                created_at=clock,
            )
        )
        return {"id": str(row.id), "version": row.version}
