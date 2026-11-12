"""Synthetic tests for resumable uploads, authorization and worker publication."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import cast
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select, update

from app.identity.models import StaffSession
from app.identity.security import IdentityError
from app.main import create_app
from app.videos import service, worker
from app.videos.models import InventoryVideo, VideoPart
from app.videos.router import byte_range
from tests.contact_support import actor
from tests.test_foundation import client_for
from tests.test_inventory import property_draft

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def payload(target, size=20, id=None):
    return service.NewVideo(
        id=id or uuid4(),
        parent_kind="property",
        parent_id=target,
        filename="visite-synthetique.mov",
        size_bytes=size,
        source_fingerprint="a" * 64,
    )


def test_video_concurrent_limit_and_permissions(settings, database):
    _, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    pid = property_draft(settings, database, manager)
    for _ in range(4):
        service.reserve(database, agent, payload(pid))

    def create(_):
        try:
            service.reserve(database, agent, payload(pid))
            return "created"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(create, range(2))) == ["VIDEO_LIMIT", "created"]

    items = cast(
        list[dict[str, object]], service.listing(database, agent, "property", pid)["items"]
    )
    assert len(items) == 5 and all(not item["can_archive"] for item in items)
    vid = UUID(str(items[0]["id"]))
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        service.archive(database, agent, vid)
    service.archive(database, manager, vid)
    assert service.reserve(database, agent, payload(pid))["permit"]


def test_video_resumes_without_replaying_parts_and_rejects_unsafe_input(
    settings, database, monkeypatch
):
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    monkeypatch.setattr(service, "PART_SIZE", 8)
    body = payload(pid, size=12)
    first = cast(str, service.reserve(database, manager, body)["permit"])
    with pytest.raises(IdentityError, match="VIDEO_PART_ORDER"):
        service.accept_part(database, settings, body.id, first, 1, b"last")
    assert service.accept_part(database, settings, body.id, first, 0, b"12345678") == {
        "next_part": 1
    }
    assert service.accept_part(database, settings, body.id, first, 0, b"12345678") == {
        "next_part": 1
    }
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        service.accept_part(database, settings, body.id, first, 0, b"abcdefgh")
    resumed = service.reserve(database, manager, body)
    assert resumed["next_part"] == 1
    with pytest.raises(IdentityError, match="FILE_PERMIT_INVALID"):
        service.accept_part(database, settings, body.id, first, 1, b"last")
    assert service.accept_part(
        database, settings, body.id, cast(str, resumed["permit"]), 1, b"last"
    ) == {"next_part": 2}
    monkeypatch.setattr(worker, "scan_stream", lambda *_: ("rejected", "synthetic scanner verdict"))
    monkeypatch.setattr(worker, "encode", lambda *_: pytest.fail("rejected input reached encoder"))
    assert worker.run_once(database, settings)
    with database.session() as session:
        row = session.get_one(InventoryVideo, body.id)
        assert row.state == "failed" and row.error_code == "VIDEO_SCAN_REJECTED"
        assert not session.scalars(select(VideoPart).where(VideoPart.video_id == body.id)).all()
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        service.grant_playback(database, manager, body.id)


@pytest.mark.anyio
async def test_video_stream_serves_only_authorized_ranges(settings, database, monkeypatch):
    uid, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    raw, output = b"synthetic original", b"synthetic encoded bytes"
    body = payload(pid, size=len(raw))
    permit = cast(str, service.reserve(database, manager, body)["permit"])
    service.accept_part(database, settings, body.id, permit, 0, raw)

    def encoded(source: Path, target: Path) -> int:
        assert source.read_bytes() == raw
        target.write_bytes(output)
        return 2

    monkeypatch.setattr(worker, "scan_stream", lambda *_: ("clean", "synthetic scanner verdict"))
    monkeypatch.setattr(worker, "encode", encoded)
    assert worker.run_once(database, settings)
    token = service.grant_playback(database, manager, body.id)["grant"]
    config = settings.model_copy(update={"inventory_video_enabled": True})
    async with client_for(create_app(config)) as client:
        path = f"/api/v1/video-transfers/{body.id}/play"
        args = {
            "params": {"grant": token},
            "headers": {"Origin": settings.frontend_origin, "Range": "bytes=1-5"},
        }
        response = await client.get(path, **args)
        assert response.status_code == 206
        assert response.headers["content-range"] == f"bytes 1-5/{len(output)}"
        assert response.content == output[1:6]
        assert (await client.get(path, params=args["params"])).status_code == 403
        bad = await client.get(
            path,
            params=args["params"],
            headers={"Origin": settings.frontend_origin, "Range": "bytes=99999-"},
        )
        assert bad.status_code == 416
        with database.session() as session, session.begin():
            session.execute(
                update(StaffSession)
                .where(StaffSession.user_id == uid)
                .values(revoked_at=datetime.now(UTC))
            )
        assert (await client.get(path, **args)).status_code == 401


def test_video_expired_parts_are_removed(settings, database):
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    body = payload(pid)
    service.reserve(database, manager, body)
    storage = worker.VideoStorage(settings)
    from io import BytesIO

    key = service.part_key(body.id, 0)
    storage.write(key, BytesIO(b"orphan"), 6)
    with database.session() as session, session.begin():
        session.get_one(InventoryVideo, body.id).expires_at = datetime.now(UTC) - timedelta(
            minutes=1
        )
    worker.cleanup(database, storage)
    assert not storage.path(key).exists()
    with database.session() as session:
        assert session.get_one(InventoryVideo, body.id).archived_at is not None


@pytest.mark.parametrize(
    ("header", "expected"),
    [
        (None, (0, 9)),
        ("bytes=0-1", (0, 1)),
        ("bytes=5-", (5, 9)),
        ("bytes=-3", (7, 9)),
        ("bytes=10-", None),
        ("bytes=0-1,5-7", None),
    ],
)
def test_video_range_parser(header, expected):
    assert byte_range(header, 10) == expected
