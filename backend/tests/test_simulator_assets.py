"""Static asset compatibility must not widen the signed simulator's proxy boundary."""

from contextlib import contextmanager
from types import SimpleNamespace

import httpx
import pytest

from app.intake import simulator


@pytest.mark.anyio
async def test_development_swc_chunk_stays_inside_fixed_static_proxy(settings, monkeypatch):
    requested = []

    @contextmanager
    def open_asset(request, timeout):
        requested.append((request.full_url, timeout))
        yield SimpleNamespace(
            status=200,
            headers={"Content-Type": "application/javascript"},
            read=lambda limit: b"export {};",
        )

    monkeypatch.setattr(
        simulator, "build_opener", lambda *handlers: SimpleNamespace(open=open_asset)
    )
    app = simulator.create_simulator(settings)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="https://127.0.0.1:8001"
    ) as client:
        response = await client.get("/_next/static/chunks/vendor_%40swc_helpers.js")
        assert response.status_code == 200 and response.content == b"export {};"
    assert requested == [("https://localhost:3000/_next/static/chunks/vendor_@swc_helpers.js", 8)]


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("path", "host"),
    [
        ("/_next/static/chunks/%2e%2e/private.js", "127.0.0.1:8001"),
        ("/_next/static/chunks/vendor%3Aprivate.js", "127.0.0.1:8001"),
        ("/_next/static/chunks/vendor%3Fprivate.js", "127.0.0.1:8001"),
        ("/api/v1/auth/me", "127.0.0.1:8001"),
        ("/_next/static/chunks/vendor_%40swc.js", "localhost:8001"),
    ],
)
async def test_invalid_asset_or_host_never_reaches_upstream(settings, monkeypatch, path, host):
    def forbidden_upstream(*args, **kwargs):
        pytest.fail("Rejected paths and hosts must never reach the upstream")

    monkeypatch.setattr(
        simulator, "build_opener", lambda *handlers: SimpleNamespace(open=forbidden_upstream)
    )
    app = simulator.create_simulator(settings)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="https://127.0.0.1:8001"
    ) as client:
        response = await client.get(path, headers={"Host": host})
        assert response.status_code == 404
