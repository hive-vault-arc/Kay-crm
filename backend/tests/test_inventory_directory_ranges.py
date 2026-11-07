"""Prepared isolated-PostgreSQL directory/facet parity; not a unit-mode substitute."""

from uuid import UUID, uuid4

import pytest

from app.inventory.contracts import (
    DevelopmentQuery,
    InventoryQuery,
    PropertiesQuery,
    PropertyFields,
)
from app.inventory.hierarchy_queries import read_hierarchy
from app.inventory.queries import read_list
from tests.contact_support import actor
from tests.test_developments import campaign, development, hierarchy
from tests.test_inventory import offering_draft, run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def asset(settings, database, token, *, area="100.00", rooms=3, parent=None):
    floor, unit_type = None, None
    if parent:
        _, floors, unit_type = hierarchy(settings, database, token, parent)
        floor = floors[0]
    result = run(
        settings,
        database,
        token,
        "create-property",
        PropertyFields(
            reference=f"SYN-RANGE-{uuid4().hex}",
            category="apartment",
            area_sqm=area,
            rooms=rooms,
            development_id=parent,
            floor_id=floor,
            unit_type_id=unit_type,
        ),
    )
    return UUID(result["property_id"])


@pytest.mark.parametrize("role", ["agent", "manager"])
def test_real_directory_range_matches_one_offer_and_the_same_physical_facet_source(
    settings, database, role
):
    _, manager = actor(settings, database, "manager")
    _, reader = actor(settings, database, role)
    first = asset(settings, database, manager)
    offering_draft(settings, database, manager, first, "rental", "100.01", "month")
    offering_draft(settings, database, manager, first, "sale", "5000.00", None)
    split = asset(settings, database, manager)
    offering_draft(settings, database, manager, split, "sale", "3000.00", None)
    offering_draft(settings, database, manager, split, "rental", "1000.00", "month")
    small = asset(settings, database, manager, area="20.00", rooms=1)
    offering_draft(settings, database, manager, small, "sale", "5000.00", None)
    holiday = asset(settings, database, manager)
    offering_draft(settings, database, manager, holiday, "holiday", "5000.00", "day")
    asset(settings, database, manager)
    query = dict(
        target_level="standalone",
        state="all",
        min_comparison_mad="4000.00",
        max_comparison_mad="10000.00",
        min_area_sqm="90",
        min_rooms=2,
    )
    result = read_list(database, reader, "properties", PropertiesQuery(**query))
    assert result["total"] == result["unfiltered_total"] == 1
    assert [row["id"] for row in result["items"]] == [str(first)]
    assert result["category_counts"]["apartment"] == 1
    none = read_list(database, reader, "properties", PropertiesQuery(**query, categories="land"))
    assert none["total"] == 0 and none["unfiltered_total"] == 1
    exact = read_list(
        database,
        reader,
        "properties",
        PropertiesQuery(
            target_level="standalone",
            offering_kind="rental",
            min_comparison_mad="1200.12",
            max_comparison_mad="1200.12",
        ),
    )
    assert [row["id"] for row in exact["items"]] == [str(first)]


def test_real_programme_price_is_its_own_offer_while_units_keep_physical_dimensions(
    settings, database
):
    _, manager = actor(settings, database, "manager")
    parent = development(settings, database, manager)
    other = development(settings, database, manager)
    campaign(settings, database, manager, parent, "5000.00")
    unit = asset(settings, database, manager, parent=parent)
    offering_draft(settings, database, manager, unit, "rental", "100.01", "month")
    other_unit = asset(settings, database, manager, parent=other)
    offering_draft(settings, database, manager, other_unit, "sale", "5000.00", None)
    result = read_hierarchy(
        database,
        manager,
        "developments",
        None,
        DevelopmentQuery(min_comparison_mad="4000", max_comparison_mad="6000"),
    )
    assert result["total"] == 1 and result["items"][0]["id"] == str(parent)
    selected = read_hierarchy(
        database,
        manager,
        "inventory",
        parent,
        InventoryQuery(
            state="all",
            min_comparison_mad="1200.12",
            max_comparison_mad="1200.12",
            min_area_sqm="90",
            min_rooms=3,
        ),
    )
    assert selected["total"] == 1 and selected["items"][0]["id"] == str(unit)


def test_real_directory_decimal_boundary_never_rounds_through_binary_float(settings, database):
    _, manager = actor(settings, database, "manager")
    first, second = [asset(settings, database, manager) for _ in range(2)]
    for parent, amount in [(first, "9007199254740993.41"), (second, "9007199254740993.42")]:
        offering_draft(settings, database, manager, parent, "sale", amount, None)
    result = read_list(
        database,
        manager,
        "properties",
        PropertiesQuery(
            target_level="standalone",
            min_comparison_mad="9007199254740993.42",
            max_comparison_mad="9007199254740993.42",
        ),
    )
    assert result["total"] == 1 and result["items"][0]["id"] == str(second)
