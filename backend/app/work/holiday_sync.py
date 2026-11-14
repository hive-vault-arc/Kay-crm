"""Sync public holiday data outside transactions in a dedicated worker thread."""

import logging
from collections.abc import Callable
from datetime import UTC, datetime, time
from http.client import HTTPException
from threading import Event

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db.session import Database
from app.recovery.maintenance import Admission
from app.schedule.rules import ZONE
from app.work.holiday_models import HolidayOccurrence, HolidaySync
from app.work.holiday_sources import PROVIDERS, Holiday, Provider, UnsupportedYear, fetch
from app.work.holidays import CONFIRMED, lock_agency, revise

logger = logging.getLogger("kay.holidays")


def _save(
    database: Database,
    provider: Provider,
    year: int,
    attempted: datetime,
    clock: datetime,
    values: list[Holiday],
    error: str | None,
) -> None:
    with database.session() as session, session.begin():
        if error is None and not lock_agency(session):
            raise RuntimeError("HOLIDAY_AGENCY_UNAVAILABLE")
        state = session.scalar(
            select(HolidaySync)
            .where(HolidaySync.provider == provider, HolidaySync.year == year)
            .with_for_update()
        )
        if state is None or state.attempted_at != attempted:
            return
        state.error_code = error
        if error is not None:
            return
        current = {
            row.code: row
            for row in session.scalars(
                select(HolidayOccurrence).where(HolidayOccurrence.year == year)
            )
        }
        for value in values:
            row = current.get(value.code)
            if row is None:
                session.add(
                    HolidayOccurrence(
                        year=year,
                        code=value.code,
                        name=value.name,
                        category=value.category,
                        status=value.status,
                        start_on=value.start_on,
                        end_on=value.end_on,
                        source_url=value.source_url,
                    )
                )
            elif (
                row.category == value.category
                and row.status != "manual"
                and (
                    value.status in CONFIRMED
                    or row.status == "pending"
                    or (row.status == "estimated" and value.status == "estimated")
                )
            ):
                revise(session, row, value)
        state.succeeded_at = clock


def sync_due(
    database: Database,
    admission: Admission,
    clock: Callable[[], datetime],
    fetcher: Callable[[Provider, int], list[Holiday]] = fetch,
    stop: Event | None = None,
) -> None:
    day = clock().astimezone(ZONE).date()
    midnight = datetime.combine(day, time.min, ZONE)
    for provider in PROVIDERS:
        for year in (day.year, day.year + 1):
            if (stop and stop.is_set()) or not admission.enter():
                return
            attempted = clock()
            try:
                with database.session() as session, session.begin():
                    claim = insert(HolidaySync).values(
                        provider=provider, year=year, attempted_at=attempted
                    )
                    claimed = session.scalar(
                        claim.on_conflict_do_update(
                            index_elements=["provider", "year"],
                            set_={"attempted_at": attempted},
                            where=HolidaySync.attempted_at < midnight,
                        ).returning(HolidaySync.year)
                    )
            finally:
                admission.leave()
            if not claimed:
                continue
            values, error = [], None
            try:
                values = fetcher(provider, year)
            except UnsupportedYear:
                error = "UNSUPPORTED_YEAR"
            except HTTPException, OSError:
                error = "FEED_UNAVAILABLE"
            except KeyError, TypeError, ValueError, OverflowError, RecursionError:
                error = "INVALID_FEED"
            if error:
                logger.warning("HOLIDAY_SYNC %s %d %s", provider, year, error)
            if (stop and stop.is_set()) or not admission.enter():
                return
            try:
                _save(database, provider, year, attempted, clock(), values, error)
            finally:
                admission.leave()


def sync_loop(database: Database, admission: Admission, stop: Event) -> None:
    while not stop.is_set():
        try:
            sync_due(database, admission, lambda: datetime.now(UTC), stop=stop)
        except Exception:
            logger.warning("HOLIDAY_SYNC_UNAVAILABLE")
        stop.wait(60)
