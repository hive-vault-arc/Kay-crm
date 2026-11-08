"""Connection-forbidden contact directory SQL, strict transport and export replay."""

import hashlib
import json
from contextlib import contextmanager, nullcontext
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.dialects import postgresql

from app.contacts import directory, queries, router
from app.contacts.access import contact_scope
from app.contacts.contracts import ListQuery
from app.contacts.models import Contact
from app.discovery import exports
from app.discovery.contracts import NewExport
from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError


def identity(role="agent"):
    return SimpleNamespace(user=SimpleNamespace(id=uuid4(), role=role))


def sql(statement):
    return str(statement.compile(dialect=postgresql.dialect()))


@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
def test_scoped_link_filters_count_same_nonarchived_dossiers_as_contact_detail(role):
    who = identity(role)
    for linked in ("enquiries", "deals", "none"):
        statement = directory.filter_contacts(
            select(Contact).where(contact_scope(who)), who, ListQuery(linked=linked)
        )
        rendered = sql(statement)
        if linked != "deals":
            assert "enquiry.archived_at IS NULL" in rendered
            assert "enquiry.status !=" in rendered
            assert ("enquiry.assigned_agent_id IS NOT NULL" in rendered) == (role == "agent")
        if linked != "enquiries":
            assert "deal.archived_at IS NULL" in rendered
        assert "property_owner" not in rendered
        assert ("contact_collaborator" in rendered) == (role == "agent")
        assert ("enquiry.contact_id = contact.id" in rendered) == (linked != "deals")


def test_created_dates_are_casablanca_civil_boundaries_and_max_date_does_not_overflow():
    query = ListQuery(created_from="2026-01-02", created_to="2026-01-02", role="owner")
    statement = directory.filter_contacts(select(Contact), identity(), query)
    compiled = statement.compile(dialect=postgresql.dialect())
    values = list(compiled.params.values())
    assert datetime(2026, 1, 1, 23, tzinfo=UTC) in values
    assert datetime(2026, 1, 2, 23, tzinfo=UTC) in values
    assert "contact_role.role =" in str(compiled)
    directory.filter_contacts(select(Contact), identity(), ListQuery(created_to="9999-12-31"))
    with pytest.raises(ValidationError):
        ListQuery(created_from="2030-06-02", created_to="2030-06-01")


@pytest.mark.parametrize(
    "kind,values",
    [
        ("contacts", {"sort": "-received_at"}),
        ("contacts", {"rating": "hot"}),
        ("enquiries", {"sort": "-created_at"}),
        ("enquiries", {"primary_agent_id": uuid4()}),
        ("enquiries", {"linked": "none"}),
        ("enquiries", {"role": "owner"}),
        ("enquiries", {"created_from": "2030-01-01"}),
        ("enquiries", {"linked": None}),
    ],
)
def test_incompatible_filters_fail_on_both_list_and_export(kind, values):
    with pytest.raises(IdentityError) as denied:
        queries.list_in_session(None, identity(), kind, ListQuery(**values))
    assert denied.value.code == "VALIDATION_ERROR"
    with pytest.raises(ValidationError):
        NewExport(kind=kind, filters=values)


class Session:
    def __init__(self, rows=(), counts=()):
        self.statements, self.rows, self.counts = [], rows, counts

    def execute(self, statement):
        self.statements.append(statement)
        return self.counts

    def scalar(self, statement):
        self.statements.append(statement)
        return 21

    def scalars(self, statement):
        self.statements.append(statement)
        return SimpleNamespace(all=lambda: self.rows)


class Database:
    def __init__(self, session):
        self.connection = session

    @contextmanager
    def session(self):
        yield self.connection


@pytest.mark.parametrize("enabled", [False, True])
def test_real_list_filters_before_total_and_page_counts_only_selected_ids(monkeypatch, enabled):
    who, cid, aid = identity(), uuid4(), uuid4()
    session = Session([SimpleNamespace(id=cid)], [(cid, 2, 1)])
    monkeypatch.setattr(queries, "contact_views", lambda *_a: {cid: {"id": str(cid)}})
    result = queries.list_in_session(
        session,
        who,
        "contacts",
        ListQuery(
            primary_agent_id=aid,
            linked="deals",
            role="buyer",
            created_from="2030-01-01",
            sort="-created_at",
            page=2,
            page_size=20,
        ),
        directory_enabled=enabled,
    )
    for statement in session.statements[:2]:
        rendered = sql(statement)
        assert "contact.primary_agent_id =" in rendered and "contact_collaborator" in rendered
        assert "contact_role" in rendered and "deal.archived_at IS NULL" in rendered
        assert "contact.created_at >=" in rendered
    page = sql(session.statements[1])
    assert "ORDER BY contact.created_at DESC, contact.id" in page and "OFFSET" in page
    assert result["total"] == 21 and result["has_previous"] and not result["has_next"]
    assert ("directory_supported" in result) == enabled
    assert ("dossier_counts" in result["items"][0]) == enabled
    if enabled:
        assert result["items"][0]["dossier_counts"] == {"enquiries": 2, "deals": 1}
        assert "contact.id IN" in sql(session.statements[2])
        assert "contact_collaborator" in sql(session.statements[2])


