import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.exc import IntegrityError

from app.cli.website_source import configure
from app.contacts.contracts import ListQuery
from app.contacts.history_models import TimelineEvent
from app.contacts.models import Contact, Enquiry
from app.contacts.queries import read_detail, read_list
from app.files.models import Job, OutboxEvent
from app.identity.models import Credential
from app.identity.security import IdentityError, keyed_digest
from app.intake.authentication import signature
from app.intake.configuration import load_key
from app.intake.contracts import Submission
from app.intake.models import WebsiteReceipt, WebsiteSource
from app.intake.service import receive
from app.intake.worker import run_once
from app.main import create_app
from tests.contact_support import actor, create_lead

pytestmark = pytest.mark.usefixtures("clean_identity")


def payload(**changes):
    return {
        "submission_id": uuid4().hex,
        "submitted_at": datetime.now(UTC).isoformat(),
        "name": "SP20 contact synthétique",
        "phone": "+212600000001",
        "email": "sp20@example.com",
        "message": "Demande web synthétique",
        **changes,
    }


def setup_source(settings, database):
    uid, token = actor(settings, database)
    configure(uid)
    return uid, token, load_key(settings)


def delivery(database, key, data=None):
    data = payload() if data is None else data
    body = json.dumps(data, ensure_ascii=False).encode()
    return receive(database, key, body, Submission.model_validate(data)), body


def signed(key, body, timestamp=None):
    stamp = str(int(time.time())) if timestamp is None else timestamp
    return {
        "Content-Type": "application/json",
        "X-Kay-Timestamp": stamp,
        "X-Kay-Signature": signature(key, stamp, body),
    }


@pytest.mark.anyio
async def test_http_durable_receipt_retry_status_and_signature_rejections(settings, database):
    _, token, key = setup_source(settings, database)
    application = create_app(settings)
    data = payload()
    body = json.dumps(data).encode()
    path = "/api/v1/intake/website/local-simulator"
    async with (
        application.router.lifespan_context(application),
        httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="https://localhost"
        ) as client,
    ):
        for headers, content, route in [
            ({"Content-Type": "application/json"}, body, path),
            (signed(key, body) | {"X-Kay-Signature": "f" * 64}, body, path),
            (signed(key, body), body + b" ", path),
            (signed(key, body, str(int(time.time()) - 301)), body, path),
            (signed(key, body, str(int(time.time()) + 600)), body, path),
            (signed(key, body) | {"X-Kay-Timestamp": "a" * 200}, body, path),
            (signed(key, body), body, path.replace("local-simulator", "unknown")),
        ]:
            rejected = await client.post(route, content=content, headers=headers)
            assert rejected.status_code == 401
            assert data["phone"] not in rejected.text and data["name"] not in rejected.text
        with database.session() as session:
            assert session.scalar(select(func.count()).select_from(WebsiteReceipt)) == 0
        result = await client.post(path, content=body, headers=signed(key, body))
        assert result.status_code == 202 and result.headers["cache-control"] == "no-store"
        receipt = result.json()
        assert set(receipt) == {"receipt_id", "state"} and receipt["state"] == "queued"
        with database.session() as session:
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(OutboxEvent)
                    .where(OutboxEvent.kind == "website.process")
                )
                == 1
            )
            assert session.scalar(select(func.count()).select_from(Enquiry)) == 0
        assert (await client.post(path, content=body, headers=signed(key, body))).json() == receipt
        changed = json.dumps(data | {"name": "Autre nom synthétique"}).encode()
        assert (
            await client.post(path, content=changed, headers=signed(key, changed))
        ).status_code == 409
        assert run_once(database)
        assert not run_once(database)
        status_body = json.dumps({"receipt_id": receipt["receipt_id"]}).encode()
        current = await client.post(
            path + "/receipt", content=status_body, headers=signed(key, status_body)
        )
        assert current.json() == receipt | {"state": "processed"}
        assert set(current.json()) == {"receipt_id", "state"}
        assert (
            await client.post(path, content=body, headers=signed(key, body))
        ).json() == current.json()
    assert read_list(database, token, "enquiries", ListQuery(source="website"))["total"] == 1


