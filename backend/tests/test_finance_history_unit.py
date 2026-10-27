"""Scoped financial collection history and query shape, without a database/listener."""

from contextlib import contextmanager
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from sqlalchemy.dialects import postgresql

from app.finance import queries, records
from app.finance import router as routes
from app.finance.contracts import FinanceQuery
from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError


class Session:
    def __init__(self, rows):
        self.rows, self.total, self.calls = rows, len(rows), []

    @contextmanager
    def begin(self):
        yield

    def execute(self, statement):
        self.calls.append(("isolation", statement))

    def scalar(self, statement):
        self.calls.append(("count", statement))
        return self.total

    def scalars(self, statement):
        self.calls.append(("page", statement))
        return self.rows


class Database:
    def __init__(self, session):
        self.resource = session

    @contextmanager
    def session(self):
        yield self.resource


def fixture(monkeypatch, role="manager"):
    actor = uuid4()
    rows = [
        SimpleNamespace(
            id=uuid4(),
            commission_id=uuid4(),
            version=number,
            previous_revision_id=uuid4() if number > 1 else None,
            kind="percentage",
            base_mad=Decimal("10.05000000"),
            rate_percent=Decimal("10.00000000"),
            amount_mad=Decimal("1.01"),
            due_on=None,
            state="recognized",
            review_required=number > 1,
            action="reopen_review" if number > 1 else "recognized",
            reason="Synthetic retained reason",
            actor_user_id=actor,
            actor_name="Synthetic retained actor",
            receipt_id=uuid4(),
            reopening_id=uuid4() if number > 1 else None,
            created_at=datetime(2026, 10, 20, 12, tzinfo=UTC),
        )
        for number in [2, 1]
    ]
    session = Session(rows)
    identity = SimpleNamespace(user=SimpleNamespace(id=uuid4(), role=role))
    lookups = []
    deal = SimpleNamespace(id=uuid4(), archived_at=None)
    monkeypatch.setattr(queries, "current_identity", lambda *_: identity)

    def authorized(_session, current, did):
        lookups.append((current, did))
        return deal

    monkeypatch.setattr(records, "deal_authorized", authorized)
    return Database(session), session, deal, rows, identity, lookups


@pytest.mark.parametrize("role", ["manager", "administrator"])
def test_deal_history_scopes_counts_and_rows_before_projection(monkeypatch, role):
    database, session, deal, rows, identity, lookups = fixture(monkeypatch, role)
    result = queries.read(database, "synthetic-proof", deal.id, FinanceQuery(), "deal_history")
    assert lookups == [(identity, deal.id)]
    assert len(result["items"]) == 2
    assert len({item["commission_id"] for item in result["items"]}) == 2
    for item, row in zip(result["items"], rows, strict=True):
        assert item == queries.revision_view(row) | {
            "commission_id": str(row.commission_id),
            "deal_id": str(deal.id),
        }
        assert item["actor"]["id"] != str(identity.user.id)
        assert item["actor"]["display_name"] == "Synthetic retained actor"
        assert item["base_mad"] == "10.05000000"
        assert item["amount_mad"] == "1.01"
        assert item["reason"] == "Synthetic retained reason"
        assert datetime.fromisoformat(item["created_local"]).astimezone(UTC) == row.created_at
    assert [kind for kind, _ in session.calls] == ["isolation", "count", "page"]
    for _, statement in session.calls[1:]:
        compiled = statement.compile(dialect=postgresql.dialect())
        assert "commission.id = commission_revision.commission_id" in str(compiled)
        assert "commission.deal_id =" in str(compiled)
        assert deal.id in compiled.params.values()
    assert "commission_id" not in queries.revision_view(rows[0])
    assert "deal_id" not in queries.revision_view(rows[0])


def test_projection_uses_authoritative_zone_without_changing_the_retained_instant(monkeypatch):
    _, _, _, rows, _, _ = fixture(monkeypatch)
    monkeypatch.setattr(queries, "ZONE", timezone(timedelta(hours=1)))
    projected = queries.revision_view(rows[0])
    assert projected["created_at"] == "2026-10-20T12:00:00+00:00"
    assert projected["created_local"] == "2026-10-20T13:00:00+01:00"


def test_history_numbered_sql_is_bounded_stable_and_does_not_mutate_or_filter_originals(
    monkeypatch,
):
    database, session, deal, _, _, _ = fixture(monkeypatch)
    session.total = 25
    queries.read(
        database, "synthetic-proof", deal.id, FinanceQuery(page=3, page_size=7), "deal_history"
    )
    compiled = session.calls[-1][1].compile(dialect=postgresql.dialect())
    sql = str(compiled)
    assert "commission_revision.created_at DESC, commission_revision.id DESC" in sql
    assert "LIMIT" in sql and "OFFSET" in sql
    assert 7 in compiled.params.values() and 14 in compiled.params.values()
    assert "review_required =" not in sql and "state =" not in sql
    assert "UPDATE" not in sql and "FOR UPDATE" not in sql
    session.rows, session.total = [], 0
    result = queries.read(
        database, "synthetic-proof", deal.id, FinanceQuery(page=3), "deal_history"
    )
    assert result == {
        "items": [],
        "total": 0,
        "page": 3,
        "page_size": 50,
        "has_next": False,
        "has_previous": True,
    }


def test_agent_denial_precedes_any_deal_lookup_count_or_financial_page(monkeypatch):
    database, session, _, _, _, lookups = fixture(monkeypatch, "agent")
    with pytest.raises(IdentityError) as captured:
        queries.read(database, "synthetic-proof", uuid4(), FinanceQuery(), "deal_history")
    assert captured.value.code == "FORBIDDEN"
    assert captured.value.status == 403
    assert lookups == []
    assert [kind for kind, _ in session.calls] == ["isolation"]


def test_current_scope_denial_precedes_history_count_and_page(monkeypatch):
    database, session, deal, _, _, _ = fixture(monkeypatch)

    def denied(*_):
        raise IdentityError("NOT_FOUND", 404)

    monkeypatch.setattr(records, "deal_authorized", denied)
    with pytest.raises(IdentityError) as captured:
        queries.read(database, "synthetic-proof", deal.id, FinanceQuery(), "deal_history")
    assert captured.value.status == 404
    assert [kind for kind, _ in session.calls] == ["isolation"]


def test_new_history_route_is_read_only_and_preserves_closed_numbered_query_contract(monkeypatch):
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[facade_authority] = lambda: None
    app.dependency_overrides[session_proof] = lambda: "synthetic-proof"
    monkeypatch.setattr(routes, "configuration", lambda _: (object(), object()))
    calls = []
    monkeypatch.setattr(routes, "read", lambda *args: calls.append(args) or {"items": []})

    @app.exception_handler(IdentityError)
    async def rejected(_request, error):
        return JSONResponse({"error": {"code": error.code}}, status_code=error.status)

    did = uuid4()
    with TestClient(app) as client:
        route = f"/api/v1/deals/{did}/finance-history"
        assert client.get(f"{route}?page=2&page_size=20").status_code == 200
        assert calls[0][1] == "synthetic-proof" and calls[0][2] == did
        assert calls[0][3] == FinanceQuery(page=2, page_size=20)
        assert calls[0][4] == "deal_history"
        for query in ["page=0", "page_size=101", "page=1&page=2", "role=agent", "deal_id=other"]:
            assert client.get(f"{route}?{query}").status_code == 422
        assert client.post(route, json={}).status_code == 405
        assert len(calls) == 1
