"""Bounded catalogue-link commands and numbered-page reads."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.contacts.contracts import StrictBody

LinkKind = Literal["discussed", "visited"]


class LinkQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: LinkKind
    page: int = Field(default=1, ge=1, le=1000000)
    page_size: int = Field(default=25, ge=1, le=50)


class NewLink(StrictBody):
    kind: LinkKind
    development_id: UUID | None = None
    property_id: UUID | None = None

    @model_validator(mode="after")
    def one_target(self) -> NewLink:
        if (self.development_id is None) == (self.property_id is None):
            raise ValueError("ONE_CATALOGUE_TARGET_REQUIRED")
        return self


class RemoveLink(StrictBody):
    pass
