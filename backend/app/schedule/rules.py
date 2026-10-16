"""Casablanca wall-clock rules with UTC identities for repeated clock hours."""

from datetime import UTC, datetime, timedelta
from typing import Protocol
from zoneinfo import ZoneInfo

from sqlalchemy import select, true
from sqlalchemy.orm import Session

from app.identity.models import AGENCY_ID
from app.schedule.contracts import Window
from app.schedule.models import BreakWindow, SchedulePolicy, Visit, WorkingWindow

ZONE = ZoneInfo("Africa/Casablanca")
ACTIVE = ("scheduled", "confirmed")


class Booking(Protocol):
    @property
    def type(self) -> str: ...

    @property
    def start_at(self) -> datetime: ...

    @property
    def end_at(self) -> datetime: ...


def hourly_intervals(start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
    # Casablanca's contemporary offsets are integral hours. UTC iteration preserves
    # the two identities of a repeated hour and never invents a skipped local hour.
    hour = start.astimezone(UTC).replace(minute=0, second=0, microsecond=0)
    result = []
    while hour < end:
        result.append((hour, hour + timedelta(hours=1)))
        hour += timedelta(hours=1)
    return result


def policy_view(session: Session) -> dict[str, object]:
    policy = session.get(SchedulePolicy, AGENCY_ID)
    if policy is None:
        raise RuntimeError("SCHEDULE_MIGRATION_REQUIRED")

    def windows[W: (WorkingWindow, BreakWindow)](model: type[W]) -> list[dict[str, object]]:
        return [
            {
                "weekday": w.weekday,
                "start_local": w.start_local.strftime("%H:%M"),
                "end_local": w.end_local.strftime("%H:%M"),
            }
            for w in session.scalars(select(model).order_by(model.weekday, model.start_local))
        ]

    return {
        "version": policy.version,
        "time_zone": "Africa/Casablanca",
        "company_car_capacity_per_hour": policy.company_car_capacity_per_hour,
        "working_windows": windows(WorkingWindow),
        "lunch_breaks": windows(BreakWindow),
    }


def work_error(booking: Booking, works: list[Window], breaks: list[Window]) -> str | None:
    if booking.type == "office":
        return None
    if not works:
        return "VISIT_SCHEDULE_NOT_CONFIGURED"
    # Inputs have minute precision; examine every real minute, including both folds
    # of a repeated hour. Adjacent working windows remain a continuous work period.
    cursor = booking.start_at
    while cursor < booking.end_at:
        local = cursor.astimezone(ZONE)
        clock = local.time()
        if not any(
            w.weekday == local.isoweekday() and w.start_local <= clock < w.end_local for w in works
        ):
            return "VISIT_OUTSIDE_WORKING_HOURS"
        if any(
            b.weekday == local.isoweekday() and b.start_local <= clock < b.end_local for b in breaks
        ):
            return "VISIT_LUNCH_BREAK"
        cursor += timedelta(minutes=1)
    return None


def policy_windows(view: dict[str, object], key: str) -> list[Window]:
    from pydantic import TypeAdapter

    return TypeAdapter(list[Window]).validate_python(view[key])


def capacity_intervals(
    session: Session, booking: Booking, capacity: int, excluding: object = None
) -> list[dict[str, object]]:
    intervals = hourly_intervals(booking.start_at, booking.end_at)
    if not intervals:
        return []
    rows = session.scalars(
        select(Visit).where(
            Visit.type == "company_car",
            Visit.status.in_(ACTIVE),
            Visit.id != excluding if excluding else true(),
            Visit.start_at < intervals[-1][1],
            Visit.end_at > intervals[0][0],
        )
    ).all()
    return [
        {
            "start_at": a.isoformat(),
            "end_at": b.isoformat(),
            "local_label": a.astimezone(ZONE).isoformat(),
            "used": sum(v.start_at < b and v.end_at > a for v in rows),
            "capacity": capacity,
            "remaining": max(0, capacity - sum(v.start_at < b and v.end_at > a for v in rows)),
        }
        for a, b in intervals
    ]


def hard_error(
    session: Session, booking: Booking, policy: dict[str, object], excluding: object = None
) -> str | None:
    error = work_error(
        booking, policy_windows(policy, "working_windows"), policy_windows(policy, "lunch_breaks")
    )
    if error or booking.type != "company_car":
        return error
    capacity = int(str(policy["company_car_capacity_per_hour"]))
    if any(
        slot["remaining"] == 0 for slot in capacity_intervals(session, booking, capacity, excluding)
    ):
        return "COMPANY_CAR_CAPACITY_FULL"
    return None
