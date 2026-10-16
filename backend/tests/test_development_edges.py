"""HTTP authority, bounded input and populated SP-07 migration preservation."""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import text

from app.identity.security import csrf_token
from app.main import create_app
from tests.contact_support import actor
from tests.test_auth import authority
from tests.test_developments import development, hierarchy, read, structure, unit
from tests.test_foundation import client_for
from tests.test_isolation_migrations import migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.anyio
async def test_hierarchy_http_default_available_strict_queries_and_current_authority(
    settings, database
):
    _, token = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    did = development(settings, database, token)
    bid, floors, tid = hierarchy(settings, database, token, did)
    unit(settings, database, token, did, floors[0], tid)

    def proof(value):
        return {
            **authority(settings),
            "X-Kay-Session": value,
            "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), value),
            "Idempotency-Key": str(uuid4()),
        }

    async with client_for(create_app(settings)) as client:
        assert (await client.get("/api/v1/developments")).status_code == 403
        for path in (
            "developments",
            f"developments/{did}",
            f"developments/{did}/inventory",
            f"developments/{did}/blocks",
            f"blocks/{bid}/floors",
            f"developments/{did}/unit-types",
            f"developments/{did}/owners",
            f"developments/{did}/history",
        ):
            response = await client.get(f"/api/v1/{path}", headers=proof(agent))
            assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
        default = await client.get(f"/api/v1/developments/{did}/inventory", headers=proof(agent))
        assert default.json()["total"] == 0
        for level in ("unit", "standalone"):
            # SP-10 adds these real physical-target filters; templates stay invalid.
            selected = await client.get(
                f"/api/v1/offerings?target_level={level}", headers=proof(agent)
            )
            assert selected.status_code == 200 and selected.json()["total"] == 0
        for level in ("floor", "unit_type"):
            assert (
                await client.get(f"/api/v1/offerings?target_level={level}", headers=proof(agent))
            ).status_code == 422
        all_units = await client.get(
            f"/api/v1/developments/{did}/inventory?state=all", headers=proof(agent)
        )
        assert all_units.json()["total"] == 1
        for suffix in (
            "?page=1&page=2",
            "?owner_id=" + str(uuid4()),
            "?developer_contact_id=" + str(uuid4()),
            "?page_size=101",
        ):
            assert (
                await client.get(
                    f"/api/v1/developments/{did}/inventory{suffix}", headers=proof(agent)
                )
            ).status_code == 422
        for path, method, body in (
            ("developments", "POST", {"reference": "SP08-denied", "name": "Synthétique"}),
            (
                f"developments/{did}/blocks",
                "POST",
                {"expected_version": 5, "code": "X", "label": "Synthétique"},
            ),
            (
                f"blocks/{bid}/floors",
                "POST",
                {"expected_version": 5, "code": "X", "label": "Synthétique"},
            ),
            (
                f"floors/{floors[0]}",
                "PATCH",
                {"expected_version": 5, "code": "X", "label": "Synthétique"},
            ),
            (
                f"unit-types/{tid}",
                "PATCH",
                {
                    "expected_version": 5,
                    "development_id": str(did),
                    "code": "T2",
                    "label": "T2",
                    "category": "apartment",
                },
            ),
            (f"developments/{did}/owners", "PUT", {"expected_version": 5, "owners": []}),
        ):
            assert (
                await client.request(method, f"/api/v1/{path}", headers=proof(agent), json=body)
            ).status_code == 403
        assert (
            await client.post(
                "/api/v1/developments",
                headers=proof(token),
                json={
                    "reference": "SP08-unknown",
                    "name": "Synthétique",
                    "owner_notes": "Never accepted",
                },
            )
        ).status_code == 422
        assert (
            await client.post("/api/v1/developments", headers=proof(token), content=b" " * 131073)
        ).status_code == 413
        assert (
            await client.post(
                "/api/v1/developments",
                headers={**proof(token), "X-CSRF-Token": "invalid"},
                json={"reference": "SP08-csrf", "name": "Synthétique"},
            )
        ).status_code == 403


def test_scope_uniqueness_level_edit_and_populated_downgrade_refusal(settings, database):
    _, token = actor(settings, database, "manager")
    did = development(settings, database, token)
    other = development(settings, database, token)
    structure(settings, database, token, did, "create-block", code="A")
    structure(settings, database, token, other, "create-block", code="A")
    bid = UUID(read(database, token, "blocks", did)["items"][0]["id"])
    structure(settings, database, token, did, "edit-block", bid, code="B")
    assert read(database, token, "blocks", did)["items"][0]["code"] == "B"
    refused = migrate("downgrade", "0008_inventory_finite_amounts")
    assert refused.returncode != 0 and "DEVELOPMENT_HISTORY_DOWNGRADE_REFUSED" in refused.stderr


def test_populated_0008_upgrade_preserves_physical_inventory_and_campaign(settings, database):
    uid, _ = actor(settings, database, "manager")
    pid, oid, eid = uuid4(), uuid4(), uuid4()
    assert migrate("downgrade", "0008_inventory_finite_amounts").returncode == 0
    try:
        with database.session() as session, session.begin():
            session.execute(
                text(
                    "INSERT INTO "
                    "property(id,reference,category,area_sqm,created_by_user_id,version) "
                    "VALUES(:pid,'SP08-LEGACY','land',80.25,:uid,7)"
                ),
                {"pid": pid, "uid": uid},
            )
            session.execute(
                text(
                    "INSERT INTO offering(id,property_id,kind,price_mad,created_by_user_id) "
                    "VALUES(:oid,:pid,'sale',900000.01,:uid)"
                ),
                {"oid": oid, "pid": pid, "uid": uid},
            )
            session.execute(
                text(
                    "INSERT INTO "
                    "inventory_event(id,property_id,offering_id,actor_user_id,"
                    "actor_display_name,action,property_version) "
                    "VALUES(:eid,:pid,:oid,:uid,'SP08 acteur synthétique','offerings.created',7)"
                ),
                {"eid": eid, "oid": oid, "pid": pid, "uid": uid},
            )
        assert migrate("upgrade", "head").returncode == 0
        with database.session() as session:
            row = session.execute(
                text(
                    "SELECT reference,area_sqm,version,development_id,floor_id,unit_type_id FROM "
                    "property WHERE id=:id"
                ),
                {"id": pid},
            ).one()
            assert tuple(row) == ("SP08-LEGACY", 80.25, 7, None, None, None)
            assert (
                session.scalar(text("SELECT property_id FROM offering WHERE id=:id"), {"id": oid})
                == pid
            )
            assert (
                session.scalar(text("SELECT id FROM inventory_event WHERE id=:id"), {"id": eid})
                == eid
            )
    finally:
        assert migrate("upgrade", "head").returncode == 0