@pytest.mark.anyio
async def test_strict_input_bounds_rate_and_no_registration(settings, database):
    _, _, key = setup_source(settings, database)
    application = create_app(settings)
    path = "/api/v1/intake/website/local-simulator"
    async with (
        application.router.lifespan_context(application),
        httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="https://localhost"
        ) as client,
    ):
        for data in [
            payload(role="administrator"),
            payload(owner_id=str(uuid4())),
            payload(assigned_agent_id=str(uuid4())),
            payload(name=""),
            payload(phone="bad"),
            payload(email="bad"),
            payload(submitted_at="2026-10-16T00:00:00"),
            payload(source="other"),
            payload(message="x" * 4001),
            payload(property_reference="x" * 101),
        ]:
            body = json.dumps(data).encode()
            assert (
                await client.post(path, content=body, headers=signed(key, body))
            ).status_code == 422
        too_large = b" " * 8193
        assert (
            await client.post(path, content=too_large, headers=signed(key, too_large))
        ).status_code == 413

        async def chunks():
            yield b" " * 5000
            yield b" " * 5000

        assert (
            await client.post(path, content=chunks(), headers={"Content-Type": "application/json"})
        ).status_code == 413
        from app.identity.models import LoginRateBucket

        with database.session() as session, session.begin():
            rate_key = keyed_digest(
                settings.facade_secret.get_secret_value(), "intake-rate", "global"
            )
            session.execute(
                update(LoginRateBucket).where(LoginRateBucket.key == rate_key).values(attempts=300)
            )
        body = json.dumps(payload()).encode()
        assert (await client.post(path, content=body, headers=signed(key, body))).status_code == 429
        assert (await client.post("/api/v1/auth/register", json={})).status_code == 404


def test_known_private_identity_and_new_enquiries(settings, database):
    uid, token, key = setup_source(settings, database)
    other, other_token = actor(settings, database)
    existing = create_lead(settings, database, token)
    with database.session() as session:
        original = session.get(Contact, UUID(existing["contact"]["id"]))
        before = (original.name, original.version, original.primary_agent_id, original.source)
    # The source's default does not acquire a private contact by knowing its phone.
    with database.session() as session, session.begin():
        session.scalar(select(WebsiteSource)).default_agent_id = other
    first, _ = delivery(database, key, payload(name="Ne pas écraser", email="other@example.com"))
    second, _ = delivery(database, key)
    assert first["receipt_id"] != second["receipt_id"]
    assert run_once(database) and run_once(database) and not run_once(database)
    with database.session() as session:
        contact = session.get(Contact, original.id)
        assert (contact.name, contact.version, contact.primary_agent_id, contact.source) == before
        rows = session.scalars(select(Enquiry).where(Enquiry.source == "website")).all()
        assert len(rows) == 2 and all(
            row.contact_id == original.id and row.assigned_agent_id == uid for row in rows
        )
        assert all(row.created_by_user_id is None and row.website_source_id for row in rows)
        assert session.scalar(select(func.count()).select_from(Contact)) == 1
    assert read_list(database, token, "enquiries", ListQuery(source="website"))["total"] == 2
    assert read_list(database, other_token, "enquiries", ListQuery(source="website"))["total"] == 0
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_detail(database, other_token, "enquiries", rows[0].id)


def test_routing_rechecks_current_primary_and_manager_queue(settings, database):
    uid, token, key = setup_source(settings, database)
    new_uid, new_token = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    existing = create_lead(settings, database, token)
    cid = UUID(existing["contact"]["id"])
    delivery(database, key)
    with database.session() as session, session.begin():
        session.execute(update(Contact).where(Contact.id == cid).values(primary_agent_id=new_uid))
        session.execute(
            update(Enquiry).where(Enquiry.contact_id == cid).values(assigned_agent_id=new_uid)
        )
    assert run_once(database)
    assert read_list(database, token, "enquiries", ListQuery(source="website"))["total"] == 0
    assert read_list(database, new_token, "enquiries", ListQuery(source="website"))["total"] == 1
    delivery(database, key)
    with database.session() as session, session.begin():
        session.execute(
            update(Credential)
            .where(Credential.user_id == new_uid)
            .values(
                must_change_password=True,
                temporary_expires_at=datetime.now(UTC) + timedelta(days=1),
            )
        )
    assert run_once(database)
    with database.session() as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(Enquiry)
                .where(Enquiry.source == "website", Enquiry.assigned_agent_id.is_(None))
            )
            == 1
        )
    assert read_list(database, manager, "enquiries", ListQuery(source="website"))["total"] == 2


