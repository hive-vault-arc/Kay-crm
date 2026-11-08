"""Connection-forbidden command/HTTP coverage; these are not ledger/SQL acceptance."""

import json
import secrets
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.finance import commands, creation_keys, records
from app.finance import router as routes
from app.finance.contracts import NewCommission, Recognize
from app.finance.models import FinanceReceipt
from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError, keyed_digest

NOW = datetime(2026, 10, 29, 12, tzinfo=UTC)
SECRET = secrets.token_hex(32)


def key_at(instant):
    elapsed = instant - creation_keys.EPOCH
    milliseconds = (elapsed.days * 86_400 + elapsed.seconds) * 1_000 + elapsed.microseconds // 1_000
    value = (milliseconds << 80) | (7 << 76) | (uuid4().int & ((1 << 76) - 1))
    value = (value & ~(3 << 62)) | (2 << 62)
    return UUID(int=value)


class Session:
    def __init__(self, clock):
        self.clock, self.receipts, self.rows, self.events = clock, {}, {}, []

    @contextmanager
    def begin(self):
        receipts = self.receipts.copy()
        try:
            yield
        except Exception:
            self.receipts = receipts
            raise

    def scalar(self, statement):
        self.events.append(("lock", statement))

    def expire_all(self):
        self.events.append(("expire", None))

    def execute(self, statement):
        self.events.append(("prune", statement))
        cutoff = statement.whereclause.right.value
        self.receipts = {key: row for key, row in self.receipts.items() if row.created_at >= cutoff}

    def get(self, model, key):
        assert model is FinanceReceipt
        self.events.append(("receipt", key))
        return self.receipts.get(key)

    def add(self, row):
        assert isinstance(row, FinanceReceipt)
        row.created_at = self.clock.value
        self.receipts[(row.actor_id, row.route, row.key)] = row

    def flush(self):
        pass


class Database:
    def __init__(self, session):
        self.resource = session

    @contextmanager
    def session(self):
        yield self.resource


def fixture(monkeypatch, role="manager"):
    clock = SimpleNamespace(value=NOW)

    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return clock.value

    session = Session(clock)
    database = Database(session)
    identity = SimpleNamespace(user=SimpleNamespace(id=uuid4(), role=role))
    parent = SimpleNamespace(id=uuid4(), version=1, archived=False)
    calls = []

    def current(*_):
        session.events.append(("identity", identity.user.role))
        return identity

    def deal_access(_session, actor, did, *, write=False):
        records.require_manager(actor)
        session.events.append(("deal", did))
        if did != parent.id:
            raise IdentityError("NOT_FOUND", 404)
        if write and parent.archived:
            raise IdentityError("RECORD_ARCHIVED", 409)
        return parent

    def authorized(_session, actor, cid, *, write=False):
        deal_access(_session, actor, parent.id, write=write)
        row = session.rows.get(cid)
        if row is None:
            raise IdentityError("NOT_FOUND", 404)
        return row

    def apply(_session, actor, body, did, cid):
        calls.append(body)
        if isinstance(body, NewCommission):
            if parent.version != body.expected_deal_version:
                raise IdentityError("VERSION_CONFLICT", 409)
            row = SimpleNamespace(id=uuid4(), version=1)
            session.rows[row.id] = row
        else:
            row = session.rows[cid]
            if row.version != body.expected_version:
                raise IdentityError("VERSION_CONFLICT", 409)
            row.version += 1
        return row

    monkeypatch.setattr(commands, "datetime", Clock)
    monkeypatch.setattr(creation_keys, "datetime", Clock)
    monkeypatch.setattr(commands, "current_identity", current)
    monkeypatch.setattr(creation_keys, "current_identity", current)
    monkeypatch.setattr(commands, "deal_access", deal_access)
    monkeypatch.setattr(creation_keys, "deal_access", deal_access)
    monkeypatch.setattr(commands, "authorized", authorized)
    monkeypatch.setattr(commands, "apply", apply)
    body = NewCommission(
        expected_deal_version=1,
        kind="fixed",
        base_mad="1000000",
        amount_mad="10000",
    )

    def run(key, request=body, **target):
        return commands.command(
            database, "synthetic-proof", SECRET, key, request, **(target or {"did": parent.id})
        )

    return SimpleNamespace(
        database=database,
        session=session,
        identity=identity,
        parent=parent,
        clock=clock,
        calls=calls,
        body=body,
        run=run,
    )


