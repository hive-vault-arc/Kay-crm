"""Manual interaction fields never accept historical authors or business transitions."""

from typing import Annotated, Literal

from pydantic import Field, StringConstraints, field_validator

from app.contacts.contracts import StrictBody

ActivityKind = Literal["note", "call", "message", "email", "meeting", "visit", "other"]
MANUAL_KINDS = ("note", "call", "message", "email", "meeting", "visit", "other")
ProjectLabel = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=160, pattern=r"^[^\x00]+$"),
]


class NewActivity(StrictBody):
    kind: ActivityKind = "note"
    body: str = Field(min_length=1, max_length=4000, pattern=r"^[^\x00]+$")
    duration_minutes: int | None = Field(default=None, strict=True, ge=1, le=1440)
    direction: Literal["inbound", "outbound"] | None = None
    projects: list[ProjectLabel] = Field(default_factory=list, max_length=3)

    @field_validator("projects")
    @classmethod
    def unique_projects(cls, values: list[str]) -> list[str]:
        if len({value.casefold() for value in values}) != len(values):
            raise ValueError("DUPLICATE_ACTIVITY_PROJECT")
        return values


class ActivityQuery(StrictBody):
    page: int = Field(default=1, ge=1, le=1000000)
    page_size: int = Field(default=25, ge=1, le=100)
    kind: (
        Literal["note", "call", "message", "email", "meeting", "visit", "other", "system"] | None
    ) = None