def test_concurrent_identical_delivery_and_worker_exactly_once(settings, database):
    _, _, key = setup_source(settings, database)
    data = payload()
    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(lambda _: delivery(database, key, data)[0], range(2)))
    assert results[0] == results[1]
    with ThreadPoolExecutor(2) as pool:
        assert sorted(pool.map(lambda _: run_once(database), range(2))) == [False, True]
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Contact)) == 1
        assert session.scalar(select(func.count()).select_from(Enquiry)) == 1
        assert session.scalar(select(func.count()).select_from(TimelineEvent)) == 2


def test_concurrent_new_submissions_same_phone_one_contact(settings, database):
    _, _, key = setup_source(settings, database)
    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(lambda _: delivery(database, key)[0], range(2)))
    assert results[0]["receipt_id"] != results[1]["receipt_id"]
    with ThreadPoolExecutor(2) as pool:
        assert list(pool.map(lambda _: run_once(database), range(2))) == [True, True]
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Contact)) == 1
        assert session.scalar(select(func.count()).select_from(Enquiry)) == 2


def test_rollback_after_effect_and_bounded_retry(settings, database, monkeypatch):
    _, _, key = setup_source(settings, database)
    receipt, _ = delivery(database, key)
    from app.intake import worker

    original = worker.apply

    def interrupted(*args):
        original(*args)
        raise ValueError("SYNTHETIC_INTERRUPTION")

    monkeypatch.setattr(worker, "apply", interrupted)
    for attempt in range(5):
        with database.session() as session, session.begin():
            session.execute(
                update(Job).values(available_at=datetime.now(UTC) - timedelta(seconds=1))
            )
        assert run_once(database)
        with database.session() as session:
            assert session.scalar(select(func.count()).select_from(Contact)) == 0
            assert session.scalar(select(func.count()).select_from(Enquiry)) == 0
            assert session.get(WebsiteReceipt, UUID(receipt["receipt_id"])).state == (
                "failed" if attempt == 4 else "queued"
            )
    assert not run_once(database)


def test_source_revocation_and_key_rotation_reject(settings, database):
    uid, _, key = setup_source(settings, database)
    delivery(database, key)
    with database.session() as session, session.begin():
        session.scalar(select(WebsiteSource)).active = False
    with pytest.raises(IdentityError):
        delivery(database, key)
    assert run_once(database)
    with database.session() as session:
        assert session.scalar(select(WebsiteReceipt)).state == "failed"
        assert session.scalar(select(func.count()).select_from(Contact)) == 0
    configure(uid, rotate=True)
    with pytest.raises(IdentityError):
        delivery(database, key)
    new_key = load_key(settings)
    delivery(database, new_key)
    assert run_once(database)


def test_sql_provenance_receipt_and_outbox_guards(settings, database):
    _, token, key = setup_source(settings, database)
    receipt, _ = delivery(database, key)
    assert run_once(database)
    with database.session() as session:
        row = session.scalar(select(WebsiteReceipt))
        contact = session.scalar(select(Contact))
    for sql in [
        "UPDATE website_receipt SET submission_id='changed'",
        "UPDATE website_receipt SET enquiry_id=NULL,state='queued'",
        "UPDATE contact SET created_by_user_id=primary_agent_id",
        "UPDATE enquiry SET website_source_id=NULL",
        "DELETE FROM website_receipt",
        "INSERT INTO outbox_event(id,kind,dedupe_key,website_receipt_id) "
        "SELECT gen_random_uuid(),'file.scan','bad',id FROM website_receipt",
    ]:
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.execute(text(sql))
    view = read_detail(database, token, "contacts", contact.id)
    assert view["source"] == "website" and view["created_by_user_id"] is None
    assert UUID(receipt["receipt_id"]) == row.id


