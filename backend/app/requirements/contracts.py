"""Strict nullable facts: an unknown value is neither zero nor false."""

from decimal import Decimal
from typing import Literal, Self
from uuid import UUID

from pydantic import Field, StrictBool, StrictInt, StrictStr, model_validator

from app.inventory.contracts import Amount, StrictBody, Version


class Criterion(StrictBody):
    key: Literal["category", "location", "area_sqm", "rooms", "parking", "elevator"]
    importance: Literal["required", "preferred"]
    value: StrictStr | StrictInt | StrictBool | None

    @model_validator(mode="after")
    def typed_value(self) -> Self:
        value = self.value
        if value is None:
            return self
        if self.key in {"parking", "elevator"}:
            valid = type(value) is bool
        elif self.key == "rooms":
            valid = type(value) is int and 1 <= value <= 1000
        elif self.key == "area_sqm":
            import re

            valid = (
                isinstance(value, str)
                and bool(re.fullmatch(r"[0-9]{1,16}(\.[0-9]{1,2})?", value))
                and Decimal(value) > 0
            )
        elif self.key == "category":
            valid = value in {"villa", "house", "apartment", "land", "commercial"}
        else:
            valid = isinstance(value, str) and 1 <= len(value) <= 500
        if not valid:
            raise ValueError("INVALID_CRITERION_VALUE")
        return self


class RequirementFields(StrictBody):
    title: str = Field(min_length=1, max_length=160)
    intent: Literal["sale", "rental"]
    currency: Literal["MAD"] = "MAD"
    budget_min_mad: Amount | None = None
    budget_max_mad: Amount | None = None
    budget_period: Literal["month", "year"] | None = None
    criteria: list[Criterion] = Field(default_factory=list, max_length=6)

    @model_validator(mode="after")
    def consistent(self) -> Self:
        if (self.intent == "sale") != (self.budget_period is None):
            raise ValueError("INVALID_BUDGET_PERIOD")
        if (
            self.budget_min_mad
            and self.budget_max_mad
            and (Decimal(self.budget_min_mad) > Decimal(self.budget_max_mad))
        ):
            raise ValueError("INVALID_BUDGET_RANGE")
        if len({c.key for c in self.criteria}) != len(self.criteria):
            raise ValueError("DUPLICATE_CRITERION")
        return self


class NewRequirement(RequirementFields):
    contact_id: UUID


class EditRequirement(RequirementFields):
    expected_version: Version


class ShortlistChange(StrictBody):
    expected_version: Version
    offering_id: UUID
    expected_offering_version: Version
    feedback: str | None = Field(default=None, max_length=2000)


class RemoveShortlist(StrictBody):
    expected_version: Version


class RequirementQuery(StrictBody):
    contact_id: UUID
    page: int = Field(default=1, ge=1, le=1_000_000)
    page_size: int = Field(default=50, ge=1, le=100)
