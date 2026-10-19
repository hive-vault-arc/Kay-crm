"""Strict hierarchy commands share the development aggregate version."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, field_validator

from app.inventory.contracts import Amount, Category, StrictBody, Version


class DevelopmentFields(StrictBody):
    reference: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=160)
    category: Literal["mixed", "villa", "house", "apartment", "land", "commercial"] = "mixed"
    location: str | None = Field(default=None, min_length=1, max_length=500)
    briefing_text: str | None = Field(default=None, max_length=10000)
    developer_contact_id: UUID | None = None
    developer_marketing_display: str | None = Field(default=None, min_length=1, max_length=160)

    @field_validator("reference")
    @classmethod
    def canonical(cls, value: str) -> str:
        if len(value.upper()) > 80:
            raise ValueError("REFERENCE_TOO_LONG")
        return value.upper()

    @field_validator("briefing_text")
    @classmethod
    def empty_briefing(cls, value: str | None) -> str | None:
        return value or None


class EditDevelopment(DevelopmentFields):
    expected_version: Version


class StructureFields(StrictBody):
    expected_version: Version
    code: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=160)
    display_order: Annotated[int, Field(strict=True, ge=0, le=1_000_000)] = 0

    @field_validator("code")
    @classmethod
    def canonical(cls, value: str) -> str:
        if len(value.upper()) > 40:
            raise ValueError("CODE_TOO_LONG")
        return value.upper()


class TypeFields(StrictBody):
    expected_version: Version
    development_id: UUID
    code: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=160)
    category: Category
    default_area_sqm: Amount | None = None
    default_rooms: Annotated[int, Field(strict=True, ge=1, le=1000)] | None = None

    @field_validator("code")
    @classmethod
    def canonical(cls, value: str) -> str:
        if len(value.upper()) > 40:
            raise ValueError("CODE_TOO_LONG")
        return value.upper()


class ArchiveDevelopment(StrictBody):
    expected_version: Version
    reason: str = Field(min_length=1, max_length=1000)
