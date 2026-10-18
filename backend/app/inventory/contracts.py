"""Strict standalone commands; money travels as bounded decimal strings."""

from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator, model_validator


def positive(value: str) -> str:
    if Decimal(value) <= 0:
        raise ValueError("POSITIVE_DECIMAL_REQUIRED")
    return value


Amount = Annotated[str, Field(pattern=r"^[0-9]{1,16}(\.[0-9]{1,2})?$"), AfterValidator(positive)]
ComparisonAmount = Annotated[
    str, Field(pattern=r"^[0-9]{1,18}(\.[0-9]{1,2})?$"), AfterValidator(positive)
]
Version = Annotated[int, Field(strict=True, ge=1)]
Category = Literal["villa", "house", "apartment", "land"]


class StrictBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PropertyFields(StrictBody):
    reference: str = Field(min_length=1, max_length=80)
    category: Category
    marketing_name: str | None = Field(default=None, min_length=1, max_length=160)
    location: str | None = Field(default=None, min_length=1, max_length=500)
    area_sqm: Amount | None = None
    development_id: UUID | None = None
    floor_id: UUID | None = None
    unit_type_id: UUID | None = None
    rooms: Annotated[int, Field(strict=True, ge=1, le=1000)] | None = None

    @field_validator("reference")
    @classmethod
    def canonical_reference(cls, value: str) -> str:
        canonical = value.upper()
        if len(canonical) > 80:
            raise ValueError("REFERENCE_TOO_LONG")
        return canonical


class EditProperty(PropertyFields):
    expected_version: Version


class OwnerLink(StrictBody):
    contact_id: UUID
    marketing_display: str | None = Field(default=None, min_length=1, max_length=160)


class Owners(StrictBody):
    expected_version: Version
    owners: list[OwnerLink] = Field(max_length=100)

    @model_validator(mode="after")
    def distinct(self) -> Owners:
        if len({item.contact_id for item in self.owners}) != len(self.owners):
            raise ValueError("DUPLICATE_OWNER")
        return self


class OfferingFields(StrictBody):
    price_mad: Amount | None = None
    currency: Literal["MAD"] = "MAD"
    price_period: Literal["month", "year"] | None = None
    conditions: str = Field(default="", max_length=2000)


class NewOffering(OfferingFields):
    property_id: UUID | None = None
    development_id: UUID | None = None
    expected_property_version: Version | None = None
    expected_development_version: Version | None = None
    kind: Literal["sale", "rental"]

    @model_validator(mode="after")
    def period(self) -> NewOffering:
        if (self.property_id is None) == (self.development_id is None):
            raise ValueError("TARGET_XOR_REQUIRED")
        if (
            self.property_id is not None
            and (
                self.expected_property_version is None
                or self.expected_development_version is not None
            )
        ) or (
            self.development_id is not None
            and (
                self.expected_development_version is None
                or self.expected_property_version is not None
            )
        ):
            raise ValueError("TARGET_VERSION_REQUIRED")
        if (self.kind == "sale") != (self.price_period is None):
            raise ValueError("INVALID_PRICE_PERIOD")
        return self


class EditOffering(OfferingFields):
    expected_property_version: Version | None = None
    expected_development_version: Version | None = None
    expected_version: Version
    state: Literal["draft", "available", "withdrawn"]
    reason: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def target_version(self) -> EditOffering:
        if (self.expected_property_version is None) == (self.expected_development_version is None):
            raise ValueError("TARGET_VERSION_REQUIRED")
        return self


class ConfirmAvailability(StrictBody):
    expected_version: Version
    offering_id: UUID
    expected_offering_version: Version
    reason: str = Field(min_length=1, max_length=1000)


class InventoryQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    page: int = Field(default=1, ge=1, le=1_000_000)
    page_size: int = Field(default=50, ge=1, le=100)
    archive: Literal["active", "archived", "all"] = "active"
    q: str = Field(default="", max_length=160)
    min_comparison_mad: ComparisonAmount | None = None
    max_comparison_mad: ComparisonAmount | None = None
    min_area_sqm: Amount | None = None
    min_rooms: int | None = Field(default=None, ge=1, le=1000)
    category: Category | None = None
    kind: Literal["sale", "rental"] | None = None
    offering_kind: Literal["sale", "rental"] | None = None
    target_level: Literal["property", "development", "standalone", "unit"] | None = None
    state: (
        Literal["draft", "available", "reserved", "withdrawn", "sold", "rented", "review", "all"]
        | None
    ) = None
    property_id: UUID | None = None
    offering_id: UUID | None = None
    development_id: UUID | None = None
    block_id: UUID | None = None
    floor_id: UUID | None = None
    unit_type_id: UUID | None = None
    sort: Literal["reference", "-updated_at"] = "-updated_at"

    @model_validator(mode="after")
    def comparison_range(self) -> InventoryQuery:
        if self.min_comparison_mad is not None and self.max_comparison_mad is not None:
            if Decimal(self.min_comparison_mad) > Decimal(self.max_comparison_mad):
                raise ValueError("INVALID_COMPARISON_RANGE")
        return self


class PropertiesQuery(InventoryQuery):
    categories: str | None = Field(default=None, max_length=40)

    @field_validator("categories", mode="before")
    @classmethod
    def category_selection(cls, value: object) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("INVALID_CATEGORY_SELECTION")
        if value == "":
            return value
        parts = value.split(",")
        if len(parts) != len(set(parts)) or not set(parts) <= {
            "land",
            "apartment",
            "villa",
            "house",
        }:
            raise ValueError("INVALID_CATEGORY_SELECTION")
        return value

    @model_validator(mode="after")
    def unambiguous_category(self) -> PropertiesQuery:
        if self.category is not None and self.categories is not None:
            raise ValueError("AMBIGUOUS_CATEGORY_SELECTION")
        return self
