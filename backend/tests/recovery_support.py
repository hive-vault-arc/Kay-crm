"""Synthetic full-slice point, using existing commands and the real local scanner."""

import hashlib
import re
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select, text

from app.cli.website_source import configure
from app.contacts.models import Contact
from app.db.isolation import assert_isolated
from app.db.session import Database
from app.deals.contracts import NewDeal
from app.files.models import Job, OutboxEvent
from app.files.service import consume_permit, publish_upload, read_document
from app.files.storage import PrivateStorage
from app.files.validation import validate_file
from app.files.worker import run_once as scan_once
from app.finance.contracts import Recognize
from app.identity.bootstrap import bootstrap_administrator
from app.identity.models import StaffSession
from app.identity.service import login
from app.imports import service as imports
from app.intake.configuration import load_key
from app.intake.worker import run_once as intake_once
from app.inventory.models import Offering
from app.recovery.maintenance import ready_path
from app.recovery.service import recovery_settings
from tests.ci_identity import require_recovery_identity
from tests.contact_support import create_lead
from tests.deal_support import run as deal_run
from tests.file_support import grant, image_bytes, new_document
from tests.identity_support import create_actor
from tests.test_developments import development, hierarchy, unit
from tests.test_finance import create as commission_create
from tests.test_finance import execute, receipt
from tests.test_imports import prepared
from tests.test_intake import delivery, payload
from tests.test_inventory import confirm, offering_draft, owners
from tests.test_schedule import booking, policy
from tests.test_schedule import run as schedule_run


def build(settings, database):
    admin = {"email": f"sp03-{uuid4().hex}@example.com", "password": secrets.token_urlsafe(24)}
    admin["id"] = str(
        bootstrap_administrator(
            database, "SP21 administrateur synthétique", admin["email"], admin["password"]
        )
    )
    token, _ = login(
        database, settings.facade_secret.get_secret_value(), admin["email"], admin["password"]
    )
    aid, email, password = create_actor(settings, database, role="agent")
    agent = {"id": str(aid), "email": email, "password": password}
    at, _ = login(database, settings.facade_secret.get_secret_value(), email, password)
    oid, email, password = create_actor(settings, database, role="agent")
    other = {"id": str(oid), "email": email, "password": password}
    lead = create_lead(settings, database, at)
    contact = UUID(lead["contact_id"] if "contact_id" in lead else lead["contact"]["id"])
    did = development(settings, database, token)
    _, floors, tid = hierarchy(settings, database, token, did)
    pid = unit(settings, database, token, did, floors[0], tid)
    owners(settings, database, token, pid, [contact])
    offering = offering_draft(
        settings, database, token, pid, kind="sale", price="1000000.00", period=None
    )
    offid = UUID(offering["offering_id"])
    confirm(settings, database, token, pid, offid)
    with database.session() as session:
        offering_version = session.get(Offering, offid).version
    deal = deal_run(
        settings,
        database,
        at,
        NewDeal(
            contact_id=contact,
            title="SP21 affaire synthétique restaurée",
            next_action="Vérifier la restauration",
            offering_id=offid,
            expected_offering_version=offering_version,
        ),
    )
    deal_id = UUID(deal["id"])
    commission = commission_create(settings, database, token, deal_id)
    execute(settings, database, token, Recognize(expected_version=1), cid=commission)
    execute(settings, database, token, receipt(2), cid=commission)
    policy(settings, database, token)
    visit = schedule_run(settings, database, at, booking(aid, contact))
    _, _, manager, batch, approval = prepared(settings, database)
    imports.approve(database, manager, batch, uuid4(), approval)
    configure(aid)
    web, _ = delivery(database, load_key(settings), payload(phone="+212600000001"))
    intake_once(database)
    queued, _ = delivery(database, load_key(settings), payload(phone="+212600000001"))
    data = image_bytes()
    document = new_document(
        settings, database, at, "contact", contact, data, filename="SP21 preuve synthétique.png"
    )
    upload = grant(database, at, document)
    vid, key, filename, mime, _, sid = consume_permit(
        database, UUID(upload["permit_id"]), upload["token"], "upload", upload["binding"]
    )
    validate_file(data, filename, mime)
    storage = PrivateStorage(settings)
    storage.path(key, partial=True).write_bytes(data)
    storage.promote(key)
    publish_upload(database, vid, sid, hashlib.sha256(data).digest())
    scan_once(database, settings)
    current = read_document(database, at, UUID(document["id"]))
    assert current["versions"][0]["state"] == "clean"
    old_permit = grant(database, at, current, "download", str(vid))
    pending = new_document(
        settings, database, at, "contact", contact, data, filename="SP21 transfert non terminé.png"
    )
    with database.session() as session, session.begin():
        event = session.scalar(
            select(OutboxEvent).where(OutboxEvent.website_receipt_id == UUID(queued["receipt_id"]))
        )
        # Simulate a genuinely leased interrupted job, never a committed effect.
        session.add(
            Job(
                outbox_id=event.id,
                state="running",
                attempts=1,
                available_at=datetime.now(UTC),
                lease_token=uuid4(),
                lease_until=datetime.now(UTC) + timedelta(minutes=1),
            )
        )
        stale = session.scalar(select(StaffSession).where(StaffSession.user_id == aid))
        stale.revoked_at = datetime.now(UTC)
    return {
        "admin": admin,
        "agent": agent,
        "other": other,
        "old_token": at,
        "active_token": token,
        "old_permit": old_permit,
        "contact_id": str(contact),
        "deal_id": str(deal_id),
        "development_id": str(did),
        "property_id": str(pid),
        "enquiry_id": str(lead["id"]),
        "document_id": document["id"],
        "version_id": str(vid),
        "commission_id": str(commission),
        "visit_id": visit["id"],
        "batch_id": str(batch),
        "website_receipt": web["receipt_id"],
        "pending_document_id": pending["id"],
        "contact_rows": count_contacts(database),
    }


def count_contacts(database):
    with database.session() as session:
        return len(session.scalars(select(Contact.id)).all())


def clear_recovery(settings):
    target = recovery_settings(settings)
    identity = assert_isolated(target)
    require_recovery_identity(target, identity)
    db = Database(target.selected_database_url())
    try:
        with db.engine.begin() as connection:
            if connection.scalar(text("SELECT to_regclass('public.user') IS NOT NULL")):
                emails = connection.scalars(text('SELECT email FROM "user"')).all()
                assert all(re.fullmatch(r"sp03-[a-f0-9]{32}@example.com", e) for e in emails)
            connection.exec_driver_sql("DROP SCHEMA IF EXISTS public CASCADE")
            connection.exec_driver_sql("CREATE SCHEMA public")
        storage = PrivateStorage(target)
        for path in storage.root.iterdir():
            storage.guard(path)
            assert re.fullmatch(r"[a-f0-9]{32}\.(blob|part)", path.name)
            path.unlink()
        ready_path().unlink(missing_ok=True)
    finally:
        db.close()
