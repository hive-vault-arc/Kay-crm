"""Synthetic real-PostgreSQL scope, idempotency and private clean transfer."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from io import BytesIO
from uuid import UUID, uuid4

import pytest
from pypdf import PdfReader
from sqlalchemy import text

from app.contacts.models import Contact, Enquiry
from app.files.contracts import ArchiveDocument, PermitRequest
from app.files.models import DocumentVersion
from app.files.service import document_command, issue_permit, list_documents, read_document
from app.files.storage import PrivateStorage
from app.generated import service as generated_service
from app.generated.contracts import GenerateRequest
from app.generated.service import context, generate, history
from app.identity.security import IdentityError, csrf_token
from app.main import create_app
from tests.contact_support import actor, create_lead
from tests.deal_support import new, run, setup
from tests.test_foundation import client_for
from tests.test_isolation_migrations import HEAD, migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize("role", ["manager", "administrator"])
def test_archived_contact_prevents_new_lead_pdfs_and_receipt_replay(settings, database, role):
    _, owner = actor(settings, database)
    lead = create_lead(settings, database, owner)
    eid = UUID(lead["id"])
    _, token = actor(settings, database, role)
    body = GenerateRequest(parent_kind="enquiry", parent_id=eid, template_code="01", values={})
    key = uuid4()
    created = generate(database, settings, token, key, body)
    with database.session() as session, session.begin():
        enquiry = session.get(Enquiry, eid)
        session.get(Contact, enquiry.contact_id).archived_at = datetime.now(UTC)
    for command_key in (key, uuid4()):
        with pytest.raises(IdentityError, match="NOT_FOUND|CONTACT_ARCHIVED"):
            generate(database, settings, token, command_key, body)
    assert history(database, token, "enquiry", eid, 1)["items"][0]["id"] == created["id"]
    assert read_document(database, token, UUID(created["id"]))["id"] == created["id"]


def test_contact_archived_while_pdf_renders_is_rechecked_before_publication(
    settings, database, monkeypatch
):
    _, owner = actor(settings, database)
    eid = UUID(create_lead(settings, database, owner)["id"])
    _, token = actor(settings, database, "manager")
    body = GenerateRequest(parent_kind="enquiry", parent_id=eid, template_code="01", values={})
    key = uuid4()
    original = generated_service.render_pdf

    def render_then_archive(*args):
        payload = original(*args)
        with database.session() as session, session.begin():
            enquiry = session.get(Enquiry, eid)
            session.get(Contact, enquiry.contact_id).archived_at = datetime.now(UTC)
        return payload

    monkeypatch.setattr(generated_service, "render_pdf", render_then_archive)
    with pytest.raises(IdentityError, match="NOT_FOUND|CONTACT_ARCHIVED"):
        generate(database, settings, token, key, body)
    assert history(database, token, "enquiry", eid, 1)["total"] == 0
    monkeypatch.setattr(generated_service, "render_pdf", original)
    with database.session() as session, session.begin():
        enquiry = session.get(Enquiry, eid)
        session.get(Contact, enquiry.contact_id).archived_at = None
    assert generate(database, settings, token, key, body)["id"]


def test_lead_pdf_history_private_download_and_retry(settings, database):
    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid = UUID(lead["id"])
    listing = context(database, token, "enquiry", eid)
    assert len(listing["templates"]) == 10
    assert listing["defaults"]["client_name"] == "SP05 contact synthétique"
    body = GenerateRequest(
        parent_kind="enquiry",
        parent_id=eid,
        template_code="01",
        values={"client_name": "Contrôle synthétique"},
    )
    key = uuid4()
    created = generate(database, settings, token, key, body)
    assert created["template_code"] == "01"
    assert history(database, token, "enquiry", eid, 1)["total"] == 1
    assert generate(database, settings, token, key, body) == created
    assert history(database, token, "enquiry", eid, 1)["total"] == 1
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        generate(
            database,
            settings,
            token,
            key,
            body.model_copy(update={"values": {"client_name": "Different"}}),
        )
    permit = issue_permit(
        database,
        token,
        PermitRequest(
            action="download",
            document_id=UUID(created["id"]),
            expected_version=created["version"],
            version_id=UUID(created["version_id"]),
        ),
        "a" * 64,
    )
    assert permit["version_id"] == created["version_id"]
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        issue_permit(
            database,
            token,
            PermitRequest(action="upload", document_id=UUID(created["id"]), expected_version=1),
            "a" * 64,
        )
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        document_command(
            database, token, uuid4(), ArchiveDocument(expected_version=1), UUID(created["id"])
        )


def test_other_agent_denied_and_finance_templates_restricted(settings, database):
    _, owner = actor(settings, database)
    lead = create_lead(settings, database, owner)
    eid = UUID(lead["id"])
    _, outsider = actor(settings, database)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        context(database, outsider, "enquiry", eid)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        generate(
            database,
            settings,
            owner,
            uuid4(),
            GenerateRequest(parent_kind="enquiry", parent_id=eid, template_code="10", values={}),
        )


def test_finance_pdf_stays_hidden_from_agent_after_manager_generation(settings, database):
    _, owner = actor(settings, database)
    eid = UUID(create_lead(settings, database, owner)["id"])
    _, manager = actor(settings, database, "manager")
    created = generate(
        database,
        settings,
        manager,
        uuid4(),
        GenerateRequest(parent_kind="enquiry", parent_id=eid, template_code="10", values={}),
    )
    assert history(database, manager, "enquiry", eid, 1)["total"] == 1
    assert history(database, owner, "enquiry", eid, 1)["total"] == 0
    assert list_documents(database, owner, "enquiry", eid, 1, 20)["total"] == 0
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_document(database, owner, UUID(created["id"]))
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        issue_permit(
            database,
            owner,
            PermitRequest(
                action="download",
                document_id=UUID(created["id"]),
                expected_version=1,
                version_id=UUID(created["version_id"]),
            ),
            "a" * 64,
        )


def test_deal_prefill_rendering_and_attachment_isolation(settings, database):
    _, token, contact, _ = setup(settings, database)
    did = UUID(run(settings, database, token, new(contact))["id"])
    defaults = context(database, token, "deal", did)["defaults"]
    assert defaults["client_name"] == "SP05 contact synthétique"
    assert defaults["budget"] == "1000000.00 MAD"
    created = generate(
        database,
        settings,
        token,
        uuid4(),
        GenerateRequest(
            parent_kind="deal",
            parent_id=did,
            template_code="08",
            values={"property_description": "Bien de contrôle synthétique"},
        ),
    )
    with database.session() as session:
        version = session.get(DocumentVersion, UUID(created["version_id"]))
        assert version is not None
        data = PrivateStorage(settings).read(version.object_key, version.size_bytes, version.sha256)
    pages = PdfReader(BytesIO(data)).pages
    assert "Bien de contrôle synthétique" in pages[0].extract_text()
    assert history(database, token, "deal", did, 1)["items"][0]["id"] == created["id"]


def test_same_key_concurrent_generation_has_one_result(settings, database):
    _, token = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])
    body = GenerateRequest(parent_kind="enquiry", parent_id=eid, template_code="01", values={})
    key = uuid4()
    with ThreadPoolExecutor(max_workers=2) as workers:
        results = list(
            workers.map(lambda _: generate(database, settings, token, key, body), range(2))
        )
    assert results[0]["id"] == results[1]["id"]
    assert history(database, token, "enquiry", eid, 1)["total"] == 1


def test_storage_interruption_rolls_back_and_same_key_retries(settings, database, monkeypatch):
    _, token = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])
    body = GenerateRequest(parent_kind="enquiry", parent_id=eid, template_code="01", values={})
    key = uuid4()
    original = PrivateStorage.promote

    def unavailable(self, object_key):
        raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503)

    monkeypatch.setattr(PrivateStorage, "promote", unavailable)
    with pytest.raises(IdentityError, match="FILE_STORAGE_UNAVAILABLE"):
        generate(database, settings, token, key, body)
    assert history(database, token, "enquiry", eid, 1)["total"] == 0
    monkeypatch.setattr(PrivateStorage, "promote", original)
    assert generate(database, settings, token, key, body)["id"]


@pytest.mark.anyio
async def test_generated_http_scope_and_validation(settings, database):
    _, token = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])
    headers = {
        "X-Kay-Facade-Secret": settings.facade_secret.get_secret_value(),
        "X-Kay-Session": token,
    }
    async with client_for(create_app(settings)) as client:
        uri = f"/api/v1/generated-documents/context?parent_kind=enquiry&parent_id={eid}"
        assert (await client.get(uri, headers=headers)).status_code == 200
        assert (await client.get(uri + "&unexpected=1", headers=headers)).status_code == 422
        bad = {
            "parent_kind": "enquiry",
            "parent_id": str(eid),
            "template_code": "01",
            "values": {"forbidden": "x"},
        }
        write_headers = {
            **headers,
            "Origin": settings.frontend_origin,
            "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
            "Idempotency-Key": str(uuid4()),
        }
        assert (
            await client.post("/api/v1/generated-documents", headers=write_headers, json=bad)
        ).status_code == 422
        bad["values"] = {"client_name": "Personne synthétique"}
        created = await client.post("/api/v1/generated-documents", headers=write_headers, json=bad)
        assert created.status_code == 200
        assert (
            await client.get(
                f"/api/v1/generated-documents?parent_kind=enquiry&parent_id={eid}", headers=headers
            )
        ).json()["total"] == 1


def test_additive_migration_preserves_old_file_and_refuses_generated_data_downgrade(
    settings, database
):
    uid, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid, cid = UUID(lead["id"]), UUID(lead["contact"]["id"])
    legacy = uuid4()
    with database.session() as session, session.begin():
        session.execute(
            text(
                "INSERT INTO document(id,contact_id,origin_contact_id,filename,mime_type,"
                "size_bytes,created_by_user_id,version) "
                "VALUES(:id,:cid,:cid,'legacy.pdf','application/pdf',100,:uid,1)"
            ),
            {"id": legacy, "cid": cid, "uid": uid},
        )
    assert migrate("downgrade", "0029_property_photos").returncode == 0
    try:
        with database.session() as session:
            assert (
                session.scalar(text("SELECT filename FROM document WHERE id=:id"), {"id": legacy})
                == "legacy.pdf"
            )
        assert migrate("upgrade", "head").returncode == 0
        with database.session() as session:
            assert (
                session.scalar(text("SELECT filename FROM document WHERE id=:id"), {"id": legacy})
                == "legacy.pdf"
            )
        generate(
            database,
            settings,
            token,
            uuid4(),
            GenerateRequest(parent_kind="enquiry", parent_id=eid, template_code="01", values={}),
        )
        assert migrate("downgrade", "0029_property_photos").returncode != 0
        with database.session() as session:
            assert session.scalar(text("SELECT version_num FROM alembic_version")) == (HEAD)
    finally:
        assert migrate("upgrade", "head").returncode == 0
