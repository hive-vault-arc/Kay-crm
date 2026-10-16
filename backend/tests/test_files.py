"""SP-09 real PostgreSQL and ClamAV: deny first, publish only a real clean verdict."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.files.contracts import FORMATS, MAX_FILE_BYTES, ArchiveDocument
from app.files.models import Document, FilePermit, Job, Notification, OutboxEvent
from app.files.scanner import scan
from app.files.service import consume_permit, document_command, list_documents, read_document
from app.files.validation import validate_file
from app.files.worker import claim, finish, run_once
from app.identity.models import StaffSession
from app.identity.security import IdentityError, token_hash
from app.main import create_app
from tests.contact_support import actor, create_lead, new_lead
from tests.file_support import (
    eicar_bytes,
    grant,
    image_bytes,
    new_document,
    office_bytes,
    pdf_bytes,
)
from tests.test_foundation import client_for
from tests.test_inventory import property_draft
from tests.test_ownership import change, cid, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def setup_contact(settings, database):
    uid, token = actor(settings, database)
    contact = cid(create_lead(settings, database, token))
    return uid, token, contact


def headers(settings, permit, mime="image/png"):
    return {
        "Origin": settings.frontend_origin,
        "X-File-Permit": permit["token"],
        "X-File-Session": permit["binding"],
        "Content-Type": mime,
    }


@pytest.mark.parametrize(
    "extension,data",
    [
        ("png", image_bytes()),
        ("jpg", image_bytes("JPEG")),
        ("webp", image_bytes("WEBP")),
        ("pdf", pdf_bytes()),
        ("docx", office_bytes()),
        ("xlsx", office_bytes("xlsx")),
    ],
    ids=["png", "jpeg", "webp", "pdf", "docx", "xlsx"],
)
def test_six_real_formats_validate_and_scan_clean(settings, extension, data):
    validate_file(data, f"Synthétique.{extension}", FORMATS[f".{extension}"])
    verdict, version = scan(settings, data)
    assert verdict == "clean" and version.startswith("ClamAV ") and "/" in version


@pytest.mark.parametrize(
    "filename,mime,data",
    [
        ("bad.png", "image/png", b"not an image"),
        ("bad.jpg", "image/jpeg", image_bytes()),
        ("bad.pdf", "application/pdf", b"%PDF-1.7\nmalformed\n%%EOF"),
        ("bad.docx", FORMATS[".docx"], b"PK\x03\x04malformed"),
        ("bad.docx", FORMATS[".docx"], office_bytes(extra=("word/vbaProject.bin", b"macro"))),
        ("bad.xlsx", FORMATS[".xlsx"], office_bytes("xlsx", ("xl/embeddings/run.exe", b"MZ"))),
        ("bad.docx", FORMATS[".docx"], office_bytes(extra=("../escape.xml", b"<a/>"))),
    ],
    ids=["image", "contradictory", "pdf", "zip", "macro", "embedded-exe", "zip-traversal"],
)
def test_malformed_and_active_containers_denied(filename, mime, data):
    with pytest.raises(IdentityError, match="UNSUPPORTED_MEDIA_TYPE"):
        validate_file(data, filename, mime)


def test_real_scanner_detects_controlled_test_signature(settings):
    assert scan(settings, eicar_bytes())[0] == "rejected"
    assert (
        scan(settings, office_bytes(extra=("word/antivirus-test.txt", eicar_bytes())))[0]
        == "rejected"
    )


@pytest.mark.anyio
async def test_real_upload_pending_clean_download_and_single_use(settings, database):
    _, token, contact = setup_contact(settings, database)
    data = image_bytes()
    document = new_document(settings, database, token, "contact", contact, data)
    permit = grant(database, token, document)
    async with client_for(create_app(settings)) as client:
        endpoint = f"/api/v1/transfers/{permit['permit_id']}"
        response = await client.put(endpoint, headers=headers(settings, permit), content=data)
        assert response.status_code == 200
        assert response.json()["state"] == "pending_scan"
        current = read_document(database, token, UUID(document["id"]))
        assert current["versions"][0]["state"] == "pending_scan"
        with pytest.raises(IdentityError, match="FILE_NOT_CLEAN"):
            grant(database, token, current, "download", permit["version_id"])
        assert (
            await client.put(endpoint, headers=headers(settings, permit), content=data)
        ).status_code == 403
        assert run_once(database, settings)
        assert not run_once(database, settings)
        current = read_document(database, token, UUID(document["id"]))
        assert current["versions"][0]["state"] == "clean"
        download = grant(database, token, current, "download", permit["version_id"])
        url = f"/api/v1/transfers/{download['permit_id']}"
        assert (
            await client.get(url, headers={"Origin": settings.frontend_origin})
        ).status_code == 403
        got = await client.get(url, headers=headers(settings, download))
        assert got.status_code == 200 and got.content == data
        assert (
            got.headers["cache-control"] == "no-store"
            and "attachment" in got.headers["content-disposition"]
        )
        assert (await client.get(url, headers=headers(settings, download))).status_code == 403
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(OutboxEvent)) == 1
        assert session.scalar(select(func.count()).select_from(Notification)) == 1
        stored = session.get(FilePermit, UUID(permit["permit_id"]))
        assert stored.token_hash == token_hash(permit["token"])
        assert "object_key" not in str(current) and "sha256" not in str(current)


@pytest.mark.anyio
async def test_infected_allowed_office_container_is_never_readable(settings, database):
    _, token, contact = setup_contact(settings, database)
    data = office_bytes(extra=("word/antivirus-test.txt", eicar_bytes()))
    document = new_document(
        settings, database, token, "contact", contact, data, "Test antivirus.docx", FORMATS[".docx"]
    )
    permit = grant(database, token, document)
    async with client_for(create_app(settings)) as client:
        response = await client.put(
            f"/api/v1/transfers/{permit['permit_id']}",
            headers=headers(settings, permit, FORMATS[".docx"]),
            content=data,
        )
        assert response.status_code == 200
    assert run_once(database, settings)
    current = read_document(database, token, UUID(document["id"]))
    assert current["versions"][0]["state"] == "rejected"
    with pytest.raises(IdentityError, match="FILE_NOT_CLEAN"):
        grant(database, token, current, "download", permit["version_id"])


@pytest.mark.anyio
async def test_scanner_outage_retry_and_expired_lease_fencing(settings, database):
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
    assert run_once(database, settings.model_copy(update={"antivirus_port": 1}))
    current = read_document(database, token, UUID(document["id"]))
    assert current["versions"][0]["state"] == "pending_scan"
    assert current["versions"][0]["scan_error"] == "ANTIVIRUS_UNAVAILABLE"
    with database.session() as session, session.begin():
        session.execute(update(Job).values(available_at=datetime.now(UTC) - timedelta(seconds=1)))
    old = claim(database)
    assert old is not None
    with database.session() as session, session.begin():
        session.execute(update(Job).values(lease_until=datetime.now(UTC) - timedelta(seconds=1)))
    assert not finish(database, *old, ("clean", "not-a-real-verdict"))
    assert run_once(database, settings)
    current = read_document(database, token, UUID(document["id"]))
    assert current["versions"][0]["state"] == "clean"
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Notification)) == 1


def test_private_scope_shared_inventory_permit_race_and_revocation(settings, database):
    uid, token, contact = setup_contact(settings, database)
    _, outsider = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    data = image_bytes()
    document = new_document(settings, database, token, "contact", contact, data)
    for operation in (
        lambda: list_documents(database, outsider, "contact", contact, 1, 50),
        lambda: read_document(database, outsider, UUID(document["id"])),
    ):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            operation()
    pid = property_draft(settings, database, manager)
    shared = new_document(settings, database, manager, "property", pid, data)
    assert list_documents(database, outsider, "property", pid, 1, 50)["total"] == 1
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        grant(database, outsider, shared)
    permit = grant(database, token, document)

    def consume():
        try:
            consume_permit(
                database, UUID(permit["permit_id"]), permit["token"], "upload", permit["binding"]
            )
            return "accepted"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(lambda _: consume(), range(2))) == [
            "FILE_PERMIT_INVALID",
            "accepted",
        ]
    current = read_document(database, token, UUID(document["id"]))
    revoked = grant(database, token, current)
    with database.session() as session, session.begin():
        session.execute(
            update(StaffSession)
            .where(StaffSession.user_id == uid)
            .values(revoked_at=datetime.now(UTC))
        )
    with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
        consume_permit(
            database, UUID(revoked["permit_id"]), revoked["token"], "upload", revoked["binding"]
        )


@pytest.mark.anyio
async def test_exact_twenty_mb_and_overflow_invalid_origin_mime_and_interruption(
    settings, database
):
    _, token, contact = setup_contact(settings, database)
    data = image_bytes(size=MAX_FILE_BYTES)
    document = new_document(settings, database, token, "contact", contact, data)
    permit = grant(database, token, document)
    async with client_for(create_app(settings)) as client:
        url = f"/api/v1/transfers/{permit['permit_id']}"
        assert (
            await client.put(
                url,
                headers={**headers(settings, permit), "Origin": "https://other.example"},
                content=data[:8],
            )
        ).status_code == 403
        assert (
            await client.put(url, headers=headers(settings, permit), content=data)
        ).status_code == 200
        current = read_document(database, token, UUID(document["id"]))
        too_big = grant(database, token, current)
        response = await client.put(
            f"/api/v1/transfers/{too_big['permit_id']}",
            headers=headers(settings, too_big),
            content=data + b"x",
        )
        assert response.status_code == 413
    assert run_once(database, settings)
    assert read_document(database, token, UUID(document["id"]))["versions"][1]["state"] == "clean"


def test_merge_retains_origin_actor_and_invalidates_private_grants(settings, database):
    uid, token, source = setup_contact(settings, database)
    _, manager = actor(settings, database, "manager")
    survivor = cid(
        create_lead(
            settings,
            database,
            token,
            new_lead("+212600000009"),
        )
    )
    document = new_document(settings, database, token, "contact", source, image_bytes())
    change(
        settings,
        database,
        token,
        source,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    with database.session() as session:
        row = session.get(Document, UUID(document["id"]))
        assert (
            row.contact_id == survivor
            and row.origin_contact_id == source
            and row.created_by_user_id == uid
        )
    assert list_documents(database, token, "contact", survivor, 1, 50)["total"] == 1
    archived = document_command(
        database, manager, uuid4(), ArchiveDocument(expected_version=2), UUID(document["id"])
    )
    assert archived["archived"]
    assert list_documents(database, token, "contact", survivor, 1, 50)["total"] == 0


def test_database_parent_and_identity_constraints(settings, database):
    uid, token, contact = setup_contact(settings, database)
    document = new_document(settings, database, token, "contact", contact, image_bytes())
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(
            update(Document).where(Document.id == UUID(document["id"])).values(contact_id=None)
        )
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(
            update(Document)
            .where(Document.id == UUID(document["id"]))
            .values(filename="Changed.png")
        )
