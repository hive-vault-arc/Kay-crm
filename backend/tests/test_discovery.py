"""SP-19 focused real PostgreSQL discovery/export/lifecycle/retention gates."""

import csv
import io
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.contacts.history_models import TimelineEvent
from app.contacts.models import Contact, ContactCollaborator
from app.discovery import csv_export, export_worker
from app.discovery.audit import purge_security, read_audit
from app.discovery.contracts import AuditQuery, NewExport, PageQuery, SearchQuery
from app.discovery.exports import download, issue_download, read_exports, request_export
from app.discovery.models import ExportJob
from app.discovery.search import search
from app.files.models import Document, Job, OutboxEvent
from app.identity.models import AuditEvent, StaffSession, User
from app.identity.security import IdentityError
from app.inventory.contracts import InventoryQuery
from app.inventory.hierarchy_contracts import ArchiveDevelopment, DevelopmentFields, TypeFields
from app.inventory.models import Property
from app.inventory.queries import read_detail, read_list
from tests.contact_support import actor, create_lead, new_lead
from tests.test_inventory import offering_draft, property_draft, run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize(
    "value",
    [
        "=SUM(1,2)",
        "+123",
        "-1",
        "@SUM(A1)",
        " \t=1",
        "\ufeff=1",
        "\tname",
        "\rname",
        "\nname",
        "\x0b=1",
        "\u00a0=1",
        " \ufeff=1",
    ],
)
def test_formula_cells_are_inert_text(value):
    assert csv_export.cell(value).startswith("'")
    assert csv_export.cell("+212600000001", phone=True) == "'+212600000001"
    assert csv_export.cell('Été, "synthétique"') == 'Été, "synthétique"'


def lead(settings, database, token, phone, name):
    return create_lead(
        settings,
        database,
        token,
        new_lead(
            phone,
            new_contact={"name": name, "phones": [{"number": phone, "is_primary": True}]},
            message="SP19 demande synthétique",
        ),
    )


def test_scope_before_all_kinds_count_stable_pages_private_document_and_wildcards(
    settings, database
):
    uid, agent = actor(settings, database)
    other, private = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    visible = lead(settings, database, agent, "+212600000001", "SP19 visible synthétique")
    hidden = lead(settings, database, private, "+212600000002", "SP19 secret synthétique")
    public_property = property_draft(settings, database, manager, reference="SP19-SHARED")
    dev = run(
        settings,
        database,
        manager,
        "create-development",
        DevelopmentFields(
            reference="SP19-DEV", name="SP19 programme synthétique", category="mixed"
        ),
    )
    run(
        settings,
        database,
        manager,
        "create-type",
        TypeFields(
            expected_version=1,
            development_id=dev["development_id"],
            code="SP19-TYPE",
            label="SP19 type synthétique",
            category="villa",
        ),
        UUID(dev["development_id"]),
    )
    with database.session() as s, s.begin():
        for user, value, filename in [
            (uid, visible, "SP19 accessible.pdf"),
            (other, hidden, "SP19 privé.pdf"),
        ]:
            cid = UUID(value["contact"]["id"])
            s.add(
                Document(
                    contact_id=cid,
                    origin_contact_id=cid,
                    filename=filename,
                    mime_type="application/pdf",
                    size_bytes=10,
                    created_by_user_id=user,
                )
            )
    found = search(database, agent, SearchQuery(q="SP19"))
    rendered = str(found)
    assert (
        hidden["contact"]["id"] not in rendered
        and "secret" not in rendered
        and "privé" not in rendered
    )
    assert str(public_property) in rendered and str(dev["development_id"]) in rendered
    assert (
        found["counts"]["contact"] == 1
        and found["counts"]["enquiry"] == 1
        and found["counts"]["document"] == 1
    )
    assert found["counts"]["unit_type"] == 1
    all_rows = search(database, manager, SearchQuery(q="SP19"))
    assert all_rows["counts"]["contact"] == 2 and all_rows["counts"]["document"] == 2
    first = search(database, agent, SearchQuery(q="SP19", page_size=1))
    second = search(database, agent, SearchQuery(q="SP19", page_size=1, page=2))
    assert first["items"] != second["items"] and first == search(
        database, agent, SearchQuery(q="SP19", page_size=1)
    )
    deep = search(database, agent, SearchQuery(q="SP19", page=999, page_size=1))
    assert deep["items"] == [] and deep["total"] == found["total"] and deep["has_previous"]
    assert search(database, agent, SearchQuery(q="%_"))["total"] == 0
    assert search(database, agent, SearchQuery(q="600000002"))["total"] == 0
    hidden_id = UUID(hidden["contact"]["id"])
    with database.session() as session, session.begin():
        session.add(ContactCollaborator(contact_id=hidden_id, user_id=uid))
    assert search(database, agent, SearchQuery(q="SP19"))["counts"]["contact"] == 2
    with database.session() as session, session.begin():
        session.execute(
            update(ContactCollaborator)
            .where(ContactCollaborator.contact_id == hidden_id, ContactCollaborator.user_id == uid)
            .values(revoked_at=datetime.now(UTC))
        )
    assert search(database, agent, SearchQuery(q="SP19"))["counts"]["contact"] == 1


