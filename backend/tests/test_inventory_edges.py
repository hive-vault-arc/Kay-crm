"""Independent constraints and hostile HTTP input for the standalone slice."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from threading import Barrier
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.identity.security import IdentityError, csrf_token
from app.inventory.contracts import EditOffering, InventoryQuery, NewOffering, Owners
from app.inventory.models import Offering, PropertyOwner
from app.inventory.queries import read_detail, read_list
from app.main import create_app
from tests.contact_support import actor, create_lead, new_lead
from tests.test_auth import authority
from tests.test_foundation import client_for
from tests.test_inventory import confirm, offering_draft, owners, property_draft, run
from tests.test_isolation_migrations import migrate
from tests.test_ownership import change, cid, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_period_owner_terminal_and_missing_target_negatives(settings, database):
    _, mt = actor(settings, database, "manager")
    _, at = actor(settings, database)
    owner = cid(create_lead(settings, database, at))
    pid = property_draft(settings, database, mt)
    for body in (
        {"kind": "rental", "price_period": None},
        {"kind": "sale", "price_period": "year"},
        {"kind": "sale", "currency": "EUR"},
    ):
        with pytest.raises(ValidationError):
            NewOffering.model_validate(
                {"property_id": str(pid), "expected_property_version": 1, **body}
            )
    with pytest.raises(ValidationError):
        Owners.model_validate(
            {
                "expected_version": 1,
                "owners": [{"contact_id": str(owner)}, {"contact_id": str(owner)}],
            }
        )
    with pytest.raises(IdentityError, match="INVALID_LEGAL_OWNER"):
        owners(settings, database, mt, pid, [uuid4()])
    owners(settings, database, mt, pid, [owner])
    campaign = offering_draft(settings, database, mt, pid, "sale", "1.01", None)
    oid = campaign["offering_id"]
    with pytest.raises(IdentityError, match="CURRENT_OFFERING_EXISTS"):
        offering_draft(settings, database, mt, pid, "sale", "2.00", None)
    current = read_detail(database, mt, pid)
    body = {
        "expected_property_version": current["version"],
        "expected_version": 1,
        "price_mad": "1.01",
        "state": "available",
        "reason": "Test",
    }
    with pytest.raises(IdentityError, match="CONFIRM_AVAILABILITY_REQUIRED"):
        run(settings, database, mt, "edit-offering", EditOffering.model_validate(body), oid)
    with pytest.raises(IdentityError, match="VALIDATION_ERROR"):
        run(
            settings,
            database,
            mt,
            "edit-offering",
            EditOffering.model_validate({**body, "state": "draft", "price_period": "month"}),
            oid,
        )
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_detail(database, mt, uuid4())
    confirm(settings, database, mt, pid, oid)
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(update(PropertyOwner).values(archived_at=datetime.now(UTC)))
    current = read_detail(database, mt, pid)
    withdrawn = EditOffering.model_validate(
        {
            **body,
            "expected_property_version": current["version"],
            "expected_version": 2,
            "state": "withdrawn",
        }
    )
    run(settings, database, mt, "edit-offering", withdrawn, oid)
    with pytest.raises(IdentityError, match="OFFERING_WITHDRAWN"):
        run(
            settings,
            database,
            mt,
            "edit-offering",
            EditOffering.model_validate(
                {
                    **withdrawn.model_dump(),
                    "expected_property_version": current["version"] + 1,
                    "expected_version": 3,
                }
            ),
            oid,
        )


def test_numbered_inventory_pages_and_allowed_filters(settings, database):
    _, mt = actor(settings, database, "manager")
    _, at = actor(settings, database)
    for reference in ("SP07-C", "SP07-A", "SP07-B"):
        property_draft(settings, database, mt, "land", reference)
    page1 = read_list(
        database, at, "properties", InventoryQuery(page=1, page_size=2, sort="reference")
    )
    page2 = read_list(
        database, at, "properties", InventoryQuery(page=2, page_size=2, sort="reference")
    )
    assert page1["total"] == page2["total"] == 3
    assert [row["reference"] for row in page1["items"] + page2["items"]] == [
        "SP07-A",
        "SP07-B",
        "SP07-C",
    ]
    assert page1["has_next"] and page2["has_previous"] and not page2["has_next"]
    assert read_list(database, at, "properties", InventoryQuery(q="SP07-%"))["total"] == 0
    assert (
        read_list(database, at, "properties", InventoryQuery(offering_kind="rental"))["total"] == 0
    )


def test_independent_database_current_uniqueness_and_owner_constraints(settings, database):
    uid, mt = actor(settings, database, "manager")
    pid = property_draft(settings, database, mt)
    synchronize = Barrier(2)

    def claim():
        try:
            with database.session() as session, session.begin():
                synchronize.wait(timeout=5)
                session.add(
                    Offering(property_id=pid, kind="sale", price_mad=None, created_by_user_id=uid)
                )
            return "created"
        except IntegrityError:
            return "unique-conflict"

    with ThreadPoolExecutor(2) as pool:
        assert sorted(pool.map(lambda _: claim(), range(2))) == ["created", "unique-conflict"]
    with database.session() as session:
        oid = session.scalar(select(Offering.id).where(Offering.property_id == pid))
    for fields in (
        {"currency": "EUR"},
        {"price_mad": 0},
        {"price_period": "month"},
        {"state": "reserved"},
        {"state": "withdrawn"},
        {"state": "available", "price_mad": 1, "availability_confirmed_at": datetime.now(UTC)},
    ):
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.execute(update(Offering).where(Offering.id == oid).values(**fields))
    assert migrate("downgrade", "0006_ownership_scope_guard").returncode != 0


def test_noncolliding_owner_merge_reparents_and_origin_cannot_change(settings, database):
    _, mt = actor(settings, database, "manager")
    _, at = actor(settings, database)
    source = cid(create_lead(settings, database, at))
    survivor = cid(create_lead(settings, database, at, new_lead("+212600000002")))
    pid = property_draft(settings, database, mt)
    owners(settings, database, mt, pid, [source])
    change(
        settings,
        database,
        at,
        source,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    with database.session() as session:
        link = session.scalar(select(PropertyOwner).where(PropertyOwner.property_id == pid))
        assert link.contact_id == survivor and link.origin_contact_id == source
        assert link.archived_at is None
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(update(PropertyOwner).values(origin_contact_id=survivor))


@pytest.mark.anyio
async def test_inventory_http_authority_and_strict_routes(settings, database):
    _, mt = actor(settings, database, "manager")
    _, at = actor(settings, database)

    def proof(token):
        return {
            **authority(settings),
            "X-Kay-Session": token,
            "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
            "Idempotency-Key": str(uuid4()),
        }

    async with client_for(create_app(settings)) as client:
        assert (await client.get("/api/v1/properties")).status_code == 403
        created = await client.post(
            "/api/v1/properties",
            headers=proof(mt),
            json={"reference": "SP07-HTTP", "category": "land"},
        )
        assert created.status_code == 200
        pid = created.json()["property_id"]
        assert (await client.get(f"/api/v1/properties/{pid}", headers=proof(at))).status_code == 200
        for query in (
            "page=1&page=2",
            "owner_id=" + str(uuid4()),
            "category=unit",
            "page_size=101",
        ):
            assert (
                await client.get("/api/v1/properties?" + query, headers=proof(at))
            ).status_code == 422
        assert (
            await client.get(f"/api/v1/properties/{pid}?q=x", headers=proof(at))
        ).status_code == 422
        assert (
            await client.get(f"/api/v1/properties/{pid}/history?q=x", headers=proof(at))
        ).status_code == 422
        searched = await client.get("/api/v1/offerings?q=x", headers=proof(at))
        assert searched.status_code == 200 and searched.json()["total"] == 0
        assert (
            await client.get("/api/v1/offerings?owner_phone=x", headers=proof(at))
        ).status_code == 422
        for extra in (
            {"unapproved_parent_id": str(uuid4())},
            {"created_by_user_id": str(uuid4())},
            {"stock": 10},
        ):
            assert (
                await client.post(
                    "/api/v1/properties",
                    headers=proof(mt),
                    json={"reference": "SP07-reject", "category": "land", **extra},
                )
            ).status_code == 422
        assert (
            await client.post(
                "/api/v1/properties",
                headers=proof(at),
                json={"reference": "SP07-denied", "category": "land"},
            )
        ).status_code == 403
        assert (
            await client.post(
                "/api/v1/properties",
                headers={**proof(mt), "X-CSRF-Token": "bad"},
                json={"reference": "SP07-denied", "category": "land"},
            )
        ).status_code == 403
        assert (
            await client.post("/api/v1/properties", headers=proof(mt), content=b" " * 131073)
        ).status_code == 413
        offering = await client.post(
            "/api/v1/offerings",
            headers=proof(mt),
            json={"property_id": pid, "expected_property_version": 1, "kind": "sale"},
        )
        assert offering.status_code == 200
        assert (
            await client.put(
                f"/api/v1/properties/{pid}/owners",
                headers=proof(mt),
                json={"expected_version": 2, "owners": []},
            )
        ).status_code == 200
        assert (
            await client.patch(
                f"/api/v1/properties/{pid}",
                headers=proof(mt),
                json={"reference": "SP07-HTTP", "category": "land", "expected_version": 3},
            )
        ).status_code == 200
        assert (
            await client.patch(
                f"/api/v1/offerings/{offering.json()['offering_id']}",
                headers=proof(at),
                json={
                    "expected_property_version": 4,
                    "expected_version": 1,
                    "state": "draft",
                    "reason": "Test",
                },
            )
        ).status_code == 403