def test_exact_five_minute_signature_window(settings, database, monkeypatch):
    _, _, key = setup_source(settings, database)
    from app.intake import authentication

    fixed = datetime(2030, 1, 1, tzinfo=UTC)

    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed

    monkeypatch.setattr(authentication, "datetime", Clock)
    for delta in (-300, 0, 300):
        timestamp = str(int(fixed.timestamp()) + delta)
        authentication.verify(
            key, key.source_key, timestamp, signature(key, timestamp, b"{}"), b"{}"
        )
    for delta in (-301, 301):
        timestamp = str(int(fixed.timestamp()) + delta)
        with pytest.raises(IdentityError):
            authentication.verify(
                key, key.source_key, timestamp, signature(key, timestamp, b"{}"), b"{}"
            )


def test_receipt_outbox_commit_failure_leaves_no_partial_delivery(settings, database, monkeypatch):
    _, _, key = setup_source(settings, database)
    from app.intake import service

    def interrupted(**kwargs):
        raise RuntimeError("SYNTHETIC_OUTBOX_FAILURE")

    monkeypatch.setattr(service, "OutboxEvent", interrupted)
    with pytest.raises(RuntimeError, match="SYNTHETIC_OUTBOX_FAILURE"):
        delivery(database, key)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(WebsiteReceipt)) == 0
        assert session.scalar(select(func.count()).select_from(OutboxEvent)) == 0


def test_local_operator_recovers_original_failed_receipt(settings, database, monkeypatch, capsys):
    uid, _, key = setup_source(settings, database)
    receipt, _ = delivery(database, key)
    from app.cli import website_control
    from app.intake.service import receipt_status

    monkeypatch.setattr("sys.argv", ["website_control", "--disable"])
    website_control.main()
    assert run_once(database)
    configure(uid)
    assert receipt_status(database, key, UUID(receipt["receipt_id"]))["state"] == "failed"
    monkeypatch.setattr("sys.argv", ["website_control", "--retry-receipt", receipt["receipt_id"]])
    website_control.main()
    assert run_once(database) and not run_once(database)
    assert receipt_status(database, key, UUID(receipt["receipt_id"])) == receipt | {
        "state": "processed"
    }
    with pytest.raises(SystemExit, match="WEBSITE_CONTROL_REFUSED"):
        website_control.main()
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Enquiry)) == 1
        assert session.scalar(select(func.count()).select_from(WebsiteReceipt)) == 1
    assert "WEBSITE_CONTROL_COMPLETED" in capsys.readouterr().out


def test_website_merge_preserves_receipt_and_true_source_history(settings, database):
    _, token, key = setup_source(settings, database)
    receipt, _ = delivery(database, key)
    assert run_once(database)
    from app.contacts.history import read_history
    from tests.contact_support import new_lead
    from tests.test_ownership import change, intent

    with database.session() as session:
        origin = session.scalar(select(Contact)).id
        eid = session.scalar(select(WebsiteReceipt)).enquiry_id
    survivor = create_lead(settings, database, token, new_lead("+33600000002"))["contact"]["id"]
    change(
        settings,
        database,
        token,
        origin,
        intent("merge", survivor_id=survivor, survivor_expected_version=1),
    )
    with database.session() as session:
        assert session.get(WebsiteReceipt, UUID(receipt["receipt_id"])).enquiry_id == eid
        row = session.get(Enquiry, eid)
        assert row.contact_id == UUID(survivor) and row.origin_contact_id == origin
    history = read_history(database, token, UUID(survivor), "timeline", 1, 100)["items"]
    assert any(
        item["actor"]["id"] is None and item["actor"]["display_name"].startswith("Source web")
        for item in history
    )
    delivery(database, key)
    assert run_once(database)
    assert read_list(database, token, "enquiries", ListQuery(source="website"))["total"] == 2