def test_rfc_uuid7_timestamp_and_server_start_window_boundaries():
    # RFC9562 Appendix A.6: 1645557742000 milliseconds, independent fixed vector.
    key = UUID("017f22e2-79b0-7cc3-98c4-dc0c0c07398f")
    instant = datetime(2022, 2, 22, 19, 22, 22, tzinfo=UTC)
    creation_keys.require_creation_key(key, instant + timedelta(minutes=5, milliseconds=-1))
    with pytest.raises(IdentityError, match="FINANCE_CREATION_KEY_EXPIRED"):
        creation_keys.require_creation_key(key, instant + timedelta(minutes=5))
    creation_keys.require_creation_key(key_at(NOW + timedelta(seconds=5)), NOW)
    maximum_v7 = UUID(int=(((1 << 48) - 1) << 80) | (7 << 76) | (2 << 62))
    for bad in (
        key_at(NOW + timedelta(seconds=5, milliseconds=1)),
        UUID(int=(1 << 128) - 1),
        maximum_v7,
    ):
        with pytest.raises(IdentityError):
            creation_keys.require_creation_key(bad, NOW)


@pytest.mark.parametrize("role", ["manager", "administrator"])
def test_issuance_is_scoped_write_eligible_read_without_financial_facts(monkeypatch, role):
    s = fixture(monkeypatch, role)
    key = key_at(NOW)
    monkeypatch.setattr(creation_keys, "uuid7", lambda: key)
    result = creation_keys.issue_creation_key(s.database, "synthetic-proof", s.parent.id)
    assert result == {
        "deal_id": str(s.parent.id),
        "key": str(key),
        "expires_at": (NOW + timedelta(minutes=5)).isoformat(),
    }
    assert not s.calls and not s.session.receipts and not s.session.rows
    assert [event[0] for event in s.session.events] == ["identity", "deal"]


def test_issuance_denies_agent_before_lookup_and_rejects_archived_or_foreign_parent(monkeypatch):
    s = fixture(monkeypatch, "agent")
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        creation_keys.issue_creation_key(s.database, "synthetic-proof", uuid4())
    assert [event[0] for event in s.session.events] == ["identity"]
    s.identity.user.role = "manager"
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        creation_keys.issue_creation_key(s.database, "synthetic-proof", uuid4())
    s.parent.archived = True
    with pytest.raises(IdentityError, match="RECORD_ARCHIVED"):
        creation_keys.issue_creation_key(s.database, "synthetic-proof", s.parent.id)


def test_retained_creation_receipt_replays_after_start_window_without_new_apply(monkeypatch):
    s = fixture(monkeypatch)
    key = key_at(NOW)
    first = s.run(key)
    s.clock.value += timedelta(hours=23)
    s.parent.version = 2
    assert s.run(key) == first
    assert len(s.calls) == len(s.session.rows) == 1
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        s.run(key, s.body.model_copy(update={"amount_mad": "9999"}))


def test_pruned_creation_receipt_cannot_duplicate_fact_with_unchanged_parent(monkeypatch):
    s = fixture(monkeypatch)
    key = key_at(NOW)
    first = s.run(key)
    s.clock.value += timedelta(hours=25)
    # A different successful command commits the unchanged 24h pruning rule.
    s.run(uuid4(), Recognize(expected_version=1), cid=UUID(first["id"]))
    assert all(row.key != key for row in s.session.receipts.values())
    assert s.parent.version == 1
    before = len(s.calls)
    with pytest.raises(IdentityError, match="FINANCE_CREATION_KEY_EXPIRED"):
        s.run(key)
    assert len(s.calls) == before
    assert len(s.session.rows) == 1
    assert s.session.rows[UUID(first["id"])].version == 2


def test_unused_expired_or_legacy_missing_keys_cannot_start_creation(monkeypatch):
    s = fixture(monkeypatch)
    for key, code in ((uuid4(), "REQUIRED"), (key_at(NOW - timedelta(minutes=5)), "EXPIRED")):
        with pytest.raises(IdentityError, match=f"FINANCE_CREATION_KEY_{code}"):
            s.run(key)
    assert not s.calls and not s.session.rows
    assert s.run(key_at(NOW))["version"] == 1