def test_empty_deep_page_keeps_total_without_counting_other_contacts(monkeypatch):
    monkeypatch.setattr(queries, "contact_views", lambda *_a: {})
    session = Session()
    result = queries.list_in_session(
        session, identity(), "contacts", ListQuery(page=5), directory_enabled=True
    )
    assert result["items"] == [] and result["total"] == 21
    assert len(session.statements) == 2


@pytest.mark.parametrize("role", ["agent", "manager"])
def test_responsible_choices_use_current_readable_contacts_not_active_assignability(
    monkeypatch, role
):
    who, user = (
        identity(role),
        SimpleNamespace(id=uuid4(), display_name="Ancien responsable synthétique"),
    )
    session = Session([user])
    monkeypatch.setattr(queries, "current_identity", lambda *_a: who)
    result = queries.responsible_options(Database(session), "synthetic", ListQuery(q="%_", page=2))
    rendered = sql(session.statements[-1])
    assert "contact.merged_into_contact_id IS NULL" in rendered
    assert ("contact.archived_at IS NULL" in rendered) == (role == "agent")
    assert ("contact_collaborator" in rendered) == (role == "agent")
    assert "credential" not in rendered and '"user".state =' not in rendered
    assert "ESCAPE" in rendered and "OFFSET" in rendered
    assert result["items"] == [{"id": str(user.id), "display_name": user.display_name}]


def test_old_export_payload_hash_is_preserved_and_new_filter_changes_identity():
    body = NewExport(kind="contacts", filters={"q": "synthetic"})
    new_keys = {"primary_agent_id", "linked", "role", "created_from", "created_to"}
    legacy = body.model_dump(mode="json")
    legacy["filters"] = {
        key: value for key, value in legacy["filters"].items() if key not in new_keys
    }
    assert exports.export_payload(body) == legacy

    def digest(value):
        return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).digest()

    assert digest(exports.export_payload(body)) == digest(legacy)
    extended = NewExport(kind="contacts", filters={"q": "synthetic", "linked": "none"})
    assert digest(exports.export_payload(extended)) != digest(legacy)
    assert NewExport.model_validate(exports.export_payload(body)).filters.q == "synthetic"


def test_real_export_request_replays_pre_extension_receipt_and_rejects_changed_filters(monkeypatch):
    body, key = NewExport(kind="contacts", filters={"q": "synthetic"}), uuid4()
    previous = SimpleNamespace(
        id=uuid4(),
        kind="contacts",
        state="queued",
        error_code=None,
        row_count=None,
        size_bytes=None,
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
        completed_at=None,
        request_hash=hashlib.sha256(
            json.dumps(exports.export_payload(body), sort_keys=True).encode()
        ).digest(),
    )
    session = SimpleNamespace(begin=nullcontext, scalar=lambda _q: previous)
    monkeypatch.setattr(exports, "authorized", lambda *_a, **_kw: identity("manager"))
    assert exports.request_export(Database(session), "synthetic", key, body) == exports.summary(
        previous
    )
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        exports.request_export(
            Database(session),
            "synthetic",
            key,
            NewExport(kind="contacts", filters={"q": "synthetic", "linked": "none"}),
        )


def client(monkeypatch):
    app = FastAPI()
    app.include_router(router.router)
    app.dependency_overrides[facade_authority] = lambda: None
    app.dependency_overrides[session_proof] = lambda: "synthetic"
    app.add_exception_handler(
        IdentityError,
        lambda _req, error: JSONResponse({"error": error.code}, status_code=error.status),
    )
    monkeypatch.setattr(router, "configuration", lambda _request: (None, "synthetic"))
    return TestClient(app)


def test_router_opt_in_is_exact_and_responsible_route_is_get_only(monkeypatch):
    observed = []
    monkeypatch.setattr(router, "read_list", lambda *_a, **kw: observed.append(kw) or {})
    monkeypatch.setattr(router, "responsible_options", lambda *_a: {"items": []})
    with client(monkeypatch) as api:
        for header, expected in [(None, False), ("0", False), ("true", False), ("1", True)]:
            assert (
                api.get(
                    "/api/v1/contacts",
                    headers={"X-Kay-Contact-Directory": header} if header else {},
                ).status_code
                == 200
            )
            assert observed[-1] == {"directory_enabled": expected}
        assert api.get("/api/v1/contacts/responsible-options?q=synthétique").status_code == 200
        for query in ("q=a&q=b", "archive=all", "primary_agent_id=" + str(uuid4()), "page=0"):
            assert api.get("/api/v1/contacts/responsible-options?" + query).status_code == 422
        assert api.post("/api/v1/contacts/responsible-options").status_code == 405
