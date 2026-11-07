"""Connection-forbidden public field and asset boundaries for the selected intake form."""

import ssl
from contextlib import contextmanager
from types import SimpleNamespace

import httpx
import pytest
from pydantic import ValidationError

from app.intake import simulator
from app.intake.contracts import Submission
from app.settings import Settings


def public_fields(**changes: object) -> dict[str, object]:
    return {
        "submission_id": "synthetic-public-reference",
        "submitted_at": "2026-10-28T12:00:00+00:00",
        "name": "Synthetic public visitor",
        "phone": "+212600000001",
        "message": "Synthetic public enquiry",
        **changes,
    }


def test_optional_reference_is_enquiry_text_without_an_inventory_lookup():
    value = Submission.model_validate(public_fields(message="", property_reference="SYN-REF-42"))
    assert value.enquiry_message() == "\nRéférence du bien : SYN-REF-42"
    assert value.property_reference == "SYN-REF-42"


@pytest.mark.parametrize("reference", [None, "SYN-REF-42", "  SYN-REF-42  ", "é" * 100, "🙂" * 100])
def test_public_reference_and_message_share_the_existing_codepoint_limit(reference):
    normalized = reference.strip() if reference else ""
    suffix = "\nRéférence du bien : " + normalized if normalized else ""
    message = "x" * (4000 - len(suffix))
    value = Submission.model_validate(
        public_fields(message=" " + message + " ", property_reference=reference)
    )
    assert len(value.enquiry_message()) == 4000
    with pytest.raises(ValidationError):
        Submission.model_validate(
            public_fields(message=message + "x", property_reference=reference)
        )


@pytest.mark.parametrize("control", ["\x00", "\x08", "\x0b", "\x1f"])
def test_reference_control_characters_are_rejected_before_receipt_processing(control):
    with pytest.raises(ValidationError):
        Submission.model_validate(public_fields(property_reference=f"SYN{control}REF"))


def test_reference_guard_preserves_unicode_and_existing_multiline_enquiry_text():
    value = Submission.model_validate(
        public_fields(message="Synthetic first line\n\tSecond line", property_reference="RÉF-🙂")
    )
    assert (
        value.enquiry_message() == "Synthetic first line\n\tSecond line\nRéférence du bien : RÉF-🙂"
    )


def public_simulator(monkeypatch, payload=b"synthetic-public-asset"):
    requested = []

    @contextmanager
    def open_asset(request, timeout):
        requested.append((request.full_url, timeout, dict(request.header_items())))
        yield SimpleNamespace(
            status=200,
            headers={"Content-Type": "image/svg+xml"},
            read=lambda limit: payload,
        )

    monkeypatch.setattr(
        simulator.ssl,
        "create_default_context",
        lambda **kwargs: ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT),
    )
    monkeypatch.setattr(
        simulator, "build_opener", lambda *handlers: SimpleNamespace(open=open_asset)
    )

    def forbidden_key(*args, **kwargs):
        pytest.fail("A public asset must never read source signing configuration")

    monkeypatch.setattr(simulator, "load_key", forbidden_key)
    # Static paths do not use database/runtime settings or a configured source.
    return simulator.create_simulator(Settings.model_construct()), requested


@pytest.mark.anyio
@pytest.mark.parametrize("asset", ["kay-logo.svg", "kay-pearl-atmosphere.png"])
async def test_only_selected_public_assets_use_fixed_frontend_without_identity(monkeypatch, asset):
    app, requested = public_simulator(monkeypatch)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="https://127.0.0.1:8001"
    ) as client:
        response = await client.get(
            f"/images/workspace/{asset}?url=https://foreign.synthetic.invalid/private",
            headers={"Cookie": "synthetic-cookie=discard", "Authorization": "discard"},
        )
    assert response.status_code == 200
    assert response.content == b"synthetic-public-asset"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert requested == [(f"https://localhost:3000/images/workspace/{asset}", 8, {"Accept": "*/*"})]


@pytest.mark.anyio
@pytest.mark.parametrize(
    "path",
    [
        "/images/workspace/private.svg",
        "/images/workspace/kay-logo.svg/private",
        "/images/workspace/%2e%2e/private.svg",
        "/images/workspace/kay-logo.svg%00",
        "/images/workspace/kay-logo.svg%3fprivate",
        "/images/private.svg",
        "/_next/image?url=/api/v1/auth/me",
        "/api/v1/auth/me",
    ],
)
async def test_other_asset_or_private_paths_never_reach_frontend(monkeypatch, path):
    app, requested = public_simulator(monkeypatch)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="https://127.0.0.1:8001"
    ) as client:
        response = await client.get(path)
    assert response.status_code == 404
    assert not requested


@pytest.mark.anyio
@pytest.mark.parametrize("host", ["localhost:8001", "foreign.synthetic.invalid"])
async def test_public_asset_does_not_bypass_simulator_host_boundary(monkeypatch, host):
    app, requested = public_simulator(monkeypatch)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="https://127.0.0.1:8001"
    ) as client:
        response = await client.get("/images/workspace/kay-logo.svg", headers={"Host": host})
    assert response.status_code == 404
    assert not requested


@pytest.mark.anyio
async def test_public_asset_keeps_existing_response_size_cap(monkeypatch):
    app, requested = public_simulator(monkeypatch, b"x" * 2_000_001)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="https://127.0.0.1:8001"
    ) as client:
        response = await client.get("/images/workspace/kay-logo.svg")
    assert response.status_code == 503
    assert len(requested) == 1
