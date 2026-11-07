"""Scoped directory filters only: compiled SQL, stub reads and in-process transport."""

from contextlib import contextmanager
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql

from app.contacts import queries as contacts
from app.contacts import router
from app.contacts.contracts import ListQuery, NewEnquiry
from app.deals import queries as deals
from app.deals.contracts import DealQuery
from app.discovery.contracts import NewExport
from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError
from tests.contact_support import new_lead


def identity(role="agent"):
    return SimpleNamespace(user=SimpleNamespace(role=role, id=uuid4()))


def compile_query(statement):
    return statement.compile(dialect=postgresql.dialect())


class Session:
    def __init__(self):
        self.statements = []
        self.distribution = [("new", 1)]

    def execute(self, statement):
        self.statements.append(statement)
        return SimpleNamespace(all=lambda: self.distribution)

    def scalar(self, statement):
        self.statements.append(statement)
        return 1

    def scalars(self, statement):
        self.statements.append(statement)
        return SimpleNamespace(all=lambda: [])


class Database:
    def __init__(self):
        self.connection = Session()

    @contextmanager
    def session(self):
        yield self.connection


def test_queue_sentinel_is_a_list_export_filter_and_never_a_write_assignee():
    assert ListQuery(assigned_agent_id="unassigned").assigned_agent_id == "unassigned"
    assert (
        NewExport(filters={"assigned_agent_id": "unassigned"}).filters.assigned_agent_id
        == "unassigned"
    )
    for value in ("none", "all", "Non attribué", "", True):
        with pytest.raises(ValidationError):
            ListQuery(assigned_agent_id=value)
    body = new_lead().model_dump(mode="json") | {"assigned_agent_id": "unassigned"}
    with pytest.raises(ValidationError) as error:
        NewEnquiry.model_validate(body)
    assert any(item["loc"] == ("assigned_agent_id",) for item in error.value.errors())
    with pytest.raises(ValidationError):
        NewExport(kind="contacts", filters={"assigned_agent_id": "unassigned"})


@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
@pytest.mark.parametrize("assignee", ["unassigned", None])
def test_queue_predicate_is_scoped_before_status_counts_and_page(monkeypatch, role, assignee):
    database, who = Database(), identity(role)
    empty_queue = role == "agent" and assignee == "unassigned"
    if empty_queue:
        database.connection.distribution = []
    monkeypatch.setattr(contacts, "current_identity", lambda *_args: who)
    monkeypatch.setattr(contacts, "enquiry_views", lambda *_args: [])
    result = contacts.read_list(
        database, "synthetic", "enquiries", ListQuery(assigned_agent_id=assignee, page=2)
    )
    statements = database.connection.statements
    # SET, status count, page, then batched Contact details.
    for statement in statements[1:3]:
        query = str(compile_query(statement))
        assert ("enquiry.assigned_agent_id IS NULL" in query) == (assignee == "unassigned")
        assert ("enquiry.assigned_agent_id IS NOT NULL" in query) == (role == "agent")
        assert ("contact_collaborator" in query) == (role == "agent")
        assert "contact.merged_into_contact_id IS NULL" in query
        assert "enquiry.archived_at IS NULL" in query
        assert "enquiry.status !=" in query
    assert result["total"] == (0 if empty_queue else 1)
    assert result["status_counts"]["new"] == result["total"]
    assert "OFFSET" in str(compile_query(statements[2]))


@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
def test_enquiry_filter_choices_use_scoped_assignees_not_contact_owner_or_active_accounts(
    monkeypatch, role
):
    database, who = Database(), identity(role)
    monkeypatch.setattr(contacts, "current_identity", lambda *_args: who)
    contacts.enquiry_assignee_options(
        database, "synthetic", ListQuery(q="%_", page=2, page_size=20)
    )
    statements = database.connection.statements
    for statement in statements[1:]:
        query = str(compile_query(statement))
        assert "SELECT enquiry.assigned_agent_id" in query
        assert "enquiry.assigned_agent_id IS NOT NULL" in query
        assert "enquiry.contact_id IN (SELECT contact.id" in query
        assert "contact.merged_into_contact_id IS NULL" in query
        assert ("contact_collaborator" in query) == (role == "agent")
        assert ("contact.archived_at IS NULL" in query) == (role == "agent")
        assert "credential" not in query and '"user".state =' not in query
    assert "ESCAPE" in str(compile_query(statements[-1]))


