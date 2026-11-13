"""Programme phase contracts, real command functions and compiled/stubbed reads only."""

import importlib.util
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql

from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError
from app.inventory import commands, hierarchy_commands, hierarchy_queries, hierarchy_router, history
from app.inventory.contracts import DevelopmentQuery, InventoryQuery, PropertiesQuery
from app.inventory.hierarchy_contracts import DevelopmentFields, EditDevelopment
from app.inventory.hierarchy_models import Development
from app.inventory.models import InventoryEvent


def fields():
    return {"reference": "SYN-PHASE", "name": "Programme synthétique"}


@pytest.mark.parametrize("value", ["draft", "available", "Commercialisation", "", True, 1])
def test_phase_is_optional_descriptive_enum_not_an_offering_status(value):
    assert DevelopmentFields(**fields()).phase is None
    assert "phase" not in DevelopmentFields(**fields()).model_fields_set
    for phase in (None, "preparation", "marketing"):
        assert DevelopmentFields(**fields(), phase=phase).phase == phase
    with pytest.raises(ValidationError):
        DevelopmentFields(**fields(), phase=value)
    with pytest.raises(ValidationError):
        DevelopmentFields(**fields(), phase_supported=True)


@pytest.mark.parametrize("edit", [False, True])
def test_omitted_phase_retains_exact_legacy_payload_and_explicit_clear_is_distinct(edit):
    values = fields() | ({"expected_version": 4} if edit else {})
    model = EditDevelopment if edit else DevelopmentFields
    body = model(**values)
    legacy = body.model_dump(mode="json", exclude={"phase", "received_on", "important_remarks"})
    if edit:
        legacy.pop("developer_contact_id")
    assert commands.command_payload(body) == legacy
    for phase in (None, "preparation", "marketing"):
        assert commands.command_payload(model(**values, phase=phase)) == legacy | {"phase": phase}


class CommandSession:
    def __init__(self):
        self.rows = []

    def add(self, item):
        self.rows.append(item)

    def flush(self):
        for row in self.rows:
            if getattr(row, "id", None) is None:
                row.id = uuid4()
            if isinstance(row, Development) and row.version is None:
                row.version = 1

    def scalar(self, _query):
        return None


def programme(phase="marketing"):
    return Development(
        id=uuid4(),
        reference="SYN-PHASE",
        name="Programme synthétique",
        category="mixed",
        phase=phase,
        version=4,
        archived_at=None,
        developer_contact_id=None,
        created_at=datetime(2030, 1, 1, tzinfo=UTC),
        updated_at=datetime(2030, 1, 1, tzinfo=UTC),
    )


@pytest.mark.parametrize(
    "supplied, expected",
    [({}, "marketing"), ({"phase": None}, None), ({"phase": "preparation"}, "preparation")],
)
def test_actual_edit_preserves_omitted_phase_and_records_explicit_phase_with_version(
    monkeypatch, supplied, expected
):
    row = programme()
    snapshots = []
    monkeypatch.setattr(hierarchy_commands, "development_record", lambda *_args, **_kwargs: row)
    monkeypatch.setattr(
        hierarchy_commands,
        "record",
        lambda _session, _identity, item, *_args, **_kwargs: (
            snapshots.append((item.phase, item.version)) or uuid4()
        ),
    )
    result, offering, _event = hierarchy_commands.execute_hierarchy(
        CommandSession(),
        SimpleNamespace(user=SimpleNamespace(role="agent")),
        "development-edit",
        row.id,
        EditDevelopment(**fields(), expected_version=4, **supplied),
    )
    assert result is row and offering is None
    assert row.phase == expected and row.version == 5
    assert snapshots == [(expected, 5)]


def test_current_version_and_archive_guards_precede_phase_write(monkeypatch):
    row = programme()
    monkeypatch.setattr(hierarchy_commands, "development_record", lambda *_args, **_kwargs: row)
    for archived, version, code in [
        (None, 3, "INVENTORY_VERSION_CONFLICT"),
        (datetime.now(UTC), 4, "STOCK_REVIEW_REQUIRED"),
    ]:
        row.archived_at = archived
        with pytest.raises(IdentityError) as error:
            hierarchy_commands.execute_hierarchy(
                CommandSession(),
                SimpleNamespace(),
                "development-edit",
                row.id,
                EditDevelopment(**fields(), expected_version=version, phase="preparation"),
            )
        assert error.value.code == code and row.phase == "marketing" and row.version == 4


@pytest.mark.parametrize("phase", [None, "preparation", "marketing"])
def test_real_history_writer_captures_original_phase_without_inference(phase):
    row = programme(phase)
    session = CommandSession()
    actor = SimpleNamespace(user=SimpleNamespace(id=uuid4(), display_name="Acteur synthétique"))
    event_id = history.record(session, actor, row, "developments.updated")
    event = next(item for item in session.rows if isinstance(item, InventoryEvent))
    assert event.id == event_id and event.development_phase == phase
    assert event.actor_user_id == actor.user.id and event.property_version == 4
    row.phase = "preparation" if phase != "preparation" else "marketing"
    assert event.development_phase == phase


