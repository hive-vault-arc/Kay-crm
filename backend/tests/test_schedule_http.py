"""Strict facade/session/Origin/CSRF, private projections and bounded scheduling JSON."""

from uuid import UUID, uuid4

import pytest

from app.identity.security import csrf_token
from app.main import create_app
from tests.contact_support import actor
from tests.test_foundation import client_for
from tests.test_schedule import booking, prepared

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity"), pytest.mark.anyio]


async def test_schedule_wire_authority_validation_retry_and_projection(settings, database):
    uid, token, cid, _ = prepared(settings, database)
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

    proof, body = headers(token), booking(uid, cid).model_dump(mode="json")
    async with client_for(create_app(settings)) as client:
        assert (await client.post("/api/v1/visits", json=body)).status_code == 403
        assert (
            await client.post(
                "/api/v1/visits", headers={**proof, "X-CSRF-Token": "invalid"}, json=body
            )
        ).status_code == 403
        assert (
            await client.post(
                "/api/v1/visits", headers={**proof, "Origin": "https://invalid.example"}, json=body
            )
        ).status_code == 403
        assert (
            await client.post("/api/v1/visits", headers=headers(outsider), json=body)
        ).status_code == 404
        for patch in (
            {"override": True},
            {"status": "completed"},
            {"participant_ids": []},
            {"expected_version": True},
            {"start_at": "2030-01-07T10:30"},
        ):
            assert (
                await client.post("/api/v1/visits", headers=proof, json=body | patch)
            ).status_code == 422
        result = await client.post("/api/v1/visits", headers=proof, json=body)
        assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
        assert (
            await client.post("/api/v1/visits", headers=proof, json=body)
        ).json() == result.json()
        assert (
            await client.post("/api/v1/visits", headers=proof, json=body | dict(title="Autre"))
        ).status_code == 409
        vid = UUID(result.json()["id"])
        for suffix in ("", "/history"):
            assert (
                await client.get(f"/api/v1/visits/{vid}{suffix}", headers=headers(outsider))
            ).status_code == 404
            assert (
                await client.get(f"/api/v1/visits/{vid}{suffix}?unexpected=1", headers=proof)
            ).status_code == 422
        period = "start_at=2030-01-07T00%3A00%3A00Z&end_at=2030-01-08T00%3A00%3A00Z"
        busy = await client.get(f"/api/v1/calendar/free-busy?{period}", headers=headers(outsider))
        assert busy.status_code == 200 and set(busy.json()["items"][0]) == {
            "start_at",
            "end_at",
            "busy",
        }
        assert (
            await client.get(f"/api/v1/calendar/free-busy?{period}&contact_id={cid}", headers=proof)
        ).status_code == 422
        assert (
            await client.get(f"/api/v1/visits?{period}&page=1&page=2", headers=proof)
        ).status_code == 422
        assert (
            await client.get(f"/api/v1/visits?{period}&secret=1", headers=proof)
        ).status_code == 422
        assert (
            await client.get("/api/v1/calendar/local-time?local=2026-03-22T02%3A30", headers=proof)
        ).json()["choices"] == []
        assert (
            len(
                (
                    await client.get(
                        "/api/v1/calendar/local-time?local=2026-02-15T02%3A30", headers=proof
                    )
                ).json()["choices"]
            )
            == 2
        )
        assert (await client.get("/api/v1/calendar/context", headers=proof)).json()[
            "tzdata_version"
        ] == "2026.5"
