"""Connection-forbidden prepared-PDF discovery and shared visibility boundaries."""

from contextlib import nullcontext
from types import SimpleNamespace
from typing import get_args, get_type_hints
from uuid import uuid4

import pytest
from pydantic import TypeAdapter, ValidationError
from sqlalchemy.dialects import postgresql
from starlette.datastructures import QueryParams

from app.discovery import router as discovery_routes
from app.discovery import search as discovery
from app.discovery.contracts import SearchQuery
from app.files import service as files
from app.generated import service as generated
from app.generated.catalog import TEMPLATES
from app.generated.visibility import visible_template_codes
from app.identity.security import IdentityError


def identity(role="agent"):
    return SimpleNamespace(user=SimpleNamespace(id=uuid4(), role=role))


def values(value):
    if isinstance(value, dict):
        return [item for nested in value.values() for item in values(nested)]
    if isinstance(value, (tuple, list)):
        return [item for nested in value for item in values(nested)]
    return [value]


class Rows:
    def __init__(self, rows=()):
        self.rows = rows

    def mappings(self):
        return self

    def all(self):
        return list(self.rows)


class Session:
    def __init__(self, responses=()):
        self.responses = list(responses)
        self.statements = []

    def compile(self, statement):
        compiled = statement.compile(dialect=postgresql.dialect())
        sql = str(compiled)
        assert not sql.lstrip().startswith(("INSERT", "UPDATE", "DELETE", "ALTER"))
        self.statements.append((sql, compiled.params))

    def execute(self, statement):
        self.compile(statement)
        return Rows(self.responses.pop(0) if self.responses else ())

    def scalar(self, statement):
        self.compile(statement)
        return 0

    def scalars(self, statement):
        self.compile(statement)
        return Rows()


@pytest.mark.parametrize("role", ["agent", "manager", "administrator", "unknown"])
def test_catalogue_visibility_is_one_rule_for_context_history_and_file_authority(role):
    codes = visible_template_codes(role)
    assert set(codes) == {
        item.code
        for item in TEMPLATES
        if role in {"manager", "administrator"} or role == "agent" and not item.restricted
    }
    assert all(
        generated._visible(identity(role), item) == (item.code in codes) for item in TEMPLATES
    )


@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
@pytest.mark.parametrize("prepared", [False, True])
def test_real_sql_scopes_templates_and_parents_before_count_and_never_searches_contents(
    role, prepared
):
    query = SearchQuery(q="synthetic%_\\")
    match = discovery.projections(identity(role), query, prepared=prepared)
    compiled = match.select().compile(dialect=postgresql.dialect())
    sql, bound = str(compiled), values(compiled.params)
    assert "scoped_contacts" in sql
    assert "contact.archived_at IS NULL" in sql and "contact.merged_into_contact_id IS NULL" in sql
    assert "document.template_code IN" in sql and "document.template_code IS NULL" in sql
    assert "document_version.state" in sql and "clean" in bound
    assert "document.mime_type" in sql and "application/pdf" in bound
    assert "values_json" not in sql and "receipt" not in sql and "object_key" not in sql
    assert "generated_document" in bound if prepared else "generated_document" not in bound
    assert set(visible_template_codes(role)).issubset(
        set(item for item in bound if isinstance(item, str))
    )
    if role == "agent":
        assert "10" not in bound and "11" not in bound
        assert "contact_collaborator.revoked_at IS NULL" in sql
    if prepared:
        assert "document.enquiry_id IN" in sql and "?tab=documents" in bound
        assert "enquiry.archived_at IS NULL" in sql
        if role == "agent":
            assert "enquiry.assigned_agent_id IS NOT NULL" in sql
    else:
        assert "document.enquiry_id IN" not in sql
    assert any(isinstance(value, str) and r"\%\_" in value for value in bound)


@pytest.mark.parametrize("prepared", [False, True])
def test_new_wire_mode_is_explicit_and_legacy_rows_keep_their_four_field_shape(
    monkeypatch, prepared
):
    did, parent = uuid4(), uuid4()
    kind = "generated_document" if prepared else "document"
    item = dict(
        kind=kind,
        id=did,
        label="Synthetic.pdf",
        href=f"/deals/{parent}",
        template_title="Bon de visite immobilière",
    )
    if prepared:
        item["href"] += "?tab=documents"
    session = Session([(), [(kind, 21)], [item]])
    monkeypatch.setattr(discovery, "current_identity", lambda *_: identity("manager"))
    result = discovery.search(
        SimpleNamespace(session=lambda: nullcontext(session)),
        "synthetic",
        SearchQuery(q="synthetic"),
        prepared=prepared,
    )
    assert result["total"] == 21 and len(result["items"]) == 1
    assert result["counts"] == {kind: 21}
    assert session.statements[0][0] == "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"
    if prepared:
        assert result["search_version"] == 2
        assert result["items"][0]["template_title"] == item["template_title"]
    else:
        assert "search_version" not in result
        assert set(result["items"][0]) == {"kind", "id", "label", "href"}


