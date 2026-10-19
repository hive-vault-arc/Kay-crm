"""Full-range shared inventory facets and exact multi-category selection."""

import pytest
from pydantic import ValidationError

from app.inventory.contracts import PropertiesQuery, PropertyFields
from app.inventory.queries import read_list
from tests.contact_support import actor
from tests.test_inventory import run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_property_facets_precede_selection_and_pages_and_follow_other_filters(settings, database):
    _, token = actor(settings, database, "manager")
    for index, category in enumerate(["land"] * 51 + ["apartment", "villa", "house", "commercial"]):
        run(
            settings,
            database,
            token,
            "create-property",
            PropertyFields(
                reference=f"FACET-{index:03}",
                category=category,
                marketing_name="Search synthétique" if category != "house" else "Autre synthétique",
                location="Lieu synthétique",
            ),
        )
    first = read_list(
        database, token, "properties", PropertiesQuery(page_size=1, target_level="standalone")
    )
    assert first["total"] == first["unfiltered_total"] == 55
    assert first["category_counts"] == {
        "land": 51,
        "apartment": 1,
        "villa": 1,
        "house": 1,
        "commercial": 1,
    }
    selected = read_list(
        database, token, "properties", PropertiesQuery(categories="villa,apartment", page_size=1)
    )
    assert selected["total"] == 2 and selected["has_next"]
    assert selected["category_counts"] == first["category_counts"]
    assert len(selected["items"]) == 1
    empty = read_list(database, token, "properties", PropertiesQuery(categories=""))
    assert empty["total"] == 0 and empty["category_counts"] == first["category_counts"]
    searched = read_list(
        database, token, "properties", PropertiesQuery(q="Search", categories="house")
    )
    assert searched["total"] == 0 and searched["unfiltered_total"] == 54
    assert searched["category_counts"]["house"] == 0
    assert (
        read_list(database, token, "properties", PropertiesQuery(categories="commercial"))["total"]
        == 1
    )
    legacy = read_list(database, token, "properties", PropertiesQuery(category="land"))
    assert legacy["total"] == 51
    _, agent = actor(settings, database)
    shared = read_list(database, agent, "properties", PropertiesQuery(categories="land"))
    assert shared["category_counts"] == first["category_counts"]
    assert all("owners" not in item for item in shared["items"])


@pytest.mark.parametrize(
    "fields",
    [
        {"categories": "land,land"},
        {"categories": "castle"},
        {"categories": "land,"},
        {"categories": " land"},
        {"category": "land", "categories": "villa"},
        {"category": "land", "categories": ""},
        {"categories": ["land"]},
    ],
)
def test_category_selection_is_exact_and_unambiguous(fields):
    with pytest.raises(ValidationError):
        PropertiesQuery(**fields)
