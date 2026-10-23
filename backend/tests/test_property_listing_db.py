"""The additive listing migration and atomic first-price flow on isolated PostgreSQL."""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.contacts.models import Contact
from app.deals.access import check_links
from app.deals.contracts import DealFields
from app.identity.security import IdentityError
from app.identity.sessions import current_identity
from app.inventory.commands import command
from app.inventory.contracts import CreateProperty, InventoryQuery, NewOffering
from app.inventory.queries import read_detail, read_list
from tests.contact_support import actor
from tests.test_isolation_migrations import HEAD

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def run(settings, database, token: str, operation: str, body, target=None):
    return command(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        operation,
        body,
        target,
    )


def test_agent_creation_is_atomic_and_maps_location_is_shared(settings, database) -> None:
    _, agent_token = actor(settings, database, "agent")
    _, manager_token = actor(settings, database, "manager")
    body = CreateProperty(
        reference="synthetic-maps-31",
        category="apartment",
        area_sqm="75.00",
        rooms=3,
        listing_details={
            "region": "Tanger-Tétouan-Al Hoceïma",
            "city": "Tanger",
            "google_maps_url": "https://maps.app.goo.gl/synthetic123",
            "bedrooms": 2,
            "bathrooms": 1,
            "amenities": ["terrace"],
            "terrace_area_sqm": "14.00",
        },
        initial_offering={"kind": "sale", "price_mad": "1200000.00"},
    )
    retry_key = uuid4()
    result = command(
        database,
        agent_token,
        settings.facade_secret.get_secret_value(),
        retry_key,
        "create-property",
        body,
    )
    assert (
        command(
            database,
            agent_token,
            settings.facade_secret.get_secret_value(),
            retry_key,
            "create-property",
            body,
        )
        == result
    )
    assert result["offering_id"]
    detail = read_detail(database, manager_token, UUID(result["property_id"]))
    assert detail["listing_details"]["google_maps_url"] == "https://maps.app.goo.gl/synthetic123"
    assert detail["listing_details"]["terrace_area_sqm"] == "14.00"
    assert detail["offerings"][0]["kind"] == "sale"
    assert detail["offerings"][0]["state"] == "draft"
    assert detail["offerings"][0]["price_mad"] == "1200000.00"
    assert len(detail["offerings"]) == 1


def test_holiday_and_regular_rental_are_independent_current_offers(settings, database) -> None:
    _, token = actor(settings, database, "manager")
    result = run(
        settings,
        database,
        token,
        "create-property",
        CreateProperty(
            reference="SYN-HOLIDAY-31",
            category="riad",
            area_sqm="190.00",
            rooms=4,
            listing_details={
                "region": "Marrakech-Safi",
                "city": "Marrakech",
                "bedrooms": 3,
                "bathrooms": 2,
                "capacity": 6,
                "minimum_nights": 2,
            },
            initial_offering={"kind": "holiday", "price_mad": "1200.00", "price_period": "day"},
        ),
    )
    pid = UUID(result["property_id"])
    detail = read_detail(database, token, pid)
    run(
        settings,
        database,
        token,
        "create-offering",
        NewOffering(
            property_id=pid,
            expected_property_version=detail["version"],
            kind="rental",
            price_mad="15000.00",
            price_period="month",
        ),
    )
    detail = read_detail(database, token, pid)
    assert {item["kind"] for item in detail["offerings"]} == {"holiday", "rental"}
    assert (
        next(item for item in detail["offerings"] if item["kind"] == "holiday")[
            "annual_equivalent_mad"
        ]
        is None
    )
    assert (
        next(item for item in detail["offerings"] if item["kind"] == "rental")[
            "annual_equivalent_mad"
        ]
        == "180000.00"
    )
    assert read_list(database, token, "properties", InventoryQuery(category="riad"))["total"] == 1
    holiday = next(item for item in detail["offerings"] if item["kind"] == "holiday")
    with database.session() as session, pytest.raises(IdentityError) as denied:
        check_links(
            session,
            current_identity(session, token),
            Contact(id=uuid4(), name="Contact synthétique", type="person"),
            DealFields(
                initial_budget="1000000",
                purchase_reasons=["vacation_home"],
                projects=[{"property_id": pid}],
                offering_id=UUID(holiday["id"]),
                expected_offering_version=holiday["version"],
            ),
        )
    assert denied.value.code == "HOLIDAY_DEAL_NOT_SUPPORTED"


def test_sql_guards_new_categories_and_periods(settings, database) -> None:
    with database.session() as session:
        assert session.scalar(text("SELECT version_num FROM alembic_version")) == HEAD
    _, token = actor(settings, database, "manager")
    result = run(
        settings,
        database,
        token,
        "create-property",
        CreateProperty(reference="SYN-LAND-31", category="land"),
    )
    pid = UUID(result["property_id"])
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(
            text(
                "INSERT INTO offering(id, property_id, kind, price_period, created_by_user_id) "
                "VALUES (:id, :pid, 'holiday', 'year', "
                "(SELECT created_by_user_id FROM property WHERE id=:pid))"
            ),
            {"id": uuid4(), "pid": pid},
        )
