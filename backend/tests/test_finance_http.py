"""The real FastAPI facade/session/CSRF boundary denies finance to every agent."""

from uuid import uuid4

import pytest

from app.finance.contracts import NewCommission
from app.identity.security import csrf_token
from app.main import create_app
from tests.test_finance import fixture, terms
from tests.test_foundation import client_for

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity"), pytest.mark.anyio]


async def test_finance_transport_roles_strict_money_pages_csrf_and_no_store(settings, database):
    _, agent, _, manager, did = fixture(settings, database)
    secret = settings.facade_secret.get_secret_value()

    def headers(token):
        return {
            "X-Kay-Facade-Secret": secret,
            "X-Kay-Session": token,
            "Origin": settings.frontend_origin,
            "X-CSRF-Token": csrf_token(secret, token),
            "Idempotency-Key": str(uuid4()),
        }

    request = NewCommission(expected_deal_version=1, **terms()).model_dump(mode="json")
    route = f"/api/v1/deals/{did}/commissions"
    proof = headers(manager)
    async with client_for(create_app(settings)) as client:
        assert (await client.post(route, json=request)).status_code == 403
        for patch in ({"Origin": "https://invalid.example"}, {"X-CSRF-Token": "bad"}):
            assert (
                await client.post(route, headers=proof | patch, json=request)
            ).status_code == 403
        assert (await client.post(route, headers=headers(agent), json=request)).status_code == 403
        assert (await client.get(route, headers=headers(agent))).status_code == 403
        for patch in (
            {"balance_mad": "0"},
            {"amount_mad": 1.5},
            {"state": "recognized"},
            {"expected_deal_version": True},
        ):
            assert (
                await client.post(route, headers=proof, json=request | patch)
            ).status_code == 422
        result = await client.post(route, headers=proof, json=request)
        assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
        assert (await client.post(route, headers=proof, json=request)).json() == result.json()
        cid = result.json()["id"]
        for suffix in ("", "/revisions", "/receipts"):
            path = f"/api/v1/commissions/{cid}{suffix}"
            assert (await client.get(path, headers=headers(agent))).status_code == 403
            assert (await client.get(path, headers=proof)).headers["cache-control"] == "no-store"
        for suffix, body in (
            ("recognize", {"expected_version": 1}),
            (
                "receipts",
                {
                    "expected_version": 1,
                    "amount_mad": "1",
                    "received_on": "2026-10-15",
                    "reason": "SP16 synthétique",
                },
            ),
            (
                "correct",
                {
                    "target": "commission",
                    "expected_version": 1,
                    "reason": "SP16 synthétique",
                    **terms(),
                },
            ),
        ):
            assert (
                await client.post(
                    f"/api/v1/commissions/{cid}/{suffix}", headers=headers(agent), json=body
                )
            ).status_code == 403
        for query in ("page=1&page=2", "page_size=101", "secret=1"):
            assert (await client.get(f"{route}?{query}", headers=proof)).status_code == 422
        assert (
            await client.get(f"/api/v1/commissions/{uuid4()}", headers=proof)
        ).status_code == 404
