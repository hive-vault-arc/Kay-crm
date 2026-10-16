"""Bounded inclusive civil dates, not caller-supplied roles or aggregate scopes."""

from datetime import date, datetime, timedelta
from typing import Literal, Self
from uuid import UUID

from pydantic import model_validator

from app.schedule.contracts import Strict
from app.schedule.rules import ZONE
from app.work.contracts import PageQuery

Metric = Literal[
    "contacts",
    "enquiries",
    "active_deals",
    "won",
    "lost",
    "cancelled",
    "activities",
    "developments",
    "standalone",
    "units",
    "property_offerings",
    "development_offerings",
    "collections",
]


class PeriodQuery(Strict):
    start_on: date | None = None
    end_on: date | None = None

    @model_validator(mode="after")
    def dates(self) -> Self:
        if (self.start_on is None) != (self.end_on is None):
            raise ValueError("BOTH_DATES_REQUIRED")
        if self.start_on and self.end_on:
            if not 0 <= (self.end_on - self.start_on).days <= 365:
                raise ValueError("INVALID_REPORT_PERIOD")
            if self.start_on.year < 1900 or self.end_on.year > 2100:
                raise ValueError("INVALID_REPORT_YEAR")
        return self

    def resolved(self, now: datetime) -> tuple[date, date]:
        today = now.astimezone(ZONE).date()
        start = self.start_on or today.replace(day=1)
        following = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        return start, self.end_on or following - timedelta(days=1)


class DrillQuery(PeriodQuery, PageQuery):
    metric: Metric
    attribution_id: UUID | None = None


class ActivityQuery(PeriodQuery, PageQuery):
    attribution_id: UUID | None = None


class ExceptionQuery(PageQuery):
    kind: Literal["stale_inventory", "inactive_deals"] = "stale_inventory"
