import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from starlette.websockets import WebSocketDisconnect

from app.db.session import Database
from app.identity.models import StaffSession, User
from app.identity.security import IdentityError, csrf_token
from app.identity.service import login
from app.main import create_app
from app.realtime.events import install, topics_for
from app.realtime.models import RealtimeTicket
from app.realtime.push import validate_endpoint, validate_key
from app.realtime.router import check, consume, issue
from app.realtime.transport import Hub
from app.settings import Settings
from tests.identity_support import create_actor
from tests.test_isolation_migrations import HEAD, migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.fixture
def anyio_backend():
    return "asyncio", {"loop_factory": asyncio.SelectorEventLoop}


def actor(settings: Settings, database: Database) -> str:
    _, email, password = create_actor(settings, database)
    return login(database, settings.facade_secret.get_secret_value(), email, password)[0]


def test_one_use_concurrent_expired_and_revoked(settings: Settings, database: Database) -> None:
    token = actor(settings, database)
    ticket = issue(database, token)

    def take() -> bool:
        try:
            consume(database, ticket, uuid4())
            return True
        except IdentityError:
            return False

    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(lambda _: take(), range(2))) == [False, True]
    expired = issue(database, token)
    with database.session() as session, session.begin():
        session.execute(
            update(RealtimeTicket).values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
    with pytest.raises(IdentityError):
        consume(database, expired, uuid4())
    revoked = issue(database, token)
    with database.session() as session, session.begin():
        session.execute(update(StaffSession).values(revoked_at=datetime.now(UTC)))
    with pytest.raises(IdentityError):
        consume(database, revoked, uuid4())


def test_hidden_tabs_still_count_toward_connection_limit(settings, database):
    token = actor(settings, database)
    for _ in range(5):
        cid = uuid4()
        sid = consume(database, issue(database, token), cid)
        check(database, sid, cid, False)
    with pytest.raises(IdentityError, match="RATE_LIMITED"):
        consume(database, issue(database, token), uuid4())


def test_ws_origin_ticket_and_revocation(settings: Settings, database: Database) -> None:
    token = actor(settings, database)
    config = settings.model_copy(update={"realtime_enabled": True})
    app = create_app(config)
    with TestClient(app, backend_options={"loop_factory": asyncio.SelectorEventLoop}) as client:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(
                "/api/v1/realtime/ws", headers={"Origin": "https://evil.example"}
            ):
                pass
        headers = {
            "Origin": settings.frontend_origin,
            "X-Kay-Facade-Secret": settings.facade_secret.get_secret_value(),
            "X-Kay-Session": token,
        }
        assert client.post("/api/v1/realtime/tickets", headers=headers).status_code == 403
        headers["X-CSRF-Token"] = csrf_token(settings.facade_secret.get_secret_value(), token)
        assert client.get("/api/v1/realtime/status", headers=headers).status_code == 200
        result = client.post("/api/v1/realtime/tickets", headers=headers)
        assert result.status_code == 200
        ticket = result.json()["ticket"]
        with client.websocket_connect(
            "/api/v1/realtime/ws", headers={"Origin": settings.frontend_origin}
        ) as ws:
            ws.send_json({"ticket": ticket})
            assert ws.receive_json() == {"type": "ready"}
            with database.session() as session, session.begin():
                session.execute(update(StaffSession).values(revoked_at=datetime.now(UTC)))
            client.portal.call(app.state.realtime.broadcast, {"identity"})
            with pytest.raises(WebSocketDisconnect):
                ws.receive_json()
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(
                "/api/v1/realtime/ws", headers={"Origin": settings.frontend_origin}
            ) as ws:
                ws.send_json({"ticket": ticket})
                ws.receive_json()


@pytest.mark.anyio
async def test_cross_process_listener_commit_and_rollback(
    settings: Settings, database: Database
) -> None:
    actor(settings, database)
    hub = Hub(database)
    queue: asyncio.Queue[set[str]] = asyncio.Queue(maxsize=1)
    connection_id = uuid4()
    hub.clients[connection_id] = queue
    with database.session() as session:
        hub.users[connection_id] = str(session.scalar(select(User.id)))
    task = asyncio.create_task(hub.listen())
    stop = install(database)
    try:
        await asyncio.wait_for(queue.get(), 5)
        with database.session() as session, session.begin():
            session.execute(update(User).values(display_name="Compte synthétique modifié"))
        assert "identity" in await asyncio.wait_for(queue.get(), 5)
        assert hub.received > 0
        assert hub.max_lag_ms < 2000
        with database.session() as session:
            session.execute(update(User).values(display_name="Non conservé"))
            session.rollback()
        with pytest.raises(TimeoutError):
            await asyncio.wait_for(queue.get(), 0.5)
    finally:
        stop()
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task


@pytest.mark.anyio
async def test_transfer_notifies_both_owners_but_not_outsider(settings, database):
    from app.contacts.models import Contact
    from tests.contact_support import actor as contact_actor
    from tests.deal_support import setup
    from tests.test_ownership import change, intent

    owner, _, cid, _ = setup(settings, database)
    successor, _ = contact_actor(settings, database)
    outsider, _ = contact_actor(settings, database)
    _, manager_token = contact_actor(settings, database, "manager")
    hub = Hub(database)
    queues = {}
    for uid in (owner, successor, outsider):
        cid_socket = uuid4()
        queues[uid] = asyncio.Queue(maxsize=1)
        hub.clients[cid_socket], hub.users[cid_socket] = queues[uid], str(uid)
    listener = asyncio.create_task(hub.listen())
    stop = install(database)
    try:
        for queue in queues.values():
            await asyncio.wait_for(queue.get(), 5)
        with database.session() as session:
            version = session.get(Contact, cid).version
        change(
            settings,
            database,
            manager_token,
            cid,
            intent("assign", version=version, primary_agent_id=str(successor)),
        )
        assert "contacts" in await asyncio.wait_for(queues[owner].get(), 5)
        assert "contacts" in await asyncio.wait_for(queues[successor].get(), 5)
        with pytest.raises(TimeoutError):
            await asyncio.wait_for(queues[outsider].get(), 0.5)
    finally:
        stop()
        listener.cancel()
        with pytest.raises(asyncio.CancelledError):
            await listener


def test_protocol_allowlists() -> None:
    assert topics_for({"task"}) == {"tasks", "reports"}
    assert topics_for({"file_permit", "realtime_presence"}) == set()
    assert validate_endpoint("https://web.push.apple.com/Q/example")
    for value in (
        "http://fcm.googleapis.com/a",
        "https://localhost/a",
        "https://fcm.googleapis.com.evil.example/a",
        "https://fcm.googleapis.com:444/a",
        "https://user@fcm.googleapis.com/a",
    ):
        with pytest.raises(ValueError):
            validate_endpoint(value)
    with pytest.raises(ValueError):
        validate_key("invalid", 65)


def test_additive_schema_preserves_staff_and_refuses_lossy_downgrade(settings, database):
    token = actor(settings, database)
    with database.session() as session:
        before = session.scalars(select(User.id)).all()
    assert migrate("downgrade", "0030_generated_documents").returncode == 0
    try:
        with database.session() as session:
            assert session.scalars(select(User.id)).all() == before
        assert migrate("upgrade", "head").returncode == 0
        issue(database, token)
        assert migrate("downgrade", "0030_generated_documents").returncode != 0
        from sqlalchemy import text

        with database.session() as session:
            assert session.scalar(text("SELECT version_num FROM alembic_version")) == HEAD
        assert migrate("check").returncode == 0
    finally:
        assert migrate("upgrade", "head").returncode == 0


def test_push_encrypts_only_generic_content(settings, monkeypatch):
    import base64
    import json
    import secrets

    import http_ece
    import requests
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.serialization import (
        Encoding,
        NoEncryption,
        PrivateFormat,
        PublicFormat,
    )
    from pydantic import SecretStr

    from app.realtime.models import PushSubscription
    from app.realtime.push import send

    def encoded(value):
        return base64.urlsafe_b64encode(value).rstrip(b"=").decode()

    browser_key, vapid_key = (
        ec.generate_private_key(ec.SECP256R1()),
        ec.generate_private_key(ec.SECP256R1()),
    )
    auth = secrets.token_bytes(16)
    sub = PushSubscription(
        endpoint="https://fcm.googleapis.com/test",
        p256dh=encoded(
            browser_key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
        ),
        auth=encoded(auth),
    )
    config = settings.model_copy(
        update={
            "vapid_private_key": SecretStr(
                encoded(vapid_key.private_bytes(Encoding.DER, PrivateFormat.PKCS8, NoEncryption()))
            ),
            "vapid_subject": "mailto:synthetic@example.com",
        }
    )
    requests_seen = []

    def transport(self, method, url, **kwargs):
        assert kwargs["allow_redirects"] is False
        assert kwargs["timeout"] == 5
        requests_seen.append(kwargs["data"])
        response = requests.Response()
        response.status_code = 201
        return response

    monkeypatch.setattr(requests.Session, "request", transport)
    assert validate_key(sub.p256dh, 65) == sub.p256dh
    send(sub, config, "synthetic-notification")
    clear = http_ece.decrypt(
        requests_seen[0], private_key=browser_key, auth_secret=auth, version="aes128gcm"
    )
    assert json.loads(clear) == {
        "title": "Nouvelle notification KAY",
        "tag": "synthetic-notification",
    }


@pytest.mark.parametrize(
    "condition",
    ["deliver", "present", "other_session", "revoked", "expired", "retry", "concurrent", "gone"],
)
def test_push_inbox_scope_presence_dedup_and_retry(settings, database, monkeypatch, condition):
    from app.realtime.models import PushDelivery, PushSubscription, RealtimePresence
    from app.realtime.push import run_once
    from app.work.worker import run_once as remind
    from tests.deal_support import setup
    from tests.test_work import new, run

    uid, token, cid, _ = setup(settings, database)
    now = datetime.now(UTC)
    run(
        settings,
        database,
        token,
        new(uid, cid, due_at=(now - timedelta(minutes=5)).replace(second=0, microsecond=0)),
    )
    assert remind(database, now - timedelta(seconds=120))
    with database.session() as session, session.begin():
        sid = session.scalar(select(StaffSession.id).where(StaffSession.user_id == uid))
        session.add(
            PushSubscription(
                session_id=sid,
                endpoint="https://fcm.googleapis.com/test",
                p256dh="synthetic",
                auth="synthetic",
                active=True,
                created_at=now - timedelta(minutes=10),
            )
        )
        if condition in ("present", "other_session"):
            present_sid = sid
            if condition == "other_session":
                source = session.get(StaffSession, sid)
                other = StaffSession(
                    user_id=uid,
                    token_hash=bytes(32),
                    created_at=now,
                    expires_at=now + timedelta(days=1),
                    user_version=source.user_version,
                    credential_version=source.credential_version,
                    role_at_login=source.role_at_login,
                )
                session.add(other)
                session.flush()
                present_sid = other.id
            session.add(
                RealtimePresence(connection_id=uuid4(), session_id=present_sid, seen_at=now)
            )
        if condition == "revoked":
            session.execute(update(StaffSession).values(revoked_at=now))
        if condition == "expired":
            session.execute(
                update(StaffSession).values(
                    created_at=now - timedelta(days=2), expires_at=now - timedelta(seconds=1)
                )
            )
    sent = []

    def sender(*args):
        sent.append(True)
        if condition == "retry":
            raise OSError("SYNTHETIC_PROVIDER_UNAVAILABLE")
        if condition == "gone":
            import requests
            from pywebpush import WebPushException

            response = requests.Response()
            response.status_code = 410
            raise WebPushException("synthetic", response=response)

    monkeypatch.setattr("app.realtime.push.send", sender)
    config = settings.model_copy(update={"web_push_enabled": True})
    if condition == "concurrent":
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: run_once(database, config), range(2)))
        assert sorted(results) == [False, True]
        assert len(sent) == 1
        worked = True
    else:
        worked = run_once(database, config)
    if condition in ("revoked", "expired"):
        assert not worked and not sent
        return
    assert worked
    with database.session() as session:
        job = session.scalar(select(PushDelivery))
        assert (
            job.state
            == {
                "deliver": "done",
                "present": "skipped",
                "other_session": "skipped",
                "retry": "ready",
                "concurrent": "done",
                "gone": "failed",
            }[condition]
        )
        assert job.attempts == 1
        if condition == "gone":
            assert not session.get(PushSubscription, job.subscription_id).active
    assert bool(sent) == (condition not in ("present", "other_session"))
    assert not run_once(database, config)
