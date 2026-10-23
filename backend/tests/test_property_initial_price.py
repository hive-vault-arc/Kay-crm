"""A priced draft created with a physical property is one authorized transaction."""

from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

from app.identity.security import IdentityError, csrf_token
from app.inventory.contracts import (
    CreateProperty,
    EditOffering,
    InitialPropertyOffering,
    InventoryQuery,
    NewOffering,
    PropertyFields,
)
from app.inventory.models import Offering, Property
from app.inventory.queries import read_detail, read_history, read_list
from app.main import create_app
from tests.contact_support import actor
from tests.test_auth import authority
from tests.test_foundation import client_for
from tests.test_inventory import run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize(
    ("role", "kind", "period", "price"),
    [
        ("agent", "sale", None, "1450000.50"),
        ("agent", "rental", "month", "12000.00"),
        ("manager", "rental", "year", "144000.00"),
    ],
)
def test_initial_price_is_atomic_and_visible(settings, database, role, kind, period, price):
    _, token = actor(settings, database, role)
    body = CreateProperty(
        reference=f"PRICED-{uuid4().hex}",
        category="apartment",
        initial_offering=InitialPropertyOffering(kind=kind, price_mad=price, price_period=period),
    )
    key = uuid4()
    created = run(settings, database, token, "create-property", body, key=key)
    assert run(settings, database, token, "create-property", body, key=key) == created
    assert created["version"] == 2 and created["offering_id"]
    pid = UUID(created["property_id"])
    detail = read_detail(database, token, pid)
    assert detail["offerings"][0]["price_mad"] == price
    assert detail["offerings"][0]["kind"] == kind
    assert detail["offerings"][0]["price_period"] == period
    assert detail["offerings"][0]["state"] == "draft"
    listed = read_list(database, token, "properties", InventoryQuery(q=body.reference))
    assert listed["items"][0]["offerings"][0]["price_mad"] == price
    actions = {
        row["action"]: row["property_version"]
        for row in read_history(database, token, pid, InventoryQuery())["items"]
    }
    assert actions == {"properties.created": 1, "offerings.created": 2}
    if role == "agent":
        with pytest.raises(IdentityError, match="FORBIDDEN"):
            run(
                settings,
                database,
                token,
                "create-offering",
                NewOffering(property_id=pid, expected_property_version=2, kind="sale"),
            )
        with pytest.raises(IdentityError, match="FORBIDDEN"):
            run(
                settings,
                database,
                token,
                "edit-offering",
                EditOffering(
                    expected_property_version=2,
                    expected_version=1,
                    state="draft",
                    price_mad=price,
                    price_period=period,
                    reason="Tentative synthétique",
                ),
                target=UUID(created["offering_id"]),
            )


@pytest.mark.parametrize(
    ("kind", "price", "period"),
    [
        ("sale", "0", None),
        ("sale", "100.001", None),
        ("sale", "NaN", None),
        ("sale", "100", "month"),
        ("rental", "100", None),
    ],
)
def test_initial_price_rejects_invalid_values(kind, price, period):
    with pytest.raises(ValidationError):
        InitialPropertyOffering(kind=kind, price_mad=price, price_period=period)


def test_legacy_incomplete_property_retry_keeps_its_receipt(settings, database):
    _, token = actor(settings, database)
    reference = f"LEGACY-{uuid4().hex}"
    key = uuid4()
    original = run(
        settings,
        database,
        token,
        "create-property",
        PropertyFields(reference=reference, category="land"),
        key=key,
    )
    assert (
        run(
            settings,
            database,
            token,
            "create-property",
            CreateProperty(reference=reference, category="land"),
            key=key,
        )
        == original
    )


@pytest.mark.anyio
async def test_agent_http_initial_price_creates_draft_and_denials_stay_closed(settings, database):
    _, token = actor(settings, database)
    headers = {
        **authority(settings),
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
        "Idempotency-Key": str(uuid4()),
    }
    body = {
        "reference": "HTTP-PRICED",
        "category": "commercial",
        "initial_offering": {
            "kind": "sale",
            "price_mad": "500000.00",
            "price_period": None,
            "currency": "MAD",
        },
    }
    async with client_for(create_app(settings)) as client:
        assert (await client.post("/api/v1/properties", json=body)).status_code == 403
        for invalid in (
            {**body, "initial_offering": {**body["initial_offering"], "price_mad": "0"}},
            {**body, "initial_offering": {**body["initial_offering"], "state": "available"}},
        ):
            assert (
                await client.post("/api/v1/properties", headers=headers, json=invalid)
            ).status_code == 422
        created = await client.post("/api/v1/properties", headers=headers, json=body)
        assert created.status_code == 200 and created.json()["version"] == 2
        assert (
            await client.post("/api/v1/properties", headers=headers, json=body)
        ).json() == created.json()
        pid = UUID(created.json()["property_id"])
        assert read_detail(database, token, pid)["offerings"][0]["price_mad"] == "500000.00"
        with database.session() as session:
            assert session.scalar(select(func.count()).select_from(Offering)) == 1
            assert session.scalar(select(func.count()).select_from(Property)) == 1
