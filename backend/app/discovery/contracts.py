from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.contacts.contracts import ListQuery, StrictBody


class PageQuery(StrictBody):
    page: int = Field(default=1, ge=1, le=1000000)
    page_size: int = Field(default=25, ge=1, le=100)


class SearchQuery(PageQuery):
    q: str = Field(min_length=2, max_length=160)
    kind: (
        Literal[
            "contact",
            "enquiry",
            "deal",
            "development",
            "property",
            "unit_type",
            "document",
            "generated_document",
        ]
        | None
    ) = None


class NewExport(StrictBody):
    kind: Literal["contacts", "enquiries"] = "enquiries"
    filters: ListQuery = Field(default_factory=ListQuery)

    @model_validator(mode="after")
    def complete_result(self) -> NewExport:
        if self.filters.page != 1 or self.filters.page_size != 50:
            raise ValueError("EXPORT_ALL_FILTERED_ROWS_NOT_A_PAGE")
        self.filters.validate_kind(self.kind)
        return self


class AuditQuery(PageQuery):
    family: (
        Literal[
            "security",
            "contacts",
            "enquiries",
            "properties",
            "developments",
            "offerings",
            "documents",
            "requirements",
            "deals",
            "visits",
            "tasks",
            "imports",
            "exports",
        ]
        | None
    ) = None
    actor_id: UUID | None = None
    website_source_id: UUID | None = None
    unattributed_actor: Literal["true"] | None = None
    start_on: date | None = None
    end_on: date | None = None

    @model_validator(mode="after")
    def ordered(self) -> AuditQuery:
        if self.start_on and self.end_on and self.start_on > self.end_on:
            raise ValueError("INVALID_DATE_RANGE")
        if (
            sum(
                value is not None
                for value in (self.actor_id, self.website_source_id, self.unattributed_actor)
            )
            > 1
        ):
            raise ValueError("ONE_AUDIT_ACTOR_REQUIRED")
        return self


class AuditActorsQuery(PageQuery):
    q: str = Field(default="", max_length=160)
