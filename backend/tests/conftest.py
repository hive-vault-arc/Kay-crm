"""Fail closed before any test uses the real, isolated PostgreSQL target."""

import os
from collections.abc import Iterator

import pytest

from app.db.isolation import assert_isolated
from app.db.session import Database
from app.settings import Settings, load_settings
from tests.identity_support import clear_identity
from tests.run_lock import exclusive_test_run
from tests.unit_selection import DATABASE_FIXTURES, is_unit


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--unit-only", action="store_true", help="Reviewed units; DB connections denied"
    )


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    if not config.getoption("--unit-only"):
        return
    selected, deselected = [], []
    for item in items:
        if is_unit(item.nodeid):
            if DATABASE_FIXTURES.intersection(getattr(item, "fixturenames", ())):
                raise pytest.UsageError("DATABASE_FIXTURE_FORBIDDEN_IN_UNIT_MODE")
            selected.append(item)
        else:
            deselected.append(item)
    if not selected:
        raise pytest.UsageError("UNIT_SELECTION_EMPTY")
    config.hook.pytest_deselected(items=deselected)
    items[:] = selected


@pytest.fixture(autouse=True)
def unit_connection_refusal(
    request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch
) -> None:
    if not request.config.getoption("--unit-only"):
        return
    import psycopg
    from sqlalchemy import Engine

    def refused(*args: object, **kwargs: object) -> None:
        raise AssertionError("DATABASE_CONNECTION_FORBIDDEN_IN_UNIT_MODE")

    monkeypatch.setattr(Engine, "connect", refused)
    monkeypatch.setattr(psycopg, "connect", refused)
    monkeypatch.setattr(psycopg.Connection, "connect", refused)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture(scope="session")
def settings(request: pytest.FixtureRequest) -> Settings:
    """Never inherit a development environment or substitute SQLite."""
    if request.config.getoption("--unit-only"):
        raise pytest.UsageError("DATABASE_FIXTURE_FORBIDDEN_IN_UNIT_MODE")
    os.environ["APP_ENVIRONMENT"] = "test"
    configuration = load_settings()
    assert_isolated(configuration)
    return configuration


@pytest.fixture
def database(settings: Settings) -> Iterator[Database]:
    resource = Database(settings.selected_database_url())
    try:
        yield resource
    finally:
        resource.close()


@pytest.fixture(scope="session", autouse=True)
def isolated_run_lease(request: pytest.FixtureRequest) -> Iterator[None]:
    if request.config.getoption("--unit-only"):
        yield
        return
    with exclusive_test_run(request.getfixturevalue("settings")):
        yield


@pytest.fixture
def clean_identity(settings: Settings, database: Database) -> Iterator[None]:
    clear_identity(settings, database)
    try:
        yield
    finally:
        clear_identity(settings, database)
