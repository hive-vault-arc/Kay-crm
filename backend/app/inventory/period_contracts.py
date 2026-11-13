"""Civil-date property calendar queries and versioned commands."""

from datetime import date
from typing import Annotated, Literal, Self

from pydantic import BeforeValidator, Field, field_validator, model_validator

from app.inventory.contracts import StrictBody, Version

FIRST_DAY = date(2000, 1, 1)
LAST_BOUNDARY = date(2101, 1, 1)


def date_only(value: object) -> date:
    if type(value) is date:
        return value
    if isinstance(value, str) and len(value) == 10 and value[4:5] == "-" and value[7:8] == "-":
        return date.fromisoformat(value)
    raise ValueError("CIVIL_DATE_REQUIRED")


CivilDate = Annotated[date, BeforeValidator(date_only)]


class CalendarMonth(StrictBody):
    month: CivilDate

    @field_validator("month")
    @classmethod
    def first_of_month(cls, value: date) -> date:
        if value.day != 1 or not FIRST_DAY <= value < LAST_BOUNDARY:
            raise ValueError("INVALID_CALENDAR_MONTH")
        return value


class SavePeriod(StrictBody):
    expected_version: Version
    kind: Literal["booking", "closure"]
    start_on: CivilDate
    end_on: CivilDate
    note: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def valid_period(self) -> Self:
        if not FIRST_DAY <= self.start_on < self.end_on <= LAST_BOUNDARY:
            raise ValueError("INVALID_PROPERTY_PERIOD")
        return self


class CancelPeriod(StrictBody):
    expected_version: Version
    reason: str = Field(min_length=1, max_length=500)