@pytest.mark.parametrize("enabled", [False, True])
def test_actual_summary_uses_only_stored_phase_and_legacy_shape_is_unchanged(monkeypatch, enabled):
    row = programme(None)
    monkeypatch.setattr(hierarchy_queries, "shared_conflicts", lambda *_args: {})
    monkeypatch.setattr(hierarchy_queries, "occupied", lambda *_args: set())

    class Session:
        def scalars(self, _query):
            return SimpleNamespace(all=lambda: [])

        def execute(self, _query):
            return SimpleNamespace(all=lambda: [])

    result = hierarchy_queries.summary(Session(), [row], phase_enabled=enabled)[0]
    if enabled:
        assert result["phase"] is None and result["phase_supported"] is True
    else:
        assert "phase" not in result and "phase_supported" not in result
    assert result["unit_count"] == 0 and result["available_unit_count"] == 0


def test_phase_filter_is_on_programme_before_both_count_and_page(monkeypatch):
    statements = []

    class Session:
        def execute(self, statement):
            statements.append(statement)

        def scalar(self, statement):
            statements.append(statement)
            return 0

        def scalars(self, statement):
            statements.append(statement)
            return SimpleNamespace(all=lambda: [])

    class Database:
        @contextmanager
        def session(self):
            yield Session()

    monkeypatch.setattr(hierarchy_queries, "current_identity", lambda *_args: SimpleNamespace())
    monkeypatch.setattr(hierarchy_queries, "summary", lambda *_args, **_kwargs: [])
    result = hierarchy_queries.read_hierarchy(
        Database(),
        "synthetic",
        "developments",
        None,
        DevelopmentQuery(phase="marketing"),
        phase_enabled=True,
    )
    rendered = [
        str(statement.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
        for statement in statements[1:]
    ]
    assert len(rendered) == 2 and all("development.phase = 'marketing'" in sql for sql in rendered)
    assert result["phase_supported"] is True
    for model in (InventoryQuery, PropertiesQuery):
        with pytest.raises(ValidationError):
            model(phase="marketing")


@pytest.mark.parametrize(
    "suffix",
    [
        "",
        "/00000000-0000-0000-0000-000000000001",
        "/00000000-0000-0000-0000-000000000001/inventory",
        "/00000000-0000-0000-0000-000000000001/history",
    ],
)
def test_routes_use_only_exact_facade_header_without_changing_legacy_calls(monkeypatch, suffix):
    app = FastAPI()
    app.include_router(hierarchy_router.router)
    app.dependency_overrides[facade_authority] = lambda: None
    app.dependency_overrides[session_proof] = lambda: "synthetic"
    monkeypatch.setattr(hierarchy_router, "database", lambda _request: None)
    calls = []

    def read(*_args, **kwargs):
        calls.append(kwargs)
        return {"phase_supported": True} if kwargs.get("phase_enabled") else {"legacy": True}

    monkeypatch.setattr(hierarchy_router, "read_hierarchy", read)

    @app.exception_handler(IdentityError)
    async def denied(_request, error):
        return JSONResponse({"error": {"code": error.code}}, status_code=error.status)

    with TestClient(app) as client:
        for header in ({}, {"X-Kay-Development-Phase": "2"}, {"X-Kay-Development-Phase": "1"}):
            response = client.get("/api/v1/developments" + suffix, headers=header)
            assert response.status_code == 200
        assert calls == [{}, {}, {"phase_enabled": True}]
        response = client.get("/api/v1/developments" + suffix + "?phase_supported=1")
        assert response.status_code == 422 and len(calls) == 3


def test_migration_has_no_backfill_and_guards_real_or_used_phase_downgrades(monkeypatch):
    path = Path(__file__).resolve().parents[1] / "alembic/versions/0037_development_phase.py"
    spec = importlib.util.spec_from_file_location("synthetic_phase_migration", path)
    assert spec and spec.loader
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    operations = []
    monkeypatch.setattr(
        migration,
        "op",
        SimpleNamespace(
            add_column=lambda *args: operations.append(("add", *args)),
            create_check_constraint=lambda *args: operations.append(("check", *args)),
            execute=lambda sql: operations.append(("sql", sql)),
            get_bind=lambda: SimpleNamespace(scalar=lambda _query: True),
        ),
    )
    migration.upgrade()
    columns = [entry[2] for entry in operations if entry[0] == "add"]
    assert len(columns) == 2 and all(
        column.nullable and column.server_default is None for column in columns
    )
    statement = next(entry[1] for entry in operations if entry[0] == "sql")
    assert "DEFERRABLE INITIALLY DEFERRED" in statement
    assert "stored IS DISTINCT FROM current_row.phase" in statement
    assert "property_version=current_row.version" in statement
    assert "UPDATE development SET" not in statement
    for environment in ("development", "test"):
        monkeypatch.setattr(
            migration,
            "load_settings",
            lambda environment=environment: SimpleNamespace(app_environment=environment),
        )
        with pytest.raises(RuntimeError, match="DEVELOPMENT_PHASE_DATA_DOWNGRADE_REFUSED"):
            migration.downgrade()
