"""Negative, interrupted, raced and migrated SP-09 boundaries on real PostgreSQL."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event, func, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contacts.models import Contact, Enquiry
from app.files.contracts import ArchiveDocument
from app.files.models import DocumentVersion, FilePermit, Job, Notification, OutboxEvent
from app.files.reconcile import reconcile
from app.files.service import consume_permit, document_command, read_document
from app.files.storage import PrivateStorage
from app.files.worker import run_once
from app.identity.security import IdentityError, csrf_token
from app.main import create_app
from tests.contact_support import actor
from tests.file_support import grant, image_bytes, new_document
from tests.test_files import headers, setup_contact
from tests.test_foundation import client_for
from tests.test_isolation_migrations import migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.anyio
async def test_metadata_facade_csrf_strict_queries_and_cors(settings, database):
    _, token, contact = setup_contact(settings, database)
    secret = settings.facade_secret.get_secret_value()
    proof = {
        "X-Kay-Facade-Secret": secret,
        "X-Kay-Session": token,
        "Origin": settings.frontend_origin,
        "X-CSRF-Token": csrf_token(secret, token),
        "Idempotency-Key": str(uuid4()),
    }
    body = {
        "parent_kind": "contact",
        "parent_id": str(contact),
        "filename": "Synthétique.png",
        "mime_type": "image/png",
        "size_bytes": 77,
    }
    async with client_for(create_app(settings)) as client:
        assert (await client.post("/api/v1/documents", json=body)).status_code == 403
        assert (
            await client.post(
                "/api/v1/documents", json=body, headers={**proof, "X-CSRF-Token": "bad"}
            )
        ).status_code == 403
        assert (
            await client.post(
                "/api/v1/documents", json={**body, "object_key": "injected"}, headers=proof
            )
        ).status_code == 422
        assert (
            await client.post(
                "/api/v1/documents", json={**body, "parent_kind": "unit_type"}, headers=proof
            )
        ).status_code == 422
        assert (
            await client.post(
                "/api/v1/documents", json={**body, "size_bytes": 20971521}, headers=proof
            )
        ).status_code == 422
        created = await client.post("/api/v1/documents", json=body, headers=proof)
        assert created.status_code == 200
        duplicate = await client.post("/api/v1/documents", json=body, headers=proof)
        assert duplicate.json()["id"] == created.json()["id"]
        route = f"/api/v1/documents?parent_kind=contact&parent_id={contact}"
        assert (await client.get(route + "&page=1&page=2", headers=proof)).status_code == 422
        assert (await client.get(route + "&token=bad", headers=proof)).status_code == 422
        preflight = await client.options(
            f"/api/v1/transfers/{uuid4()}",
            headers={
                "Origin": settings.frontend_origin,
                "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": "x-file-permit,content-type",
            },
        )
        assert preflight.status_code == 200
        assert preflight.headers["access-control-allow-origin"] == settings.frontend_origin
        assert "access-control-allow-credentials" not in preflight.headers
        denied = await client.options(
            f"/api/v1/transfers/{uuid4()}",
            headers={"Origin": "https://foreign.example", "Access-Control-Request-Method": "PUT"},
        )
        assert "access-control-allow-origin" not in denied.headers


def test_permit_wrong_action_wrong_token_expiry_and_concurrent_version(settings, database):
    _, token, contact = setup_contact(settings, database)
    document = new_document(settings, database, token, "contact", contact, image_bytes())

    def issue():
        try:
            return grant(database, token, document)
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: issue(), range(2)))
    assert sum(isinstance(result, dict) for result in results) == 1
    assert "FILE_VERSION_CONFLICT" in results
    permit = next(result for result in results if isinstance(result, dict))
    pid = UUID(permit["permit_id"])
    with pytest.raises(IdentityError, match="FILE_PERMIT_INVALID"):
        consume_permit(database, pid, permit["token"], "upload", "0" * 64)
    for action, raw in (("download", permit["token"]), ("upload", "x" * 43)):
        with pytest.raises(IdentityError, match="FILE_PERMIT_INVALID"):
            consume_permit(database, pid, raw, action, permit["binding"])
    with database.session() as session, session.begin():
        session.execute(
            update(FilePermit)
            .where(FilePermit.id == pid)
            .values(
                created_at=datetime.now(UTC) - timedelta(minutes=4),
                expires_at=datetime.now(UTC) - timedelta(minutes=2),
            )
        )
    with pytest.raises(IdentityError, match="FILE_PERMIT_INVALID"):
        consume_permit(database, pid, permit["token"], "upload", permit["binding"])


@pytest.mark.anyio
async def test_partial_stream_consumes_permit_and_fresh_version_recovers(settings, database):
    _, token, contact = setup_contact(settings, database)
    data = image_bytes()
    document = new_document(settings, database, token, "contact", contact, data)
    permit = grant(database, token, document)

    async def interrupted():
        yield data[:16]
        raise OSError("SYNTHETIC_TRANSFER_INTERRUPTION")

    async with client_for(create_app(settings)) as client:
        result = await client.put(
            f"/api/v1/transfers/{permit['permit_id']}",
            headers=headers(settings, permit),
            content=interrupted(),
        )
        assert result.status_code == 503
        with pytest.raises(IdentityError, match="FILE_PERMIT_INVALID"):
            consume_permit(
                database, UUID(permit["permit_id"]), permit["token"], "upload", permit["binding"]
            )
        document = read_document(database, token, UUID(document["id"]))
        replacement = grant(database, token, document)
        assert replacement["version_id"] != permit["version_id"]
        assert (
            await client.put(
                f"/api/v1/transfers/{replacement['permit_id']}",
                headers=headers(settings, replacement),
                content=data,
            )
        ).status_code == 200
    assert run_once(database, settings)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(OutboxEvent)) == 1
        version = session.get(DocumentVersion, UUID(permit["version_id"]))
        assert version.state == "awaiting_upload" and version.sha256 is None
        assert not PrivateStorage(settings).path(version.object_key, partial=True).exists()


@pytest.mark.anyio
async def test_permission_removed_during_stream_never_publishes_orphan_can_be_reconciled(
    settings, database
):
    _, token, contact = setup_contact(settings, database)
    other, _ = actor(settings, database)
    data = image_bytes()
    document = new_document(settings, database, token, "contact", contact, data)
    permit = grant(database, token, document)

    async def revoked():
        yield data[:16]
        with database.session() as session, session.begin():
            session.execute(
                update(Contact).where(Contact.id == contact).values(primary_agent_id=other)
            )
            session.execute(
                update(Enquiry).where(Enquiry.contact_id == contact).values(assigned_agent_id=None)
            )
        yield data[16:]

    async with client_for(create_app(settings)) as client:
        result = await client.put(
            f"/api/v1/transfers/{permit['permit_id']}",
            headers=headers(settings, permit),
            content=revoked(),
        )
        assert result.status_code == 404
    with database.session() as session:
        version = session.get(DocumentVersion, UUID(permit["version_id"]))
        key = version.object_key
        assert version.state == "awaiting_upload"
        assert session.scalar(select(func.count()).select_from(OutboxEvent)) == 0
    assert PrivateStorage(settings).path(key).exists()
    reconcile(database, settings, datetime.now(UTC) + timedelta(hours=2))
    assert not PrivateStorage(settings).path(key).exists()


@pytest.mark.anyio
async def test_publish_rollback_keeps_quarantine_unreadable(settings, database):
    _, token, contact = setup_contact(settings, database)
    data = image_bytes()
    document = new_document(settings, database, token, "contact", contact, data)
    permit = grant(database, token, document)

    def fail_publication(session, context):
        if any(isinstance(item, OutboxEvent) for item in session.new):
            raise RuntimeError("SYNTHETIC_BEFORE_COMMIT")

    event.listen(Session, "after_flush", fail_publication)
    try:
        async with client_for(create_app(settings)) as client:
            result = await client.put(
                f"/api/v1/transfers/{permit['permit_id']}",
                headers=headers(settings, permit),
                content=data,
            )
            assert result.status_code == 500
    finally:
        event.remove(Session, "after_flush", fail_publication)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(OutboxEvent)) == 0
        assert session.get(DocumentVersion, UUID(permit["version_id"])).state == "awaiting_upload"


@pytest.mark.anyio
async def test_retry_exhaustion_explicit_retry_and_immutable_clean_version(settings, database):
    _, token, contact = setup_contact(settings, database)
    data = image_bytes()
    document = new_document(settings, database, token, "contact", contact, data)
    permit = grant(database, token, document)
    async with client_for(create_app(settings)) as client:
        assert (
            await client.put(
                f"/api/v1/transfers/{permit['permit_id']}",
                headers=headers(settings, permit),
                content=data,
            )
        ).status_code == 200
    for _ in range(5):
        assert run_once(database, settings.model_copy(update={"antivirus_port": 1}))
        with database.session() as session, session.begin():
            session.execute(
                update(Job).values(available_at=datetime.now(UTC) - timedelta(seconds=1))
            )
    with database.session() as session:
        assert session.scalar(select(Job.state)) == "failed"
    did = UUID(document["id"])
    current = read_document(database, token, did)
    body, key = ArchiveDocument(expected_version=current["version"]), uuid4()
    first = document_command(database, token, key, body, did, "retry-scan")
    assert document_command(database, token, key, body, did, "retry-scan") == first
    assert run_once(database, settings)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Notification)) == 1
        assert session.get(DocumentVersion, UUID(permit["version_id"])).state == "clean"
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(
            update(DocumentVersion)
            .where(DocumentVersion.id == UUID(permit["version_id"]))
            .values(sha256=b"x" * 32)
        )
    assert reconcile(database, settings, datetime.now(UTC) + timedelta(hours=2)) >= 0
    with database.session() as session:
        version = session.get(DocumentVersion, UUID(permit["version_id"]))
        assert (
            PrivateStorage(settings).read(version.object_key, version.size_bytes, version.sha256)
            == data
        )


def test_populated_prior_revision_upgrade_and_history_downgrade_refusal(settings, database):
    _, token, contact = setup_contact(settings, database)
    assert migrate("downgrade", "0009_development_hierarchy").returncode == 0
    try:
        with database.session() as session:
            assert session.scalar(text("SELECT count(*) FROM contact")) == 1
        assert migrate("upgrade", "head").returncode == 0
        document = new_document(settings, database, token, "contact", contact, image_bytes())
        assert migrate("downgrade", "0009_development_hierarchy").returncode != 0
        assert read_document(database, token, UUID(document["id"]))["filename"] == "Synthétique.png"
    finally:
        assert migrate("upgrade", "head").returncode == 0


def test_orphan_reconciliation_passes_committed_prefix_without_purging_evidence(
    settings, database, monkeypatch
):
    uid, token, contact = setup_contact(settings, database)
    data = image_bytes()
    document = new_document(settings, database, token, "contact", contact, data)
    storage = PrivateStorage(settings)
    keys = [uuid4() for _ in range(101)]
    paths = [storage.path(key) for key in keys]
    original = Path.iterdir
    monkeypatch.setattr(
        Path,
        "iterdir",
        lambda directory: iter(paths) if directory == storage.root else original(directory),
    )
    try:
        with database.session() as session, session.begin():
            for key, target in zip(keys[:100], paths[:100], strict=True):
                target.write_bytes(data)
                session.add(
                    DocumentVersion(
                        document_id=UUID(document["id"]),
                        object_key=key,
                        created_by_user_id=uid,
                        size_bytes=len(data),
                        state="pending_scan",
                        sha256=sha256(data).digest(),
                    )
                )
        paths[-1].write_bytes(data)
        assert reconcile(database, settings, datetime.now(UTC) + timedelta(hours=2)) == 1
        assert all(target.exists() for target in paths[:100])
        assert not paths[-1].exists()
    finally:
        for target in paths:
            target.unlink(missing_ok=True)