def test_maximum_received_date_is_inclusive_without_datetime_overflow(monkeypatch):
    database = Database()
    monkeypatch.setattr(contacts, "current_identity", lambda *_args: identity("manager"))
    monkeypatch.setattr(contacts, "enquiry_views", lambda *_args: [])
    contacts.read_list(database, "synthetic", "enquiries", ListQuery(received_to="9999-12-31"))
    assert "enquiry.received_at <" not in str(compile_query(database.connection.statements[1]))


@pytest.mark.parametrize("role", ["agent", "manager"])
def test_deal_created_and_modified_civil_ranges_precede_total_stage_counts_and_page(
    monkeypatch, role
):
    database, who = Database(), identity(role)
    monkeypatch.setattr(deals, "current_identity", lambda *_args: who)
    monkeypatch.setattr(deals, "deal_views", lambda *_args: [])
    result = deals.read_list(
        database,
        "synthetic",
        DealQuery(
            created_from="2026-01-02",
            created_to="2026-01-02",
            updated_from="2026-01-04",
            updated_to="2026-01-04",
            page=2,
            page_size=20,
            sort="-created_at",
        ),
    )
    for statement in database.connection.statements[1:]:
        compiled = compile_query(statement)
        query, values = str(compiled), list(compiled.params.values())
        assert "deal.created_at >=" in query and "deal.created_at <" in query
        assert "deal.updated_at >=" in query and "deal.updated_at <" in query
        assert ("contact_collaborator" in query) == (role == "agent")
        for instant in [
            datetime(2026, 1, 1, 23, tzinfo=UTC),
            datetime(2026, 1, 2, 23, tzinfo=UTC),
            datetime(2026, 1, 3, 23, tzinfo=UTC),
            datetime(2026, 1, 4, 23, tzinfo=UTC),
        ]:
            assert instant in values
    assert "ORDER BY deal.created_at DESC, deal.id" in str(
        compile_query(database.connection.statements[-1])
    )
    assert result["total"] == 1 and result["stage_counts"]["new"] == 1


def test_deal_date_validation_and_maximum_bound_are_independent_of_modified_period(monkeypatch):
    for values in [
        dict(created_from="2026-02-01", created_to="2026-01-01"),
        dict(updated_from="2026-02-01", updated_to="2026-01-01"),
    ]:
        with pytest.raises(ValidationError):
            DealQuery(**values)
    database = Database()
    monkeypatch.setattr(deals, "current_identity", lambda *_args: identity("manager"))
    monkeypatch.setattr(deals, "deal_views", lambda *_args: [])
    deals.read_list(
        database, "synthetic", DealQuery(created_to="9999-12-31", updated_to="9999-12-31")
    )


def test_assignee_options_transport_has_bounded_read_only_page_and_no_scope_overrides(monkeypatch):
    app, calls = FastAPI(), []
    app.include_router(router.router)
    app.dependency_overrides[facade_authority] = lambda: None
    app.dependency_overrides[session_proof] = lambda: "synthetic"
    app.add_exception_handler(
        IdentityError,
        lambda _request, error: JSONResponse({"error": error.code}, status_code=error.status),
    )
    monkeypatch.setattr(router, "configuration", lambda _request: (None, "synthetic"))
    monkeypatch.setattr(
        router, "enquiry_assignee_options", lambda *_args: calls.append(_args) or {"items": []}
    )
    with TestClient(app) as client:
        assert (
            client.get("/api/v1/enquiries/assigned-options?q=synthétique&page=2").status_code == 200
        )
        assert calls[-1][-1].page == 2
        for query in (
            "q=a&q=b",
            "assigned_agent_id=unassigned",
            "archive=all",
            "owner_directory=true",
            "page=0",
        ):
            assert client.get("/api/v1/enquiries/assigned-options?" + query).status_code == 422
        assert client.post("/api/v1/enquiries/assigned-options").status_code == 405
