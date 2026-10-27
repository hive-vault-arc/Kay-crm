"""Connection-forbidden audit attribution lookup and existing audit-read boundaries."""

from contextlib import nullcontext
from datetime import UTC, date, datetime
from types import SimpleNamespace
from typing import get_args, get_type_hints
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql.elements import TextClause
from starlette.datastructures import QueryParams

from app.discovery import audit, router
from app.discovery.contracts import AuditActorsQuery, AuditQuery
from app.identity.security import IdentityError


class Rows:
    def __init__(self, rows):
        self.rows = rows

    def mappings(self):
        return self.rows

    def all(self):
        return self.rows


class Session:
    def __init__(self, rows=(), total=0):
        self.rows, self.total = rows, total
        self.statements = []

    def record(self, statement):
        compiled = statement.compile(dialect=postgresql.dialect())
        sql = str(compiled)
        assert not sql.lstrip().startswith(("INSERT", "UPDATE", "DELETE", "ALTER"))
        self.statements.append((statement, sql, compiled.params))

    def execute(self, statement):
        self.record(statement)
        return Rows(()) if isinstance(statement, TextClause) else Rows(self.rows)

    def scalar(self, statement):
        self.record(statement)
        return self.total


def database(session):
    return SimpleNamespace(session=lambda: nullcontext(session))


@pytest.mark.parametrize("role", ["agent", "manager", "administrator", "unknown"])
def test_audit_choices_recheck_real_role_before_names_counts_or_pages(monkeypatch, role):
    uid = uuid4()
    session = Session(
        [{"kind": "user", "id": uid, "display_name": "Synthetic retained actor"}], total=7
    )
    monkeypatch.setattr(
        audit, "current_identity", lambda *_: SimpleNamespace(user=SimpleNamespace(role=role))
    )
    query = AuditActorsQuery(page=2, page_size=5)
    if role in {"agent", "unknown"}:
        with pytest.raises(IdentityError, match="FORBIDDEN"):
            audit.read_audit_actors(database(session), "synthetic", query)
        assert len(session.statements) == 1
    else:
        result = audit.read_audit_actors(database(session), "synthetic", query)
        assert result["items"] == [
            {"kind": "user", "id": str(uid), "display_name": "Synthetic retained actor"}
        ]
        assert result["total"] == 7 and result["page"] == 2 and result["page_size"] == 5
        assert result["has_previous"] and not result["has_next"]
    assert session.statements[0][1] == (
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"
    )


@pytest.mark.parametrize(
    "payload",
    [
        {"page": 0},
        {"page": 1000001},
        {"page_size": 0},
        {"page_size": 101},
        {"q": "x" * 161},
        {"actor_id": str(uuid4())},
        {"role": "administrator"},
        {"family": "security"},
        {"website_source_id": str(uuid4())},
        {"unattributed_actor": "true"},
    ],
)
def test_audit_choice_query_is_closed_and_bounded(payload):
    with pytest.raises(ValidationError):
        AuditActorsQuery.model_validate(payload)


def test_current_session_failure_precedes_audit_choice_match_queries(monkeypatch):
    session = Session()

    def denied(*_):
        raise IdentityError("UNAUTHENTICATED", 401)

    monkeypatch.setattr(audit, "current_identity", denied)
    with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
        audit.read_audit_actors(database(session), "synthetic", AuditActorsQuery())
    assert len(session.statements) == 1


def test_actual_choice_sql_uses_correlated_history_before_count_and_page_not_staff_state(
    monkeypatch,
):
    session = Session()
    monkeypatch.setattr(
        audit,
        "current_identity",
        lambda *_: SimpleNamespace(user=SimpleNamespace(role="manager")),
    )
    audit.read_audit_actors(
        database(session), "synthetic", AuditActorsQuery(q="  %_\\  ", page=3, page_size=5)
    )
    _, count_sql, count_params = session.statements[1]
    row_statement, row_sql, row_params = session.statements[2]
    for sql, params in [(count_sql, count_params), (row_sql, row_params)]:
        assert 'audit_event.actor_user_id = "user".id' in sql
        assert "EXISTS" in sql and "UNION ALL" in sql and " JOIN " not in sql
        assert " ILIKE " in sql and "ESCAPE" in sql
        assert r"%\%\_\\%" in params.values()
        assert '"user".state' not in sql and '"user".deleted_at' not in sql
        assert '"user".email' not in sql and "password" not in sql
        assert "target_user_id" not in sql and "key_digest" not in sql
        assert "audit_event.website_source_id = website_source.id" in sql
        assert "audit_event.actor_user_id IS NULL" in sql
        assert "audit_event.website_source_id IS NULL" in sql
        assert {
            "user",
            "website",
            "unattributed",
            "Auteur non renseigné",
            "Source web : ",
        }.issubset(params.values())
    assert list(row_statement.selected_columns.keys()) == ["kind", "id", "display_name"]
    assert "LIMIT" not in count_sql and "OFFSET" not in count_sql
    assert "ORDER BY lower(anon_1.display_name), anon_1.kind, anon_1.id" in row_sql
    assert 5 in row_params.values() and 10 in row_params.values()


