"""Strict standalone commands; money travels as bounded decimal strings."""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Literal
from urllib.parse import urlsplit
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
Category = Literal[
    "villa", "house", "apartment", "land", "commercial", "riad", "room", "office", "farm"
]

Condition = Literal["new_or_renovated", "good", "to_renovate"]
AgeBand = Literal[
    "under_1", "1_5", "5_10", "10_20", "20_30", "30_50", "50_70", "70_100", "over_100"
]
Amenity = Literal[
    "garden",
    "terrace",
    "garage",
    "elevator",
    "sea_view",
    "mountain_view",
    "pool",
    "concierge",
    "storage_room",
    "furnished",
    "exterior_facade",
    "entresol",
    "moroccan_lounge",
    "european_lounge",
    "satellite",
    "fireplace",
    "air_conditioning",
    "central_heating",
    "security",
    "double_glazing",
    "reinforced_door",
    "fitted_kitchen",
    "fridge",
    "oven",
    "tv",
    "washing_machine",
    "microwave",
    "internet",
    "pets_allowed",
]


class ListingDetails(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    condition: Condition | None = None
    address: str | None = Field(default=None, max_length=500)
    region: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    neighborhood: str | None = Field(default=None, max_length=120)
    google_maps_url: str | None = Field(default=None, max_length=2048)
    bedrooms: int | None = Field(default=None, ge=0, le=1000)
    bathrooms: int | None = Field(default=None, ge=0, le=1000)
    capacity: int | None = Field(default=None, ge=1, le=1000)
    minimum_nights: int | None = Field(default=None, ge=1, le=365)
    age_band: AgeBand | None = None
    floor_type: Literal["parquet", "marble", "tile", "other"] | None = None
    unit_floor: int | None = Field(default=None, ge=0, le=20)
    building_floors: int | None = Field(default=None, ge=1, le=4)
    orientation: Literal["north", "west", "east", "south"] | None = None
    plot_area_sqm: Amount | None = None
    land_delivery: Literal["planned", "titled"] | None = None
    land_status: Literal["subdivided", "not_subdivided"] | None = None
    amenities: list[Amenity] = Field(default_factory=list, max_length=29)
    garden_area_sqm: Amount | None = None
    terrace_area_sqm: Amount | None = None
    garage_spaces: int | None = Field(default=None, ge=1, le=1000)
    description: str | None = Field(default=None, max_length=5000)

    @field_validator("google_maps_url")
    @classmethod
    def google_maps_only(cls, value: str | None) -> str | None:
        if value is None:
            return None
        url = urlsplit(value)
        if (
            url.scheme != "https"
            or url.username is not None
            or url.password is not None
            or url.port is not None
            or "\\" in value
            or not (
                (url.hostname in {"google.com", "www.google.com"} and url.path.startswith("/maps"))
                or url.hostname in {"maps.google.com", "maps.app.goo.gl"}
            )
        ):
            raise ValueError("GOOGLE_MAPS_URL_REQUIRED")
        return value

    @model_validator(mode="after")
    def option_details(self) -> ListingDetails:
        if len(set(self.amenities)) != len(self.amenities):
            raise ValueError("DUPLICATE_AMENITY")
        for option, attribute in (
            ("garden", "garden_area_sqm"),
            ("terrace", "terrace_area_sqm"),
            ("garage", "garage_spaces"),
        ):
            if (option in self.amenities) != (getattr(self, attribute) is not None):
                raise ValueError("AMENITY_DETAIL_REQUIRED")
        return self


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
    listing_details: ListingDetails | None = None

    @field_validator("reference")
    @classmethod
    def canonical_reference(cls, value: str) -> str:
        canonical = value.upper()
        if len(canonical) > 80:
            raise ValueError("REFERENCE_TOO_LONG")
        return canonical

    @model_validator(mode="after")
    def category_details(self) -> PropertyFields:
        details = self.listing_details
        if details is None:
            return self
        residential = {"villa", "house", "apartment", "riad", "room"}
        if self.category in {"land", "farm"} and (
            details.condition is not None
            or details.age_band is not None
            or details.floor_type is not None
            or details.unit_floor is not None
            or details.building_floors is not None
            or details.orientation is not None
        ):
            raise ValueError("INAPPLICABLE_PROPERTY_DETAIL")
        if self.category not in residential and (
            self.rooms is not None or details.bedrooms is not None
        ):
            raise ValueError("INAPPLICABLE_ROOM_COUNT")
        if self.category == "room" and (details.bedrooms is not None or self.rooms is not None):
            raise ValueError("INAPPLICABLE_BEDROOM_COUNT")
        if self.category in {"land", "farm"} and details.bathrooms is not None:
            raise ValueError("INAPPLICABLE_BATHROOM_COUNT")
        if self.category != "land" and (
            details.land_delivery is not None or details.land_status is not None
        ):
            raise ValueError("INAPPLICABLE_LAND_DETAIL")
        if self.category not in {"house", "villa", "riad", "farm"} and details.plot_area_sqm:
            raise ValueError("INAPPLICABLE_PLOT_AREA")
        if (
            self.category not in {"apartment", "room", "commercial", "office"}
            and details.unit_floor is not None
        ):
            raise ValueError("INAPPLICABLE_FLOOR")
        if self.category not in {"house", "villa", "riad"} and details.building_floors is not None:
            raise ValueError("INAPPLICABLE_BUILDING_FLOORS")
        if self.category not in residential and details.orientation is not None:
            raise ValueError("INAPPLICABLE_ORIENTATION")
        if (
            self.category != "room"
            and details.capacity is not None
            and self.category not in {"apartment", "house", "villa", "riad"}
        ):
            raise ValueError("INAPPLICABLE_CAPACITY")
        permitted = {
            "land": set(),
            "farm": {"garage", "storage_room", "security"},
            "commercial": {
                "garage",
                "elevator",
                "concierge",
                "storage_room",
                "air_conditioning",
                "central_heating",
                "security",
                "double_glazing",
                "reinforced_door",
                "fitted_kitchen",
            },
            "office": {
                "garage",
                "elevator",
                "concierge",
                "storage_room",
                "air_conditioning",
                "central_heating",
                "security",
                "double_glazing",
                "reinforced_door",
                "fitted_kitchen",
                "garden",
                "terrace",
                "sea_view",
                "mountain_view",
                "fridge",
                "microwave",
                "internet",
                "pets_allowed",
            },
        }
        if self.category in permitted and set(details.amenities) - permitted[self.category]:
            raise ValueError("INAPPLICABLE_AMENITY")
        return self


def valid_price_period(kind: str, period: str | None) -> bool:
    return (
        (kind == "sale" and period is None)
        or (kind == "rental" and period in {"month", "year"})
        or (kind == "holiday" and period in {"day", "week", "month"})
    )


class InitialPropertyOffering(StrictBody):
    kind: Literal["sale", "rental", "holiday"]
    price_mad: Amount
    price_period: Literal["day", "week", "month", "year"] | None = None
    currency: Literal["MAD"] = "MAD"

    @model_validator(mode="after")
    def period(self) -> InitialPropertyOffering:
        if not valid_price_period(self.kind, self.price_period):
            raise ValueError("INVALID_PRICE_PERIOD")
        return self


class CreateProperty(PropertyFields):
    initial_offering: InitialPropertyOffering | None = None

    @model_validator(mode="after")
    def allowed_market(self) -> CreateProperty:
        initial = self.initial_offering
        details = self.listing_details
        if details is not None:
            if self.area_sqm is None or not details.region or not details.city or initial is None:
                raise ValueError("LISTING_REQUIRED_FIELDS")
            if self.category in {"apartment", "house", "villa", "riad"} and (
                self.rooms is None or details.bedrooms is None or details.bathrooms is None
            ):
                raise ValueError("RESIDENTIAL_REQUIRED_FIELDS")
            if self.category in {"commercial", "office"} and details.bathrooms is None:
                raise ValueError("COMMERCIAL_REQUIRED_FIELDS")
            if self.category == "room" and details.bathrooms is None:
                raise ValueError("ROOM_REQUIRED_FIELDS")
            if initial.kind == "holiday" and (
                details.capacity is None or details.minimum_nights is None
            ):
                raise ValueError("HOLIDAY_REQUIRED_FIELDS")
        if initial is None:
            return self
        if self.development_id is not None and initial.kind == "holiday":
            raise ValueError("HOLIDAY_STANDALONE_ONLY")
        if self.category == "room" and initial.kind == "sale":
            raise ValueError("ROOM_SALE_UNSUPPORTED")
        if initial.kind == "holiday" and self.category not in {
            "apartment",
            "house",
            "villa",
            "riad",
            "room",
        }:
            raise ValueError("HOLIDAY_CATEGORY_UNSUPPORTED")
        return self


class InitialPropertyOffering(StrictBody):
    kind: Literal["sale", "rental"]
    price_mad: Amount
    price_period: Literal["month", "year"] | None = None
    currency: Literal["MAD"] = "MAD"

    @model_validator(mode="after")
    def period(self) -> InitialPropertyOffering:
        if (self.kind == "sale") != (self.price_period is None):
            raise ValueError("INVALID_PRICE_PERIOD")
        return self


class CreateProperty(PropertyFields):
    initial_offering: InitialPropertyOffering | None = None


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
    price_period: Literal["day", "week", "month", "year"] | None = None
    conditions: str = Field(default="", max_length=2000)


class NewOffering(OfferingFields):
    property_id: UUID | None = None
    development_id: UUID | None = None
    expected_property_version: Version | None = None
    expected_development_version: Version | None = None
    kind: Literal["sale", "rental", "holiday"]

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
        if not valid_price_period(self.kind, self.price_period):
            raise ValueError("INVALID_PRICE_PERIOD")
        if self.kind == "holiday" and self.development_id is not None:
            raise ValueError("HOLIDAY_STANDALONE_ONLY")
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
    kind: Literal["sale", "rental", "holiday"] | None = None
    offering_kind: Literal["sale", "rental", "holiday"] | None = None
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
    categories: str | None = Field(default=None, max_length=120)

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
            "commercial",
            "riad",
            "room",
            "office",
            "farm",
        }:
            raise ValueError("INVALID_CATEGORY_SELECTION")
        return value

    @model_validator(mode="after")
    def unambiguous_category(self) -> PropertiesQuery:
        if self.category is not None and self.categories is not None:
            raise ValueError("AMBIGUOUS_CATEGORY_SELECTION")
        return self
