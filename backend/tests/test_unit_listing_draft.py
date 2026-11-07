"""Prepared isolated PostgreSQL checks for selected rich unit drafts; not units."""

from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

from app.identity.security import IdentityError
from app.inventory.contracts import CreateProperty
from app.inventory.models import Offering, Property
from app.inventory.queries import read_detail
from tests.contact_support import actor
from tests.test_developments import development, hierarchy
from tests.test_inventory import run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize("role", ["agent", "manager"])
def test_rich_partial_unit_is_atomic_replayable_and_does_not_copy_template_defaults(
    settings, database, role
):
    _, token = actor(settings, database, role)
    did = development(settings, database, token)
    _, floors, template = hierarchy(settings, database, token, did)
    body = CreateProperty(
        reference="SYN-PARTIAL",
        category="apartment",
        development_id=did,
        floor_id=floors[0],
        unit_type_id=template,
        listing_details={
            "city": "Ville synthétique",
            "bedrooms": 0,
            "bathrooms": 0,
            "unit_floor": 0,
            "description": "Ligne une\nLigne deux",
        },
        initial_offering={"kind": "sale", "price_mad": "1234567890123456.78"},
    )
    key = uuid4()
    result = run(settings, database, token, "create-property", body, key=key)
    assert run(settings, database, token, "create-property", body, key=key) == result
    view = read_detail(database, token, UUID(result["property_id"]))
    assert view["area_sqm"] is None and view["rooms"] is None
    assert view["listing_details"].get("region") is None
    assert view["listing_details"]["unit_floor"] == 0
    assert view["listing_details"]["description"] == "Ligne une\nLigne deux"
    assert view["offerings"][0]["state"] == "draft"
    assert view["offerings"][0]["price_mad"] == "1234567890123456.78"
    assert view["owners"] == []
    with database.session() as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(Property)
                .where(Property.reference == "SYN-PARTIAL")
            )
            == 1
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(Offering)
                .where(Offering.property_id == UUID(result["property_id"]))
            )
            == 1
        )


def test_foreign_template_rolls_back_rich_details_and_initial_offer_together(settings, database):
    _, token = actor(settings, database)
    did, other = [development(settings, database, token) for _ in range(2)]
    _, floors, _ = hierarchy(settings, database, token, did)
    _, _, foreign = hierarchy(settings, database, token, other)
    body = CreateProperty(
        reference="SYN-REFUSED",
        category="apartment",
        development_id=did,
        floor_id=floors[0],
        unit_type_id=foreign,
        listing_details={"description": "Détail synthétique"},
        initial_offering={"kind": "rental", "price_mad": "100.00", "price_period": "month"},
    )
    with pytest.raises(IdentityError, match="INVALID_HIERARCHY"):
        run(settings, database, token, "create-property", body)
    with database.session() as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(Property)
                .where(Property.reference == "SYN-REFUSED")
            )
            == 0
        )


def test_standalone_complete_listing_is_still_required_while_direct_unit_can_have_known_details(
    settings, database
):
    _, token = actor(settings, database)
    did = development(settings, database, token)
    values = dict(
        reference="SYN-VILLA-DRAFT",
        category="villa",
        listing_details={"city": "Ville synthétique"},
        initial_offering={"kind": "sale", "price_mad": "500000"},
    )
    with pytest.raises(ValidationError, match="LISTING_REQUIRED_FIELDS"):
        CreateProperty(**values)
    result = run(
        settings, database, token, "create-property", CreateProperty(**values, development_id=did)
    )
    view = read_detail(database, token, UUID(result["property_id"]))
    assert view["floor_id"] is None and view["unit_type_id"] is None
    assert view["listing_details"]["city"] == "Ville synthétique"
