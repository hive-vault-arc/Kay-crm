"""The dedicated routes require facade, current session, CSRF and strict bodies."""

from uuid import uuid4

import pytest

from app.identity.security import csrf_token
from app.main import create_app
from tests.test_foundation import client_for
from tests.test_reservations import fixture, reviewed

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity"), pytest.mark.anyio]


async def test_dedicated_routes_proof_validation_idempotency_and_explicit_reason(
    settings, database
):
    _, token, _, _, _, _, did = fixture(settings, database)
    secret = settings.facade_secret.get_secret_value()
    headers = {
        "X-Kay-Facade-Secret": secret,
        "X-Kay-Session": token,
        "Origin": settings.frontend_origin,
        "X-CSRF-Token": csrf_token(secret, token),
        "Idempotency-Key": str(uuid4()),
    }
    body = reviewed(database, token, did).model_dump(mode="json")
    async with client_for(create_app(settings)) as client:
        path = f"/api/v1/deals/{did}/reserve"
        assert (await client.post(path, json=body)).status_code == 403
        assert (
            await client.post(path, headers={**headers, "X-CSRF-Token": "invalid"}, json=body)
        ).status_code == 403
        for extra in (
            {"expires_at": "2040-01-01"},
            {"actor_id": str(uuid4())},
            {"expected_target_version": True},
        ):
            assert (
                await client.post(path, headers=headers, json={**body, **extra})
            ).status_code == 422
        assert (
            await client.post(path + "?expand=private", headers=headers, json=body)
        ).status_code == 422
        result = await client.post(path, headers=headers, json=body)
        assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
        assert (await client.post(path, headers=headers, json=body)).json() == result.json()
        assert (
            await client.post(path, headers=headers, json={**body, "expected_version": 2})
        ).status_code == 409
        release = reviewed(database, token, did).model_dump(mode="json")
        path = f"/api/v1/deals/{did}/release-reservation"
        assert (await client.post(path, headers=headers, json=release)).status_code == 422
        assert (
            await client.post(path, headers=headers, json={**release, "reason": "  "})
        ).status_code == 422
        release["reason"] = "Libération HTTP synthétique"
        assert (await client.post(path, headers=headers, json=release)).status_code == 200
        assert (await client.get(f"/api/v1/deals/{did}", headers=headers)).json()[
            "active_reservation"
        ] is None
