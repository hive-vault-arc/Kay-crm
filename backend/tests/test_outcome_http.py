"""Dedicated outcomes and previews enforce facade/session/CSRF and strict fields."""

from uuid import uuid4

import pytest

from app.identity.security import csrf_token
from app.main import create_app
from tests.contact_support import actor
from tests.test_foundation import client_for
from tests.test_outcomes import body
from tests.test_reservations import fixture

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity"), pytest.mark.anyio]


async def test_outcome_routes_are_strict_scoped_retry_safe_and_no_store(settings, database):
    _, token, _, manager, pid, oid, did = fixture(settings, database)
    _, outsider = actor(settings, database)
    secret = settings.facade_secret.get_secret_value()

    def headers(actor_token):
        return {
            "X-Kay-Facade-Secret": secret,
            "X-Kay-Session": actor_token,
            "Origin": settings.frontend_origin,
            "X-CSRF-Token": csrf_token(secret, actor_token),
            "Idempotency-Key": str(uuid4()),
        }

    proof, request = headers(token), body(database, token, did).model_dump(mode="json")
    path = f"/api/v1/deals/{did}"
    async with client_for(create_app(settings)) as client:
        assert (await client.post(path + "/close", json=request)).status_code == 403
        assert (
            await client.post(
                path + "/close", headers={**proof, "X-CSRF-Token": "invalid"}, json=request
            )
        ).status_code == 403
        assert (
            await client.post(path + "/close", headers=headers(outsider), json=request)
        ).status_code == 404
        for resource in ("outcomes", "stock-review"):
            assert (
                await client.get(path + "/" + resource, headers=headers(outsider))
            ).status_code == 404
            assert (
                await client.get(path + "/" + resource + "?private=true", headers=proof)
            ).status_code == 422
        for patch in (
            {"agreed_amount_mad": None},
            {"completed_on": None},
            {"explanation": " "},
            {"commission": "100"},
            {"actor_id": str(uuid4())},
            {"expected_version": True},
            {"override": True},
            {"remaining_units": []},
        ):
            assert (
                await client.post(path + "/close", headers=proof, json={**request, **patch})
            ).status_code == 422
        result = await client.post(path + "/close", headers=proof, json=request)
        assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
        assert (
            await client.post(path + "/close", headers=proof, json=request)
        ).json() == result.json()
        assert (
            await client.post(
                path + "/close", headers=proof, json={**request, "explanation": "Autre résultat"}
            )
        ).status_code == 409
        reopen = body(database, token, did, reopen=True).model_dump(mode="json")
        assert (
            await client.post(
                path + "/reopen", headers=headers(token), json={**reopen, "reason": " "}
            )
        ).status_code == 422
        assert (
            await client.post(path + "/reopen", headers=headers(token), json=reopen)
        ).status_code == 200
        stock = f"/api/v1/properties/{pid}/stock-review?offering_id={oid}"
        assert (await client.get(stock, headers=proof)).status_code == 403
        assert (await client.get(stock, headers=headers(manager))).status_code == 200
        external = {
            "expected_version": reopen["expected_target_version"],
            "offering_id": str(oid),
            "expected_offering_version": reopen["expected_offering_version"],
            "expected_development_version": None,
            "expected_stock_fingerprint": reopen["expected_stock_fingerprint"],
            "completed_on": "2026-10-15",
            "explanation": "Résultat externe synthétique",
        }
        assert (
            await client.post(
                f"/api/v1/properties/{pid}/external-outcome", headers=proof, json=external
            )
        ).status_code == 403
        assert (
            await client.post(
                f"/api/v1/properties/{pid}/external-outcome",
                headers=headers(manager),
                json={**external, "income": "100"},
            )
        ).status_code == 422
