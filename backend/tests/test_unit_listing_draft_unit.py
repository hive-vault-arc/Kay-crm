"""Unit rich-draft contracts and unchanged hierarchy/stock guards, without a DB."""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.identity.security import IdentityError
from app.inventory import hierarchy_rules
from app.inventory.commands import property_values
from app.inventory.contracts import CreateProperty, EditProperty


def body(category="villa", **changes):
    return {
        "reference": "SYN-UNIT",
        "category": category,
        "development_id": uuid4(),
        "initial_offering": {"kind": "sale", "price_mad": "1234567890123456.78"},
        **changes,
    }


@pytest.mark.parametrize("category", ["villa", "house", "apartment", "land", "commercial"])
def test_known_unit_details_can_be_saved_without_completing_a_standalone_listing(category):
    values = body(
        category,
        listing_details={"city": "Ville synthétique", "description": "Unité en préparation"},
    )
    if category == "apartment":
        values.update(floor_id=uuid4(), unit_type_id=uuid4())
    parsed = CreateProperty.model_validate(values)
    assert parsed.area_sqm is None and parsed.rooms is None
    assert parsed.initial_offering.price_mad == "1234567890123456.78"
    saved = property_values(parsed)
    assert saved["listing_details"] == {
        "city": "Ville synthétique",
        "description": "Unité en préparation",
        "amenities": [],
    }


@pytest.mark.parametrize("category", ["villa", "house", "apartment", "land", "commercial"])
def test_standalone_complete_listing_contract_is_not_relaxed(category):
    values = body(category, listing_details={"city": "Ville synthétique"})
    values.pop("development_id")
    with pytest.raises(ValidationError, match="LISTING_REQUIRED_FIELDS"):
        CreateProperty.model_validate(values)


def test_partial_unit_has_no_new_required_offer_but_cannot_gain_holiday_or_invalid_features():
    parsed = CreateProperty.model_validate(
        {
            "reference": "SYN-DRAFT",
            "category": "villa",
            "development_id": uuid4(),
            "listing_details": {"bathrooms": 0, "unit_floor": None},
        }
    )
    assert parsed.initial_offering is None
    assert property_values(parsed)["listing_details"] == {"bathrooms": 0, "amenities": []}
    for changes in [
        {"initial_offering": {"kind": "holiday", "price_mad": "100.00", "price_period": "day"}},
        {"listing_details": {"amenities": ["garden"]}},
        {"listing_details": {"bathrooms": -1}},
        {"listing_details": {"google_maps_url": "https://unrelated.invalid/maps"}},
    ]:
        values = body(**changes)
        with pytest.raises(ValidationError):
            CreateProperty.model_validate(values)


def test_real_hierarchy_guard_still_requires_apartment_floor_type_and_rejects_foreign_types(
    monkeypatch,
):
    monkeypatch.setattr(
        hierarchy_rules,
        "development_record",
        lambda *_args, **kwargs: SimpleNamespace(archived_at=None),
    )
    session = SimpleNamespace(scalar=lambda _query: None)
    for values in [
        body("apartment"),
        body("apartment", floor_id=uuid4()),
        body("apartment", unit_type_id=uuid4()),
        body(
            "room", initial_offering={"kind": "rental", "price_mad": "100", "price_period": "month"}
        ),
    ]:
        with pytest.raises(IdentityError, match="INVALID_HIERARCHY"):
            hierarchy_rules.validate_unit(session, CreateProperty.model_validate(values))
    rows = iter([uuid4(), None])
    session.scalar = lambda _query: next(rows)
    with pytest.raises(IdentityError, match="INVALID_HIERARCHY"):
        hierarchy_rules.validate_unit(
            session,
            CreateProperty.model_validate(
                body("apartment", floor_id=uuid4(), unit_type_id=uuid4())
            ),
        )


def test_existing_offer_still_locks_identity_and_placement_before_any_parent_change(monkeypatch):
    def unexpected(*_args, **_kwargs):
        pytest.fail("Stock guard must run before a new parent is read")

    monkeypatch.setattr(hierarchy_rules, "development_record", unexpected)
    did, floor, template = uuid4(), uuid4(), uuid4()
    source = SimpleNamespace(
        id=uuid4(), category="apartment", development_id=did, floor_id=floor, unit_type_id=template
    )
    change = EditProperty(reference="SYN", category="villa", development_id=did, expected_version=3)
    with pytest.raises(IdentityError, match="STOCK_REVIEW_REQUIRED"):
        hierarchy_rules.validate_unit(
            SimpleNamespace(scalar=lambda _query: uuid4()), change, source
        )
