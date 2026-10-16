"""Actual facade/session/CSRF transport rejects copied IDs and unexpected inputs."""

from uuid import uuid4

import pytest

from app.identity.security import csrf_token
from app.main import create_app
from tests.contact_support import actor
from tests.deal_support import setup
from tests.test_foundation import client_for
from tests.test_work import new

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity"), pytest.mark.anyio]


async def test_work_routes_authority_strictness_pages_denial_and_no_store(settings, database):
    uid, token, contact, _ = setup(settings, database)
    _, outsider = actor(settings, database)
    secret = settings.facade_secret.get_secret_value()

    def headers(proof):
        return {
            "X-Kay-Facade-Secret": secret,
            "X-Kay-Session": proof,
            "Origin": settings.frontend_origin,
            "X-CSRF-Token": csrf_token(secret, proof),
            "Idempotency-Key": str(uuid4()),
        }

    proof, body = headers(token), new(uid, contact).model_dump(mode="json")
    async with client_for(create_app(settings)) as client:
        assert (await client.post("/api/v1/tasks", json=body)).status_code == 403
        for patch in ({"X-CSRF-Token": "bad"}, {"Origin": "https://invalid.example"}):
            assert (
                await client.post("/api/v1/tasks", headers=proof | patch, json=body)
            ).status_code == 403
        assert (
            await client.post("/api/v1/tasks", headers=headers(outsider), json=body)
        ).status_code == 404
        for patch in (
            {"expected_version": True},
            {"status": "completed"},
            {"due_at": "2030-01-07T10:00"},
            {"override": True},
        ):
            assert (
                await client.post("/api/v1/tasks", headers=proof, json=body | patch)
            ).status_code == 422
        result = await client.post("/api/v1/tasks", headers=proof, json=body)
        assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
        assert (
            await client.post("/api/v1/tasks", headers=proof, json=body)
        ).json() == result.json()
        tid = result.json()["id"]
        for suffix in ("", "/history"):
            assert (
                await client.get(f"/api/v1/tasks/{tid}{suffix}", headers=headers(outsider))
            ).status_code == 404
        for route in ("tasks", "notifications", "visits/follow-up"):
            for query in ("page=1&page=2", "secret=1", "page_size=101"):
                assert (
                    await client.get(f"/api/v1/{route}?{query}", headers=proof)
                ).status_code == 422
            response = await client.get(f"/api/v1/{route}", headers=proof)
            assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
        assert (await client.get("/api/v1/work/context", headers=proof)).json()[
            "time_zone"
        ] == "Africa/Casablanca"
        assert (
            await client.post(f"/api/v1/notifications/{uuid4()}/read", headers=proof, json={})
        ).status_code == 404
        assert (
            await client.post(
                f"/api/v1/notifications/{uuid4()}/read", headers=proof, json={"user_id": str(uid)}
            )
        ).status_code == 422