def test_export_filtered_csv_phone_text_private_storage_permit_retry_and_origin_guards(
    settings, database
):
    _, agent = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    value = lead(settings, database, agent, "+212600000001", "=SP19, été synthétique")
    body = NewExport(filters={"q": "SP19"})
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        request_export(database, agent, uuid4(), body)
    key = uuid4()
    made = request_export(database, manager, key, body)
    assert made == request_export(database, manager, key, body)
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        request_export(database, manager, key, NewExport(kind="contacts"))
    eid = UUID(made["id"])
    assert export_worker.run_once(database, settings)
    result = read_exports(database, manager, PageQuery(), eid)
    assert result["state"] == "ready" and result["row_count"] == 1
    permit = issue_download(database, manager, eid, "a" * 64)
    with pytest.raises(IdentityError, match="FILE_PERMIT_INVALID"):
        download(database, settings, eid, permit["token"], "b" * 64)
    data = download(database, settings, eid, permit["token"], "a" * 64)
    rows = list(csv.DictReader(io.StringIO(data.decode("utf-8-sig"))))
    assert (
        rows[0]["name"] == "'=SP19, été synthétique"
        and rows[0]["primary_phone"] == "'+212600000001"
    )
    assert rows[0]["enquiry_id"] == value["id"] and "Note" not in rows[0]
    with pytest.raises(IdentityError, match="FILE_PERMIT_INVALID"):
        download(database, settings, eid, permit["token"], "a" * 64)
    assert request_export(database, manager, key, body)["id"] == str(eid)
    with database.session() as s:
        assert s.scalar(select(func.count()).select_from(ExportJob)) == 1
        assert (
            s.scalar(
                select(func.count()).select_from(OutboxEvent).where(OutboxEvent.export_id == eid)
            )
            == 1
        )
    with pytest.raises(IntegrityError), database.session() as s, s.begin():
        s.execute(update(ExportJob).where(ExportJob.id == eid).values(kind="contacts"))
    assert read_audit(database, manager, AuditQuery(family="exports"))["total"] == 3
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        read_audit(database, agent, AuditQuery())


def test_revocation_during_generation_and_before_delivery_denies_bytes(settings, database):
    uid, manager = actor(settings, database, "manager")
    eid = UUID(request_export(database, manager, uuid4(), NewExport())["id"])
    jid, fence, claimed = export_worker.claim(database)
    data, count = csv_export.generate(database, eid)
    with database.session() as s, s.begin():
        s.execute(update(User).where(User.id == uid).values(role="agent", version=User.version + 1))
    assert export_worker.finish(database, jid, fence, claimed, uuid4(), data, count)
    with database.session() as s:
        assert s.get(ExportJob, eid).state == "denied" and s.get(ExportJob, eid).object_key is None
    _, new_manager = actor(settings, database, "manager")
    ready = UUID(request_export(database, new_manager, uuid4(), NewExport())["id"])
    assert export_worker.run_once(database, settings)
    grant = issue_download(database, new_manager, ready, "a" * 64)
    with database.session() as s, s.begin():
        row = s.get(ExportJob, ready)
        s.execute(
            update(StaffSession)
            .where(StaffSession.id == row.permit_session_id)
            .values(revoked_at=datetime.now(UTC))
        )
    with pytest.raises(IdentityError):
        download(database, settings, ready, grant["token"], "a" * 64)


