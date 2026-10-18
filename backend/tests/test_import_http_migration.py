"""Strict import transport, direct permits and populated additive migration."""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import text

from app.contacts.models import Contact
from app.contacts.ownership import mutate
from app.identity.security import csrf_token
from app.imports.contracts import NewBatch
from app.imports.models import ImportBatch, ImportRow
from app.imports.queries import read_batch
from app.imports.service import approve, create_batch
from app.main import create_app
from tests.contact_support import actor, create_lead
from tests.test_foundation import client_for
from tests.test_imports import csv_bytes, prepared, row
from tests.test_isolation_migrations import migrate
from tests.test_ownership import confirmation, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.anyio
async def test_current_roles_strict_facade_csrf_query_and_direct_session_permit(settings, database):
    uid, agent = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    secret = settings.facade_secret.get_secret_value()
    headers = {
        "X-Kay-Facade-Secret": secret,
        "X-Kay-Session": manager,
        "Origin": settings.frontend_origin,
        "X-CSRF-Token": csrf_token(secret, manager),
        "Idempotency-Key": str(uuid4()),
    }
    data = csv_bytes(row())
    async with client_for(create_app(settings)) as client:
        assert (await client.post("/api/v1/imports", json={}, headers={})).status_code == 403
        assert (
            await client.post(
                "/api/v1/imports", json={}, headers=headers | {"X-CSRF-Token": "wrong"}
            )
        ).status_code == 403
        payload = {"filename": "synthetic.csv", "size_bytes": len(data)}
        agent_headers = headers | {
            "X-Kay-Session": agent,
            "X-CSRF-Token": csrf_token(secret, agent),
        }
        assert (
            await client.post("/api/v1/imports", json=payload, headers=agent_headers)
        ).status_code == 403
        response = await client.post("/api/v1/imports", json=payload, headers=headers)
        assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
        bid = response.json()["id"]
        path = f"/api/v1/imports/{bid}"
        for query in ("page=0", "page_size=101", "role=manager", "page=1&page=2"):
            assert (await client.get(f"{path}?{query}", headers=headers)).status_code == 422
        assert (await client.get(path, headers=agent_headers)).status_code == 403
        assert (
            await client.post(
                f"{path}/preview", headers=headers, json={"fallback_agent_id": str(uid)}
            )
        ).status_code == 409
        permit = (await client.post(f"{path}/upload-permit", headers=headers, json={})).json()
        transfer = f"/api/v1/transfers/imports/{bid}"
        proof = {
            "Origin": settings.frontend_origin,
            "X-File-Permit": permit["token"],
            "X-File-Session": headers["X-CSRF-Token"],
            "Content-Type": "text/csv",
        }
        assert (
            await client.put(f"/api/v1/transfers/imports/{uuid4()}", content=data, headers=proof)
        ).status_code == 403
        assert (
            await client.put(
                transfer, content=data, headers=proof | {"Origin": "https://wrong.invalid"}
            )
        ).status_code == 403
        assert (
            await client.put(
                transfer,
                content=data,
                headers=proof | {"X-File-Session": csrf_token(secret, agent)},
            )
        ).status_code == 403
        response = await client.put(transfer, content=data, headers=proof)
        assert response.status_code == 200 and response.json()["state"] == "uploaded"
        assert (await client.put(transfer, content=data, headers=proof)).status_code == 403
        assert (await client.get(transfer, headers=proof)).status_code == 405
        response = await client.post(
            f"{path}/preview", headers=headers, json={"fallback_agent_id": str(uid)}
        )
        assert response.status_code == 200
        body = {"preview_hash": response.json()["preview_hash"], "fallback_agent_id": str(uid)}
        assert (
            await client.post(f"{path}/approve", headers=headers, json=body | {"contacts": []})
        ).status_code == 422
        assert (await client.post(f"{path}/approve", headers=headers, json=body)).status_code == 200
        assert (await client.post(f"{path}/approve", headers=headers, json=body)).json()["result"][
            "committed"
        ] == 1
        assert (await client.get(f"{path}/raw", headers=headers)).status_code == 404
        admin_id, admin = actor(settings, database, "administrator")
        assert (
            admin_id
            and (await client.get(path, headers=headers | {"X-Kay-Session": admin})).status_code
            == 200
        )


def test_import_origin_survives_authorized_merge(settings, database):
    uid, token, manager, bid, body = prepared(settings, database)
    approve(database, manager, bid, uuid4(), body)
    source = UUID(read_batch(database, manager, bid)["items"][0]["contact_id"])
    survivor = UUID(create_lead(settings, database, token)["contact"]["id"])
    confirmed = confirmation(
        settings,
        database,
        manager,
        source,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    mutate(
        database,
        manager,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        source,
        confirmed,
        "merge",
    )
    with database.session() as session:
        assert session.get(Contact, source).merged_into_contact_id == survivor
        assert session.get(ImportRow, (bid, 2)).contact_id == source
        assert session.get(ImportRow, (bid, 2)).agent_id == uid
        assert session.get(ImportBatch, bid).state == "committed"


def test_populated_0018_facts_preserved_and_import_evidence_refuses_downgrade(settings, database):
    from tests.legacy_support import contact as legacy_contact

    uid, _ = actor(settings, database)
    assert migrate("downgrade", "0018_commissions_collections").returncode == 0
    try:
        cid = legacy_contact(database, uid)
        with database.engine.connect() as connection:
            before = connection.execute(
                text("SELECT to_jsonb(c) FROM contact c WHERE id=:id"), {"id": cid}
            ).scalar_one()
            phones = (
                connection.execute(
                    text(
                        "SELECT to_jsonb(p)-'website_source_id' FROM contact_phone p "
                        "WHERE contact_id=:id ORDER BY id"
                    ),
                    {"id": cid},
                )
                .scalars()
                .all()
            )
        assert migrate("upgrade", "head").returncode == 0
        assert migrate("check").returncode == 0
        with database.engine.connect() as connection:
            assert (
                connection.execute(
                    text("SELECT to_jsonb(c) FROM contact c WHERE id=:id"), {"id": cid}
                )
                .scalar_one()
                .items()
                >= before.items()
            )
            assert (
                connection.execute(
                    text(
                        "SELECT to_jsonb(p)-'website_source_id' FROM contact_phone p "
                        "WHERE contact_id=:id ORDER BY id"
                    ),
                    {"id": cid},
                )
                .scalars()
                .all()
                == phones
            )
        _, manager = actor(settings, database, "manager")
        create_batch(database, manager, uuid4(), NewBatch(filename="evidence.csv", size_bytes=1))
        assert migrate("downgrade", "0018_commissions_collections").returncode != 0
    finally:
        assert migrate("upgrade", "head").returncode == 0