def test_retained_legacy_receipt_remains_authorized_replay_without_key_upgrade(monkeypatch):
    s = fixture(monkeypatch)
    key, cid = uuid4(), uuid4()
    s.session.rows[cid] = SimpleNamespace(id=cid, version=3)
    route = f"NewCommission/{s.parent.id}/"
    digest = keyed_digest(
        SECRET,
        "finance-command",
        json.dumps(s.body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")),
    )
    s.session.add(
        FinanceReceipt(
            actor_id=s.identity.user.id,
            route=route,
            key=key,
            commission_id=cid,
            request_hash=digest,
            result={"id": str(cid), "version": 1},
        )
    )
    assert s.run(key) == {"id": str(cid), "version": 1}
    assert not s.calls
    s.identity.user.role = "agent"
    s.session.events.clear()
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        s.run(key)
    assert not any(name in {"deal", "receipt", "prune"} for name, _ in s.session.events)


def test_current_archive_guard_precedes_retained_key_replay(monkeypatch):
    s = fixture(monkeypatch)
    key = key_at(NOW)
    s.run(key)
    s.parent.archived = True
    with pytest.raises(IdentityError, match="RECORD_ARCHIVED"):
        s.run(key)
    assert len(s.calls) == 1


def test_creation_key_is_evaluated_after_wait_and_current_identity_refresh(monkeypatch):
    s = fixture(monkeypatch)
    key = key_at(NOW)
    original = commands.current_identity
    reads = 0

    def after_wait(*args):
        nonlocal reads
        reads += 1
        if reads == 2:
            s.clock.value += timedelta(minutes=6)
        return original(*args)

    monkeypatch.setattr(commands, "current_identity", after_wait)
    with pytest.raises(IdentityError, match="FINANCE_CREATION_KEY_EXPIRED"):
        s.run(key)
    assert reads == 2 and not s.calls and not s.session.rows


def test_role_loss_after_wait_precedes_even_invalid_key_validation(monkeypatch):
    s = fixture(monkeypatch)
    original = commands.current_identity
    reads = 0

    def revoked(*args):
        nonlocal reads
        reads += 1
        if reads == 2:
            s.identity.user.role = "agent"
        return original(*args)

    monkeypatch.setattr(commands, "current_identity", revoked)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        s.run(uuid4())
    assert not s.calls
    assert not any(name in {"deal", "receipt", "prune"} for name, _ in s.session.events)


def test_issued_key_does_not_grant_write_after_parent_archive(monkeypatch):
    s = fixture(monkeypatch)
    key = key_at(NOW)
    monkeypatch.setattr(creation_keys, "uuid7", lambda: key)
    assert creation_keys.issue_creation_key(s.database, "synthetic-proof", s.parent.id)["key"]
    s.parent.archived = True
    with pytest.raises(IdentityError, match="RECORD_ARCHIVED"):
        s.run(key)
    assert not s.calls


def test_pruned_legacy_key_cannot_restart_a_known_creation(monkeypatch):
    s = fixture(monkeypatch)
    key = uuid4()
    cid = uuid4()
    s.session.rows[cid] = SimpleNamespace(id=cid, version=1)
    s.session.add(
        FinanceReceipt(
            actor_id=s.identity.user.id,
            route=f"NewCommission/{s.parent.id}/",
            key=key,
            commission_id=cid,
            request_hash=b"x" * 32,
            result={"id": str(cid), "version": 1},
        )
    )
    s.clock.value += timedelta(hours=25)
    s.run(uuid4(), Recognize(expected_version=1), cid=cid)
    assert all(row.key != key for row in s.session.receipts.values())
    before = len(s.calls)
    with pytest.raises(IdentityError, match="FINANCE_CREATION_KEY_REQUIRED"):
        s.run(key)
    assert len(s.calls) == before and len(s.session.rows) == 1


def test_creation_key_http_contract_is_read_only_strict_and_current_scoped(monkeypatch):
    s = fixture(monkeypatch)
    monkeypatch.setattr(routes, "configuration", lambda _: (s.database, SECRET))
    application = FastAPI()
    application.include_router(routes.router)
    application.dependency_overrides[facade_authority] = lambda: None
    application.dependency_overrides[session_proof] = lambda: "synthetic-proof"

    @application.exception_handler(IdentityError)
    async def failure(_request, error):
        return JSONResponse({"error": {"code": error.code}}, status_code=error.status)

    with TestClient(application) as client:
        url = f"/api/v1/deals/{s.parent.id}/commission-creation-key"
        response = client.get(url)
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
        assert client.get(url + "?page=1").status_code == 422
        assert client.post(url).status_code == 405
        s.identity.user.role = "agent"
        assert client.get(url).status_code == 403
    assert not s.calls and not s.session.rows