def test_worker_concurrent_claim_interruption_fence_retry_and_limit_no_partial_publication(
    settings, database, monkeypatch
):
    _, manager = actor(settings, database, "manager")
    eid = UUID(request_export(database, manager, uuid4(), NewExport())["id"])
    from app.work.status import queue_status

    assert queue_status(database)["undispatched"] == 1
    with ThreadPoolExecutor(max_workers=2) as pool:
        claims = list(pool.map(lambda _: export_worker.claim(database), range(2)))
    assert len([c for c in claims if c]) == 1
    jid, old, e = next(c for c in claims if c)
    with database.session() as s, s.begin():
        s.execute(
            update(Job)
            .where(Job.id == jid)
            .values(lease_until=datetime.now(UTC) - timedelta(seconds=1))
        )
    newer = export_worker.claim(database)
    assert newer and newer[0] == jid and newer[1] != old
    assert not export_worker.finish(database, jid, old, e, uuid4(), b"bad", 1)
    assert export_worker.finish(database, *newer, None, error="FILE_STORAGE_UNAVAILABLE")
    with database.session() as s, s.begin():
        s.execute(
            update(Job)
            .where(Job.id == jid)
            .values(available_at=datetime.now(UTC) - timedelta(seconds=1))
        )
    monkeypatch.setattr(csv_export, "MAX_BYTES", 1)
    assert export_worker.run_once(database, settings)
    assert read_exports(database, manager, PageQuery(), eid)["state"] == "failed"
    with database.session() as s:
        assert s.get(ExportJob, eid).object_key is None


def test_physical_archive_restore_versions_receipts_references_and_current_campaign_guard(
    settings, database
):
    _, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    pid = property_draft(settings, database, manager)
    key = uuid4()
    body = ArchiveDevelopment(expected_version=1, reason="Archive synthétique")
    result = run(settings, database, manager, "property-archive", body, pid, key)
    assert result == run(settings, database, manager, "property-archive", body, pid, key)
    assert read_list(database, manager, "properties", InventoryQuery())["total"] == 0
    assert (
        read_list(database, manager, "properties", InventoryQuery(archive="archived"))["total"] == 1
    )
    assert read_detail(database, manager, pid)["archived_at"] is not None
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        run(
            settings,
            database,
            agent,
            "property-restore",
            ArchiveDevelopment(expected_version=2, reason="Test"),
            pid,
        )
    run(
        settings,
        database,
        manager,
        "property-restore",
        ArchiveDevelopment(expected_version=2, reason="Restauration synthétique"),
        pid,
    )
    assert read_detail(database, manager, pid)["archived_at"] is None
    offering_draft(settings, database, manager, pid)
    with pytest.raises(IdentityError, match="STOCK_REVIEW_REQUIRED"):
        run(
            settings,
            database,
            manager,
            "property-archive",
            ArchiveDevelopment(expected_version=4, reason="Test"),
            pid,
        )
    with pytest.raises(IntegrityError), database.session() as s, s.begin():
        s.execute(update(Property).where(Property.id == pid).values(archived_at=datetime.now(UTC)))


