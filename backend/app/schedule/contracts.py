"""Strict scheduling inputs, with minute-precision offset-aware instants."""

from datetime import UTC, datetime, time, timedelta
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
Reason = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]
VisitType = Literal["company_car", "without_company_car", "office"]
Status = Literal["draft", "scheduled", "confirmed", "completed", "cancelled"]
Version = Annotated[int, Field(strict=True, gt=0)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Window(Strict):
    weekday: Annotated[int, Field(strict=True, ge=1, le=7)]
    start_local: time
    end_local: time

    @model_validator(mode="after")
    def bounds(self) -> Self:
        if self.start_local >= self.end_local or any(
            t.tzinfo or t.second or t.microsecond for t in (self.start_local, self.end_local)
        ):
            raise ValueError("INVALID_WORK_WINDOW")
        return self


class PolicyEdit(Strict):
    expected_version: Version
    company_car_capacity_per_hour: Annotated[int, Field(strict=True, ge=1, le=1000)]
    working_windows: Annotated[list[Window], Field(max_length=42)]
    lunch_breaks: Annotated[list[Window], Field(max_length=42)]

    @model_validator(mode="after")
    def windows(self) -> Self:
        for rows in (self.working_windows, self.lunch_breaks):
            ordered = sorted(rows, key=lambda w: (w.weekday, w.start_local))
            for a, b in zip(ordered, ordered[1:], strict=False):
                if a.weekday == b.weekday and a.end_local > b.start_local:
                    raise ValueError("OVERLAPPING_WINDOWS")
        if any(
            not any(
                w.weekday == b.weekday
                and w.start_local <= b.start_local
                and b.end_local <= w.end_local
                for w in self.working_windows
            )
            for b in self.lunch_breaks
        ):
            raise ValueError("BREAK_OUTSIDE_WORK_WINDOW")
        return self


class PolicySave(PolicyEdit):
    preview_hash: Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]


class Period(Strict):
    start_at: AwareDatetime
    end_at: AwareDatetime

    @field_validator("start_at", "end_at")
    @classmethod
    def instant(cls, value: datetime) -> datetime:
        if value.second or value.microsecond or not 2000 <= value.year <= 2100:
            raise ValueError("MINUTE_PRECISION_REQUIRED")
        return value.astimezone(UTC)

    @model_validator(mode="after")
    def period(self) -> Self:
        if not timedelta(0) < self.end_at - self.start_at <= timedelta(days=8):
            raise ValueError("INVALID_VISIT_PERIOD")
        return self


class VisitFields(Period):
    type: VisitType
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
    location: Text
    participant_ids: Annotated[list[UUID], Field(min_length=1, max_length=100)]
    overlap_reason: Reason = ""
    deal_id: UUID | None = None
    property_id: UUID | None = None

    @model_validator(mode="after")
    def duration(self) -> Self:
        if self.end_at - self.start_at > timedelta(days=7):
            raise ValueError("INVALID_VISIT_PERIOD")
        return self

    @field_validator("participant_ids")
    @classmethod
    def unique(cls, values: list[UUID]) -> list[UUID]:
        if len(values) != len(set(values)):
            raise ValueError("DUPLICATE_PARTICIPANT")
        return sorted(values)


class NewVisit(VisitFields):
    contact_id: UUID
    status: Literal["draft", "scheduled"] = "scheduled"


class EditVisit(VisitFields):
    expected_version: Version


class VisitAction(Strict):
    expected_version: Version
    reason: Reason = ""


class FinishVisit(VisitAction):
    reason: Text


class CalendarQuery(Period):
    page: Annotated[int, Field(ge=1, le=1_000_000)] = 1
    page_size: Annotated[int, Field(ge=1, le=100)] = 50
    contact_id: UUID | None = None
    user_id: UUID | None = None


class AvailabilityQuery(Period):
    type: VisitType
    exclude_visit_id: UUID | None = None

    @model_validator(mode="after")
    def duration(self) -> Self:
        if self.end_at - self.start_at > timedelta(days=7):
            raise ValueError("INVALID_VISIT_PERIOD")
        return self
