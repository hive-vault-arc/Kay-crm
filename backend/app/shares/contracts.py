"""Only these typed fields can cross the public listing boundary."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

TargetKind = Literal["property", "development"]
Category = Literal[
    "apartment", "villa", "house", "land", "commercial", "riad", "room", "office", "farm", "mixed"
]
Period = Literal["sale", "month", "year", "week", "day", "night"]
LEGACY_PHOTO_LIMIT = 24
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]
Neighbourhood = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]
Money = Annotated[
    str,
    StringConstraints(pattern=r"^(?:[1-9][0-9]{0,15}(?:\.[0-9]{1,2})?|0\.(?:[1-9][0-9]?|0[1-9]))$"),
]


class StrictBody(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ListingDraftInput(StrictBody):
    title: Title
    description: Description = ""
    neighbourhood: Neighbourhood = ""
    price_mad: Money | None = None
    price_period: Period | None = None
    photos: list[UUID]
    target_version: int = Field(gt=0, strict=True)
    expected_version: int = Field(ge=0, strict=True)

    @model_validator(mode="after")
    def check_options(self) -> ListingDraftInput:
        if (self.price_mad is None) != (self.price_period is None):
            raise ValueError("Price requires a period")
        if len(set(self.photos)) != len(self.photos):
            raise ValueError("Duplicate photos")
        return self


class ApproveListing(ListingDraftInput):
    photos: list[UUID] = Field(max_length=LEGACY_PHOTO_LIMIT)


class PublicFacts(StrictBody):
    title: Title
    description: Description
    neighbourhood: Neighbourhood
    price_mad: Money | None
    price_period: Period | None
    kind: TargetKind
    category: Category
    area_sqm: str | None
    rooms: int | None


class Snapshot(PublicFacts):
    photos: list[UUID]


class ExpectedVersion(StrictBody):
    expected_version: int = Field(gt=0, strict=True)
