"""Opt-in creator projection on an already scoped page; no database connection."""

from contextlib import contextmanager
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from sqlalchemy.dialects import postgresql

from app.generated import router as routes
from app.generated import service
from app.generated.visibility import visible_template_codes
from app.identity.models import User
from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError


class Rows:
    def __init__(self, values):
        self.values = values

    def all(self):
        return self.values


class Session:
    def __init__(self, documents, creators):
        self.documents = documents
        self.creators = creators
        self.calls = []

    def scalar(self, statement):
        self.calls.append(statement)
        return len(self.documents)

    def scalars(self, statement):
        self.calls.append(statement)
        return Rows(
            self.creators if statement.column_descriptions[0]["entity"] is User else self.documents
        )


class Database:
    def __init__(self, session):
        self.resource = session

    @contextmanager
    def session(self):
        yield self.resource


def fixture(monkeypatch, role="agent", documents=None, creators=None):
    agency = uuid4()
    creator = SimpleNamespace(
        id=uuid4(), agency_id=agency, display_name="Synthetic retained creator"
    )
    rows = (
        documents
        if documents is not None
        else [SimpleNamespace(id=uuid4(), created_by_user_id=creator.id)]
    )
    session = Session(rows, creators if creators is not None else [creator])
    identity = SimpleNamespace(user=SimpleNamespace(id=uuid4(), agency_id=agency, role=role))
    events = []
    monkeypatch.setattr(service, "current_identity", lambda *_: identity)
    monkeypatch.setattr(service, "authorize", lambda *_: events.append("authorized"))
    monkeypatch.setattr(
        service, "_row", lambda _, row: {"id": str(row.id), "filename": "synthetic.pdf"}
    )
    return Database(session), session, identity, creator, events


@pytest.mark.parametrize("kind", ["enquiry", "deal"])
def test_legacy_history_has_no_new_fields_or_creator_lookup(monkeypatch, kind):
    database, session, _, _, events = fixture(monkeypatch)
    result = service.history(database, "synthetic-proof", kind, uuid4(), 1)
    assert events == ["authorized"]
    assert result["items"][0].keys() == {"id", "filename"}
    assert len(session.calls) == 2


@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
def test_opt_in_reads_only_filtered_page_creators_in_the_current_agency(monkeypatch, role):
    database, session, identity, creator, events = fixture(monkeypatch, role)
    session.documents.append(SimpleNamespace(id=uuid4(), created_by_user_id=creator.id))
    parent = uuid4()
    result = service.history(database, "synthetic-proof", "enquiry", parent, 2, include_actor=True)
    assert events == ["authorized"]
    assert result["page"] == 2
    assert result["page_size"] == 20
    assert result["total"] == 2
    assert result["has_previous"] is True
    assert result["items"][0]["actor"] == {
        "id": str(creator.id),
        "display_name": creator.display_name,
    }
    assert result["items"][1]["actor"] == result["items"][0]["actor"]
    document_query = session.calls[1].compile(dialect=postgresql.dialect())
    assert "document.enquiry_id" in str(document_query)
    assert "document.archived_at IS NULL" in str(document_query)
    assert "document.template_code IN" in str(document_query)
    assert parent in document_query.params.values()
    assert list(visible_template_codes(role)) in document_query.params.values()
    creator_query = session.calls[2].compile(dialect=postgresql.dialect())
    assert '"user".agency_id' in str(creator_query)
    assert identity.user.agency_id in creator_query.params.values()
    assert [creator.id] in creator_query.params.values()
    assert "deleted_at" not in str(creator_query).partition("WHERE")[2]
    assert "state" not in str(creator_query).partition("WHERE")[2]
    assert len(session.calls) == 3


def test_denial_precedes_history_counts_and_creator_lookup(monkeypatch):
    database, session, _, _, _ = fixture(monkeypatch)

    def denied(*_):
        raise IdentityError("NOT_FOUND", 404)

    monkeypatch.setattr(service, "authorize", denied)
    with pytest.raises(IdentityError) as captured:
        service.history(database, "synthetic-proof", "deal", uuid4(), 1, include_actor=True)
    assert captured.value.code == "NOT_FOUND"
    assert session.calls == []


def test_missing_creator_fails_closed_and_an_empty_page_needs_no_profile_query(monkeypatch):
    database, session, _, _, _ = fixture(monkeypatch, creators=[])
    with pytest.raises(IdentityError) as captured:
        service.history(database, "synthetic-proof", "deal", uuid4(), 1, include_actor=True)
    assert captured.value.code == "DEPENDENCY_UNAVAILABLE"
    assert len(session.calls) == 3
    database, session, _, _, _ = fixture(monkeypatch, documents=[])
    assert (
        service.history(database, "synthetic-proof", "deal", uuid4(), 1, include_actor=True)[
            "items"
        ]
        == []
    )
    assert len(session.calls) == 2


def test_actor_flag_is_explicit_and_only_supported_on_history_reads(monkeypatch):
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[facade_authority] = lambda: None
    app.dependency_overrides[session_proof] = lambda: "synthetic-proof"
    calls = []
    monkeypatch.setattr(routes, "resources", lambda _: (object(), object()))

    def history(*args, **kwargs):
        calls.append((args, kwargs))
        return {"items": []}

    monkeypatch.setattr(routes, "history", history)

    @app.exception_handler(IdentityError)
    async def rejected(_request, error):
        return JSONResponse({"error": {"code": error.code}}, status_code=422)

    with TestClient(app) as client:
        query = f"parent_kind=deal&parent_id={uuid4()}"
        assert client.get(f"/api/v1/generated-documents?{query}").status_code == 200
        assert calls[-1][1] == {"include_actor": False}
        assert (
            client.get(f"/api/v1/generated-documents?{query}&include_actor=true").status_code == 200
        )
        assert calls[-1][1] == {"include_actor": True}
        for suffix in [
            "include_actor=false",
            "include_actor=1",
            "include_actor=true&include_actor=true",
        ]:
            assert client.get(f"/api/v1/generated-documents?{query}&{suffix}").status_code == 422
        assert (
            client.get(
                f"/api/v1/generated-documents/context?{query}&include_actor=true"
            ).status_code
            == 422
        )
        assert len(calls) == 2
