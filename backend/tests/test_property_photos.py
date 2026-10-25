"""Property photographs use the private file flow with a hard shared slot limit."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from sqlalchemy import text

from app.files.contracts import ArchiveDocument, NewDocument, PermitRequest
from app.files.models import Document
from app.files.service import document_command, issue_permit, list_documents, read_document
from app.files.worker import run_once
from app.identity.security import IdentityError
from app.inventory.hierarchy_models import Development
from app.inventory.models import Property
from app.main import create_app
from tests.contact_support import actor
from tests.file_support import grant, image_bytes
from tests.test_developments import development
from tests.test_files import headers
from tests.test_foundation import client_for
from tests.test_inventory import property_draft
from tests.test_isolation_migrations import HEAD, migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def photo(database, token, pid, data=None, *, key=None, kind="property"):
    content = data or image_bytes("WEBP")
    return document_command(
        database,
        token,
        key or uuid4(),
        NewDocument(
            parent_kind=kind,
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
    agent_photo = photo(database, agent, pid)
    assert agent_photo["purpose"] == "photo"
    photos = list_documents(database, agent, "property", pid, 1, 10, "photo")
    assert photos["total"] == 3
    assert any(
        item["filename"] == "legacy.png" and item["purpose"] == "photo" for item in photos["items"]
    )
    assert list_documents(database, agent, "property", pid, 1, 10, "attachment")["total"] == 0
    for _ in range(7):
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


@pytest.mark.parametrize("kind", ["property", "development"])
def test_photo_limit_concurrent_creates(settings, database, kind):
    _, manager = actor(settings, database, "manager")
    pid = (property_draft if kind == "property" else development)(settings, database, manager)
    for _ in range(9):
        photo(database, manager, pid, kind=kind)

    def create(_: int) -> str:
        try:
            photo(database, manager, pid, kind=kind)
            return "created"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(create, range(2))) == ["PROPERTY_PHOTO_LIMIT", "created"]


@pytest.mark.parametrize("kind", ["property", "development"])
def test_agent_photo_upload_is_narrow_and_revalidated(settings, database, kind):
    _, manager = actor(settings, database, "manager")
    agent_id, agent = actor(settings, database, "agent")
    _, colleague = actor(settings, database, "agent")
    target = (property_draft if kind == "property" else development)(settings, database, manager)
    document = photo(database, agent, target, kind=kind)
    assert document["can_upload"] is True
    assert read_document(database, agent, UUID(document["id"]))["can_upload"] is True
    assert read_document(database, colleague, UUID(document["id"]))["can_upload"] is False
    assert read_document(database, manager, UUID(document["id"]))["can_upload"] is True
    assert (
        list_documents(database, colleague, kind, target, 1, 10, "photo")["items"][0]["can_upload"]
        is False
    )
    assert grant(database, agent, document)["permit_id"]
    for token in (agent, colleague):
        with pytest.raises(IdentityError, match="FORBIDDEN"):
            document_command(
                database, token, uuid4(), ArchiveDocument(expected_version=2), UUID(document["id"])
            )
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        grant(database, colleague, document)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        document_command(
            database,
            agent,
            uuid4(),
            NewDocument(
                parent_kind=kind,
                parent_id=target,
                filename="private.pdf",
                mime_type="application/pdf",
                size_bytes=100,
            ),
        )
    with pytest.raises(IdentityError, match="UNSUPPORTED_MEDIA_TYPE"):
        document_command(
            database,
            agent,
            uuid4(),
            NewDocument(
                parent_kind=kind,
                parent_id=target,
                purpose="photo",
                filename="direct.png",
                mime_type="image/png",
                size_bytes=100,
            ),
        )
    with database.session() as session, session.begin():
        assert session.get(Document, UUID(document["id"])).created_by_user_id == agent_id
        item = session.get(Property if kind == "property" else Development, target)
        assert item is not None
        item.archived_at = datetime.now(UTC)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        photo(database, agent, target, kind=kind)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        issue_permit(
            database,
            agent,
            PermitRequest(action="upload", document_id=UUID(document["id"]), expected_version=2),
            "a" * 64,
        )


def test_project_photo_additive_migration_preserves_files(settings, database):
    _, manager = actor(settings, database, "manager")
    target = development(settings, database, manager)
    property_id = property_draft(settings, database, manager)
    existing = photo(database, manager, property_id)
    assert migrate("downgrade", "0034_proactive_work").returncode == 0
    try:
        assert migrate("upgrade", "head").returncode == 0
        assert read_document(database, manager, UUID(existing["id"])) == existing
        project_photo = photo(database, manager, target, kind="development")
        assert project_photo["purpose"] == "photo"
        assert migrate("downgrade", "0034_proactive_work").returncode != 0
        assert (
            list_documents(database, manager, "development", target, 1, 10, "photo")["total"] == 1
        )
    finally:
        assert migrate("upgrade", "head").returncode == 0


@pytest.mark.anyio
@pytest.mark.parametrize("kind", ["property", "development"])
async def test_photo_capabilities_are_opt_in_for_older_facades(settings, database, kind):
    _, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    _, colleague = actor(settings, database)
    target = (property_draft if kind == "property" else development)(settings, database, manager)
    created = photo(database, agent, target, kind=kind)
    headers = {"X-Kay-Facade-Secret": settings.facade_secret.get_secret_value()}
    async with client_for(create_app(settings)) as client:
        for token, allowed in ((agent, True), (colleague, False), (manager, True)):
            authority = {**headers, "X-Kay-Session": token}
            for route in (
                f"/api/v1/documents/{created['id']}",
                f"/api/v1/documents?parent_kind={kind}&parent_id={target}&purpose=photo",
            ):
                for flag in (None, "0", "1"):
                    response = await client.get(
                        route,
                        headers={
                            **authority,
                            **({"X-Kay-Photo-Capabilities": flag} if flag is not None else {}),
                        },
                    )
                    assert response.status_code == 200
                    result = response.json()
                    item = result["items"][0] if "items" in result else result
                    assert "created_by_user_id" not in item
                    if flag == "1":
                        assert item["can_upload"] is allowed
                    else:
                        assert "can_upload" not in item


@pytest.mark.anyio
@pytest.mark.parametrize("kind", ["property", "development"])
async def test_webp_photo_private_transfer_scan_and_wrong_bytes_denied(settings, database, kind):
    _, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database, "agent")
    pid = (property_draft if kind == "property" else development)(settings, database, manager)
    data = image_bytes("WEBP")
    document = photo(database, agent, pid, data, kind=kind)
    permit = grant(database, agent, document)
    async with client_for(create_app(settings)) as client:
        endpoint = f"/api/v1/transfers/{permit['permit_id']}"
        result = await client.put(
            endpoint, headers=headers(settings, permit, "image/webp"), content=data
        )
        assert result.status_code == 200 and result.json()["state"] == "pending_scan"
        wrong = photo(database, manager, pid, image_bytes(), kind=kind)
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
    assert list_documents(database, agent, kind, pid, 1, 10, "photo")["total"] == 2


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
            assert session.scalar(text("SELECT version_num FROM alembic_version")) == HEAD
    finally:
        assert migrate("upgrade", "head").returncode == 0