@pytest.mark.parametrize(
    "payload",
    [
        {"actor_id": uuid4(), "website_source_id": uuid4()},
        {"actor_id": uuid4(), "unattributed_actor": "true"},
        {"website_source_id": uuid4(), "unattributed_actor": "true"},
        {"unattributed_actor": "false"},
        {"unattributed_actor": "TRUE"},
    ],
)
def test_event_filters_require_one_exact_typed_actor(payload):
    with pytest.raises(ValidationError):
        AuditQuery.model_validate(payload)


@pytest.mark.parametrize("kind", ["user", "website", "unattributed"])
@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
def test_typed_actor_event_filter_only_narrows_the_existing_authorized_audit(
    monkeypatch, kind, role
):
    uid = uuid4()
    payload = (
        {"actor_id": uid}
        if kind == "user"
        else ({"website_source_id": uid} if kind == "website" else {"unattributed_actor": "true"})
    )
    session = Session()
    monkeypatch.setattr(
        audit, "current_identity", lambda *_: SimpleNamespace(user=SimpleNamespace(role=role))
    )
    if role == "agent":
        with pytest.raises(IdentityError, match="FORBIDDEN"):
            audit.read_audit(database(session), "synthetic", AuditQuery.model_validate(payload))
        assert len(session.statements) == 1
        return
    audit.read_audit(database(session), "synthetic", AuditQuery.model_validate(payload))
    for _, sql, params in session.statements[1:]:
        if kind == "user":
            assert "audit_event.actor_user_id =" in sql and uid in params.values()
        elif kind == "website":
            assert "audit_event.website_source_id =" in sql and uid in params.values()
            assert "audit_event.actor_user_id IS NULL" in sql
        else:
            assert "audit_event.actor_user_id IS NULL" in sql
            assert "audit_event.website_source_id IS NULL" in sql


def test_unattributed_choice_has_no_fabricated_user_id_and_uses_the_same_complete_total(
    monkeypatch,
):
    session = Session(
        [{"kind": "unattributed", "id": None, "display_name": "Auteur non renseigné"}], total=1
    )
    monkeypatch.setattr(
        audit, "current_identity", lambda *_: SimpleNamespace(user=SimpleNamespace(role="manager"))
    )
    result = audit.read_audit_actors(database(session), "synthetic", AuditActorsQuery())
    assert result["items"] == [
        {"kind": "unattributed", "id": None, "display_name": "Auteur non renseigné"}
    ]
    assert result["total"] == 1


def test_existing_audit_query_preserves_casablanca_actor_family_and_safe_target_shape(monkeypatch):
    uid, cid = uuid4(), uuid4()
    event = SimpleNamespace(
        id=uuid4(),
        action="identity.login",
        actor_user_id=uid,
        target_user_id=None,
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
        **{
            kind + "_id": cid if kind == "contact" else None
            for kind in ("contact", "enquiry", "property", "development", "offering", "deal")
        },
    )
    session = Session([(event, "Synthetic actor")], total=1)
    monkeypatch.setattr(
        audit,
        "current_identity",
        lambda *_: SimpleNamespace(user=SimpleNamespace(role="administrator")),
    )
    result = audit.read_audit(
        database(session),
        "synthetic",
        AuditQuery(
            family="security", actor_id=uid, start_on=date(2026, 1, 1), end_on=date(2026, 1, 2)
        ),
    )
    item = result["items"][0]
    assert set(item) == {
        "id",
        "action",
        "actor_id",
        "actor_name",
        "created_at",
        "target_user_id",
        "targets",
    }
    assert item["targets"] == {"contact": str(cid)}
    _, sql, params = session.statements[2]
    assert "coalesce" in sql
    assert {"Auteur non renseigné", "Source web : ", "identity.%", "users.%", uid}.issubset(
        params.values()
    )
    assert datetime(2025, 12, 31, 23, tzinfo=UTC) in params.values()
    assert datetime(2026, 1, 2, 23, tzinfo=UTC) in params.values()
    assert "audit_event.created_at >=" in sql and "audit_event.created_at <" in sql


def test_actual_actor_route_binds_the_closed_query_and_refuses_unknown_or_duplicated_keys(
    monkeypatch,
):
    annotation = get_type_hints(router.audit_actors, include_extras=True)["query"]
    assert get_args(annotation)[0] is AuditActorsQuery
    calls = []
    monkeypatch.setattr(router, "configuration", lambda _: (None, None))
    monkeypatch.setattr(
        router,
        "read_audit_actors",
        lambda _db, token, query: calls.append((token, query)) or {},
    )
    router.audit_actors(
        SimpleNamespace(query_params=QueryParams("q=Synthetic&page_size=5")),
        "synthetic",
        AuditActorsQuery(q="Synthetic", page_size=5),
    )
    assert len(calls) == 1 and calls[0][1].q == "Synthetic"
    for params in ("q=x&q=y", "q=x&role=manager", "family=security", "actor_id=" + str(uuid4())):
        with pytest.raises(IdentityError, match="VALIDATION_ERROR"):
            router.audit_actors(
                SimpleNamespace(query_params=QueryParams(params)),
                "synthetic",
                AuditActorsQuery(),
            )
    assert len(calls) == 1
