"""Property-listing contracts without database or private customer records."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.inventory.contracts import CreateProperty, EditProperty, ListingDetails, NewOffering


def listing(category: str = "apartment", kind: str = "sale") -> dict[str, object]:
    details: dict[str, object] = {"region": "Tanger-Tétouan-Al Hoceïma", "city": "Tanger"}
    body: dict[str, object] = {
        "reference": f"SYN-{uuid4().hex[:10]}",
        "category": category,
        "area_sqm": "90.00",
        "listing_details": details,
        "initial_offering": {
            "kind": kind,
            "price_mad": "123456.78",
            "price_period": None if kind == "sale" else "day" if kind == "holiday" else "month",
        },
    }
    if category in {"apartment", "house", "villa", "riad"}:
        body["rooms"] = 3
        details.update(bedrooms=2, bathrooms=1)
    if category in {"room", "commercial", "office"}:
        details["bathrooms"] = 1
    if kind == "holiday":
        details.update(capacity=4, minimum_nights=2)
    return body


@pytest.mark.parametrize(
    "category,kind",
    [
        ("apartment", "sale"),
        ("house", "rental"),
        ("villa", "holiday"),
        ("riad", "holiday"),
        ("room", "holiday"),
        ("commercial", "sale"),
        ("office", "rental"),
        ("land", "sale"),
        ("farm", "sale"),
    ],
)
def test_all_listing_categories(category: str, kind: str) -> None:
    row = CreateProperty.model_validate(listing(category, kind))
    assert row.category == category
    assert row.listing_details is not None and row.listing_details.city == "Tanger"


@pytest.mark.parametrize("category", ["land", "farm", "commercial", "office"])
def test_non_residential_rejects_room_count(category: str) -> None:
    body = listing(category)
    body["rooms"] = 3
    with pytest.raises(ValidationError, match="INAPPLICABLE_ROOM_COUNT"):
        CreateProperty.model_validate(body)


@pytest.mark.parametrize("category", ["land", "farm"])
def test_land_and_farm_reject_bathrooms(category: str) -> None:
    body = listing(category)
    body["listing_details"]["bathrooms"] = 1  # type: ignore[index]
    with pytest.raises(ValidationError, match="INAPPLICABLE_BATHROOM_COUNT"):
        CreateProperty.model_validate(body)


@pytest.mark.parametrize(
    "url",
    [
        "https://www.google.com/maps/place/Tanger",
        "https://maps.google.com/?q=35.7,-5.8",
        "https://maps.app.goo.gl/abc123",
    ],
)
def test_google_maps_links(url: str) -> None:
    assert ListingDetails(google_maps_url=url).google_maps_url == url


@pytest.mark.parametrize(
    "url",
    [
        "http://www.google.com/maps/place/Tanger",
        "https://google.com.evil.test/maps/place/Tanger",
        "https://www.google.com.evil.test/maps",
        "https://example.com/maps",
        "javascript:alert(1)",
        "https://user@maps.google.com/",
        "https://maps.google.com:8443/",
    ],
)
def test_unsafe_maps_links_rejected(url: str) -> None:
    with pytest.raises(ValidationError, match="GOOGLE_MAPS_URL_REQUIRED"):
        ListingDetails(google_maps_url=url)


def test_holiday_is_separate_market_with_distinct_period() -> None:
    CreateProperty.model_validate(listing("apartment", "holiday"))
    for kind, period in (("sale", "day"), ("rental", "day"), ("holiday", "year")):
        body = listing("apartment", kind)
        body["initial_offering"]["price_period"] = period  # type: ignore[index]
        with pytest.raises(ValidationError, match="INVALID_PRICE_PERIOD"):
            CreateProperty.model_validate(body)


def test_holiday_only_standalone_residential_and_rooms_not_for_sale() -> None:
    for category, kind in (("commercial", "holiday"), ("land", "holiday"), ("room", "sale")):
        body = listing(category, kind)
        with pytest.raises(ValidationError):
            CreateProperty.model_validate(body)
    body = listing("apartment", "holiday")
    body["development_id"] = str(uuid4())
    with pytest.raises(ValidationError, match="HOLIDAY_STANDALONE_ONLY"):
        CreateProperty.model_validate(body)


def test_required_listing_fields_and_conditional_amenities() -> None:
    body = listing()
    body["area_sqm"] = None
    with pytest.raises(ValidationError, match="LISTING_REQUIRED_FIELDS"):
        CreateProperty.model_validate(body)
    body = listing()
    body["listing_details"]["amenities"] = ["garden"]  # type: ignore[index]
    with pytest.raises(ValidationError, match="AMENITY_DETAIL_REQUIRED"):
        CreateProperty.model_validate(body)
    body["listing_details"]["garden_area_sqm"] = "30.00"  # type: ignore[index]
    CreateProperty.model_validate(body)


def test_legacy_edits_remain_non_destructive_and_holiday_development_forbidden() -> None:
    legacy_edit = EditProperty(reference="LEGACY", category="apartment", expected_version=1)
    assert legacy_edit.listing_details is None
    with pytest.raises(ValidationError, match="HOLIDAY_STANDALONE_ONLY"):
        NewOffering(
            development_id=uuid4(),
            expected_development_version=1,
            kind="holiday",
            price_mad="500.00",
            price_period="day",
        )
