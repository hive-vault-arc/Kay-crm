"""Property photographs use the private file flow with a hard shared slot limit."""

from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
from sqlalchemy import text

from app.files.contracts import ArchiveDocument, NewDocument
from app.files.models import Document
from app.files.service import document_command, list_documents, read_document
from app.files.worker import run_once
from app.identity.security import IdentityError
from app.main import create_app
from tests.contact_support import actor
from tests.file_support import grant, image_bytes
from tests.test_files import headers
from tests.test_foundation import client_for
from tests.test_inventory import property_draft
from tests.test_isolation_migrations import migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def photo(database, token, pid, data=None, *, key=None):
    content = data or image_bytes("WEBP")
    return document_command(
        database,
        token,
        key or uuid4(),
        NewDocument(
            parent_kind="property",
            parent_id=pid,
            filename="Photo synthétique.webp",
            mime_type="image/webp",
            size_bytes=len(content),
            purpose="photo",
        ),
    )


def test_photo_limit_archive_and_legacy_attachment_count(settings, database):
    manager_id, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database, "agent")
    pid = property_draft(settings, database, manager)
    png = image_bytes()
    with database.session() as session, session.begin():
        session.add(
            Document(
                property_id=pid,
                filename="legacy.png",
                mime_type="image/png",
                size_bytes=len(png),
                created_by_user_id=manager_id,
                version=1,
            )
        )
    for purpose, mime, filename in (
        ("attachment", "image/png", "legacy.png"),
        ("photo", "image/png", "not-webp.png"),
        ("photo", "application/pdf", "not-image.pdf"),
    ):
        with pytest.raises(
            IdentityError, match="PROPERTY_PHOTO_WEBP_REQUIRED|UNSUPPORTED_MEDIA_TYPE"
        ):
            document_command(
                database,
                manager,
                uuid4(),
                NewDocument(
                    parent_kind="property",
                    parent_id=pid,
                    filename=filename,
                    mime_type=mime,
                    size_bytes=len(png),
                    purpose=purpose,
                ),
            )
    first = photo(database, manager, pid)
    assert first["purpose"] == "photo"
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        photo(database, agent, pid)
    photos = list_documents(database, agent, "property", pid, 1, 10, "photo")
    assert photos["total"] == 2
    assert any(
        item["filename"] == "legacy.png" and item["purpose"] == "photo" for item in photos["items"]
    )
    assert list_documents(database, agent, "property", pid, 1, 10, "attachment")["total"] == 0
    for _ in range(8):
        photo(database, manager, pid)
    assert list_documents(database, manager, "property", pid, 1, 10, "photo")["total"] == 10
    with pytest.raises(IdentityError, match="PROPERTY_PHOTO_LIMIT"):
        photo(database, manager, pid)
    # A committed idempotency replay returns the same document, even at the limit.
    key = uuid4()
    archived = document_command(
        database, manager, key, ArchiveDocument(expected_version=1), UUID(first["id"])
    )
    assert archived["archived"] is True
    assert (
        document_command(
            database, manager, key, ArchiveDocument(expected_version=1), UUID(first["id"])
        )
        == archived
    )
    photo(database, manager, pid)
    assert list_documents(database, manager, "property", pid, 1, 10, "photo")["total"] == 10


def test_photo_limit_concurrent_creates(settings, database):
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    for _ in range(9):
        photo(database, manager, pid)

    def create(_: int) -> str:
        try:
            photo(database, manager, pid)
            return "created"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(create, range(2))) == ["PROPERTY_PHOTO_LIMIT", "created"]


@pytest.mark.anyio
async def test_webp_photo_private_transfer_scan_and_wrong_bytes_denied(settings, database):
    _, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database, "agent")
    pid = property_draft(settings, database, manager)
    data = image_bytes("WEBP")
    document = photo(database, manager, pid, data)
    permit = grant(database, manager, document)
    async with client_for(create_app(settings)) as client:
        endpoint = f"/api/v1/transfers/{permit['permit_id']}"
        result = await client.put(
            endpoint, headers=headers(settings, permit, "image/webp"), content=data
        )
        assert result.status_code == 200 and result.json()["state"] == "pending_scan"
        wrong = photo(database, manager, pid, image_bytes())
        wrong_permit = grant(database, manager, wrong)
        rejected = await client.put(
            f"/api/v1/transfers/{wrong_permit['permit_id']}",
            headers=headers(settings, wrong_permit, "image/webp"),
            content=image_bytes(),
        )
        assert rejected.status_code == 415
    assert run_once(database, settings)
    current = read_document(database, agent, UUID(document["id"]))
    assert current["purpose"] == "photo" and current["versions"][0]["state"] == "clean"
    assert list_documents(database, agent, "property", pid, 1, 10, "photo")["total"] == 2


def test_additive_photo_migration_preserves_legacy_image_and_refuses_lossy_downgrade(
    settings, database
):
    user_id, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    legacy_id = uuid4()
    with database.session() as session, session.begin():
        session.execute(
            text(
                "INSERT INTO document(id,property_id,filename,mime_type,size_bytes,"
                "created_by_user_id,version) VALUES(:id,:pid,'legacy.png','image/png',100,:uid,1)"
            ),
            {"id": legacy_id, "pid": pid, "uid": user_id},
        )
    assert migrate("downgrade", "0028_commercial_properties").returncode == 0
    try:
        with database.session() as session:
            assert (
                session.scalar(
                    text("SELECT filename FROM document WHERE id=:id"), {"id": legacy_id}
                )
                == "legacy.png"
            )
        assert migrate("upgrade", "head").returncode == 0
        with database.session() as session:
            assert (
                session.scalar(text("SELECT purpose FROM document WHERE id=:id"), {"id": legacy_id})
                == "attachment"
            )
        assert list_documents(database, manager, "property", pid, 1, 10, "photo")["total"] == 1
        photo(database, manager, pid)
        assert migrate("downgrade", "0028_commercial_properties").returncode != 0
        with database.session() as session:
            assert (
                session.scalar(text("SELECT version_num FROM alembic_version"))
                == "0030_generated_documents"
            )
    finally:
        assert migrate("upgrade", "head").returncode == 0