def test_controlled_24_calendar_month_retention_keeps_boundary_contacts_and_business_finance(
    settings, database
):
    uid, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    value = lead(settings, database, agent, "+212600000001", "SP19 retained synthétique")
    cid = UUID(value["contact"]["id"])
    clock = datetime(2028, 2, 29, 12, tzinfo=UTC)
    cutoff = datetime(2026, 2, 28, 12, tzinfo=UTC)
    old_id, boundary, business, finance = [uuid4() for _ in range(4)]
    with database.session() as s, s.begin():
        s.add_all(
            [
                AuditEvent(
                    id=old_id,
                    actor_user_id=uid,
                    action="identity.login",
                    created_at=cutoff - timedelta(microseconds=1),
                ),
                AuditEvent(
                    id=boundary, actor_user_id=uid, action="identity.login", created_at=cutoff
                ),
                AuditEvent(
                    id=business,
                    actor_user_id=uid,
                    contact_id=cid,
                    action="contacts.archive",
                    created_at=cutoff - timedelta(days=2),
                ),
                AuditEvent(
                    id=finance,
                    actor_user_id=uid,
                    action="deals.finance.review",
                    created_at=cutoff - timedelta(days=2),
                ),
            ]
        )
    assert purge_security(database, clock) == 1
    assert purge_security(database, clock) == 0
    with database.session() as s:
        assert s.get(AuditEvent, old_id) is None
        assert all(s.get(AuditEvent, i) for i in (boundary, business, finance))
        assert s.get(Contact, cid).archived_at is None
        assert s.scalar(select(func.count()).select_from(TimelineEvent)) > 0
    with pytest.raises(ValueError, match="AWARE"):
        purge_security(database, datetime(2028, 1, 1))


def test_archive_racing_new_campaign_has_one_winner_and_no_archived_current_stock(
    settings, database
):
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)

    def attempt(action):
        try:
            if action == "archive":
                run(
                    settings,
                    database,
                    manager,
                    "property-archive",
                    ArchiveDevelopment(expected_version=1, reason="SP19 course synthétique"),
                    pid,
                )
            else:
                from app.inventory.contracts import NewOffering

                run(
                    settings,
                    database,
                    manager,
                    "create-offering",
                    NewOffering(
                        property_id=pid,
                        expected_property_version=1,
                        kind="sale",
                        price_mad="100",
                        price_period=None,
                    ),
                )
            return "ok"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, ["archive", "offering"]))
    assert results.count("ok") == 1
    assert all(
        result in {"ok", "STOCK_REVIEW_REQUIRED", "INVENTORY_VERSION_CONFLICT"}
        for result in results
    )
    with database.session() as session:
        from app.inventory.models import Offering

        item = session.get(Property, pid)
        current = session.scalar(
            select(Offering.id).where(Offering.property_id == pid, Offering.is_current)
        )
        assert not (item.archived_at and current)


def test_actual_shared_worker_cli_publishes_export(settings, database):
    import os
    import subprocess
    import sys

    _, manager = actor(settings, database, "manager")
    eid = UUID(request_export(database, manager, uuid4(), NewExport())["id"])
    result = subprocess.run(
        [sys.executable, "-m", "app.cli.worker", "--once"],
        env=os.environ | {"APP_ENVIRONMENT": "test", "ANTIVIRUS_PORT": "3310"},
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert result.returncode == 0, "SHARED_WORKER_CLI_FAILED"
    assert read_exports(database, manager, PageQuery(), eid)["state"] == "ready"


def test_deal_and_deal_document_names_inherit_current_private_contact_scope(settings, database):
    from tests.deal_support import new as new_deal
    from tests.deal_support import run as deal_command

    uid, agent = actor(settings, database)
    other, private = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    for owner, token, phone, title in [
        (uid, agent, "+212600000001", "SP19 visible affaire"),
        (other, private, "+212600000002", "SP19 privée affaire"),
    ]:
        contact = UUID(lead(settings, database, token, phone, title)["contact"]["id"])
        did = UUID(deal_command(settings, database, token, new_deal(contact, title=title))["id"])
        with database.session() as session, session.begin():
            session.add(
                Document(
                    deal_id=did,
                    filename=title + ".pdf",
                    mime_type="application/pdf",
                    size_bytes=10,
                    created_by_user_id=owner,
                )
            )
    result = search(database, agent, SearchQuery(q="SP19"))
    assert result["counts"]["deal"] == 1 and result["counts"]["document"] == 1
    assert "privée" not in str(result)
    all_rows = search(database, manager, SearchQuery(q="SP19"))
    assert all_rows["counts"]["deal"] == 2 and all_rows["counts"]["document"] == 2