def test_identity_failure_precedes_any_match_query_and_new_kind_requires_opt_in(monkeypatch):
    session = Session()
    database = SimpleNamespace(session=lambda: nullcontext(session))

    def denied(*_):
        raise IdentityError("UNAUTHENTICATED", 401)

    monkeypatch.setattr(discovery, "current_identity", denied)
    with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
        discovery.search(database, "synthetic", SearchQuery(q="synthetic"), prepared=True)
    assert len(session.statements) == 1
    with pytest.raises(IdentityError, match="VALIDATION_ERROR"):
        discovery.search(
            database, "synthetic", SearchQuery(q="synthetic", kind="generated_document")
        )
    assert len(session.statements) == 1


def test_actual_router_binds_the_bounded_header_and_preserves_legacy_default(monkeypatch):
    annotation = get_type_hints(discovery_routes.find, include_extras=True)["prepared_version"]
    assert get_args(annotation)[1].alias == "X-Kay-Search-Version"
    header = TypeAdapter(annotation)
    assert header.validate_python("2") == "2"
    for value in ("1", "3", "2,2", "2" * 200):
        with pytest.raises(ValidationError):
            header.validate_python(value)
    calls = []
    monkeypatch.setattr(discovery_routes, "configuration", lambda _: (None, None))
    monkeypatch.setattr(
        discovery_routes,
        "search",
        lambda _db, _token, _query, *, prepared: calls.append(prepared) or {},
    )
    request = SimpleNamespace(query_params=QueryParams("q=synthetic"))
    discovery_routes.find(request, "synthetic", SearchQuery(q="synthetic"))
    discovery_routes.find(request, "synthetic", SearchQuery(q="synthetic"), "2")
    assert calls == [False, True]
    with pytest.raises(IdentityError, match="VALIDATION_ERROR"):
        discovery_routes.find(
            SimpleNamespace(query_params=QueryParams("q=synthetic&scope=agency")),
            "synthetic",
            SearchQuery(q="synthetic"),
            "2",
        )
    assert calls == [False, True]


@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
def test_both_metadata_histories_use_the_catalogue_predicate_before_total(monkeypatch, role):
    current = identity(role)
    for module, read in [
        (generated, lambda db: generated.history(db, "synthetic", "deal", uuid4(), 1)),
        (files, lambda db: files.list_documents(db, "synthetic", "deal", uuid4(), 1, 20)),
    ]:
        session = Session()
        monkeypatch.setattr(module, "current_identity", lambda *_: current)
        monkeypatch.setattr(module, "authorize", lambda *_args, **_kwargs: None)
        result = read(
            SimpleNamespace(session=lambda current_session=session: nullcontext(current_session))
        )
        assert result["total"] == 0
        for sql, params in session.statements:
            assert "document.template_code IN" in sql
            codes = values(params)
            assert set(visible_template_codes(role)).issubset(
                set(item for item in codes if isinstance(item, str))
            )
            if role == "agent":
                assert "10" not in codes and "11" not in codes


@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
def test_direct_file_lookup_cannot_bypass_finance_or_unknown_template_visibility(monkeypatch, role):
    current, parent = identity(role), uuid4()
    calls = []
    monkeypatch.setattr(files, "authorize", lambda *_args, **_kwargs: calls.append(True))
    document = SimpleNamespace(
        purpose="generated",
        template_code="01",
        created_by_user_id=current.user.id,
        contact_id=None,
        development_id=None,
        property_id=None,
        deal_id=parent,
        enquiry_id=None,
    )
    session = SimpleNamespace(get=lambda *_: document)
    for code in ("01", "10", "11", "unknown", None):
        document.template_code = code
        before = len(calls)
        if code in visible_template_codes(role):
            assert files.authorized_document(session, current, uuid4()) is document
            assert len(calls) == before + 1
        else:
            with pytest.raises(IdentityError, match="NOT_FOUND"):
                files.authorized_document(session, current, uuid4())
            assert len(calls) == before
