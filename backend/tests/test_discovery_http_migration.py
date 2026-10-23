"""SP-19 strict transport and populated non-destructive upgrade."""

from uuid import uuid4

import pytest
from sqlalchemy import text

from app.discovery.contracts import NewExport
from app.discovery.export_worker import run_once
from app.discovery.exports import request_export
from app.identity.security import csrf_token
from app.main import create_app
from tests.contact_support import actor, create_lead
from tests.legacy_support import contact as legacy_contact
from tests.legacy_support import property as legacy_property
from tests.test_foundation import client_for
from tests.test_isolation_migrations import migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.anyio
async def test_strict_transport_scope_roles_single_use_origin_and_session_bound_delivery(
    settings, database
):
    _, agent = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    create_lead(settings, database, agent)
    secret = settings.facade_secret.get_secret_value()
    headers = {
        "X-Kay-Facade-Secret": secret,
        "X-Kay-Session": manager,
        "Origin": settings.frontend_origin,
        "X-CSRF-Token": csrf_token(secret, manager),
        "Idempotency-Key": str(uuid4()),
    }
    agent_headers = headers | {"X-Kay-Session": agent, "X-CSRF-Token": csrf_token(secret, agent)}
    async with client_for(create_app(settings)) as client:
        assert (await client.get("/api/v1/search?q=SP", headers={})).status_code == 403
        for query in ("q=x", "q=SP&page=0", "q=SP&page_size=101", "q=SP&q=XX", "q=SP&scope=all"):
            assert (await client.get("/api/v1/search?" + query, headers=headers)).status_code == 422
        assert (await client.get("/api/v1/search?q=SP", headers=agent_headers)).status_code == 200
        for path in ("exports", "audit/events", f"exports/{uuid4()}"):
            assert (await client.get("/api/v1/" + path, headers=agent_headers)).status_code == 403
        assert (
            await client.get(
                "/api/v1/audit/events?start_on=2026-10-16&end_on=2026-10-15", headers=headers
            )
        ).status_code == 422
        assert (
            await client.post("/api/v1/exports", headers=headers | {"X-CSRF-Token": "bad"}, json={})
        ).status_code == 403
        assert (
            await client.post("/api/v1/exports", headers=agent_headers, json={})
        ).status_code == 403
        assert (
            await client.post("/api/v1/exports", headers=headers, json={"filters": {"page": 2}})
        ).status_code == 422
        result = await client.post("/api/v1/exports", headers=headers, json={"kind": "contacts"})
        assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
        eid = result.json()["id"]
        assert (
            await client.post("/api/v1/exports", headers=headers, json={"kind": "contacts"})
        ).json()["id"] == eid
        assert run_once(database, settings)
        permit = (
            await client.post(f"/api/v1/exports/{eid}/download-permit", headers=headers, json={})
        ).json()
        proof = {
            "Origin": settings.frontend_origin,
            "X-File-Permit": permit["token"],
            "X-File-Session": headers["X-CSRF-Token"],
        }
        path = f"/api/v1/transfers/exports/{eid}"
        assert (
            await client.get(path, headers=proof | {"Origin": "https://wrong.invalid"})
        ).status_code == 403
        assert (
            await client.get(
                path, headers=proof | {"X-File-Session": agent_headers["X-CSRF-Token"]}
            )
        ).status_code == 403
        assert (
            await client.get(f"/api/v1/transfers/exports/{uuid4()}", headers=proof)
        ).status_code == 403
        delivered = await client.get(path, headers=proof)
        assert delivered.status_code == 200 and delivered.headers["cache-control"] == "no-store"
        assert (
            delivered.content.startswith(b"\xef\xbb\xbf") and b"'+212600000001" in delivered.content
        )
        assert (await client.get(path, headers=proof)).status_code == 403


def test_populated_upgrade_retains_contacts_inventory_history_and_downgrade_refuses_evidence(
    settings, database
):
    uid, _ = actor(settings, database)
    manager_id, manager = actor(settings, database, "manager")

    def facts():
        with database.engine.connect() as connection:
            return [
                connection.execute(text(query), {"cid": cid, "pid": pid}).scalars().all()
                for query in (
                    "SELECT to_jsonb(c)-ARRAY['website_source_id','country','nationality',"
                    "'languages'] FROM contact c WHERE id=:cid",
                    "SELECT to_jsonb(p)-'website_source_id' FROM contact_phone p "
                    "WHERE contact_id=:cid ORDER BY id",
                    "SELECT to_jsonb(p)-ARRAY['archived_at','listing_details'] "
                    "FROM property p WHERE id=:pid",
                    "SELECT to_jsonb(e) FROM inventory_event e WHERE property_id=:pid ORDER BY id",
                )
            ]

    assert migrate("downgrade", "0019_atomic_contact_import").returncode == 0
    try:
        cid = legacy_contact(database, uid)
        pid = legacy_property(database, manager_id)
        before = facts()
        assert migrate("upgrade", "head").returncode == 0
        assert migrate("check").returncode == 0
        assert facts() == before
        with database.engine.connect() as connection:
            assert connection.scalar(
                text("SELECT listing_details = '{}'::jsonb FROM property WHERE id=:pid"),
                {"pid": pid},
            )
            assert connection.scalar(
                text("SELECT website_source_id IS NULL FROM contact WHERE id=:cid"), {"cid": cid}
            )
        request_export(database, manager, uuid4(), NewExport())
        refused = migrate("downgrade", "0019_atomic_contact_import")
        assert refused.returncode != 0
        assert "QUALIFICATION_HISTORY_DOWNGRADE_REFUSED" in refused.stderr
        assert facts() == before
    finally:
        assert migrate("upgrade", "head").returncode == 0


def test_retention_cli_closed_input_refuses_without_opening_a_purge(settings):
    import os
    import subprocess
    import sys

    result = subprocess.run(
        [sys.executable, "-m", "app.cli.retention"],
        input="",
        env=os.environ | {"APP_ENVIRONMENT": "test"},
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode == 1
    assert result.stderr.strip() == "RETENTION_CONFIRMATION_REQUIRED"
    assert "Traceback" not in result.stderr
