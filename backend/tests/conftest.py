"""Fail closed before any test uses the real, isolated PostgreSQL target."""

import os
from collections.abc import Iterator

import pytest

from app.db.isolation import assert_isolated
from app.db.session import Database
from app.settings import Settings, load_settings
from tests.identity_support import clear_identity
from tests.run_lock import exclusive_test_run


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture(scope="session")
def settings() -> Settings:
    """Never inherit a development environment or substitute SQLite."""
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
def isolated_run_lease(settings: Settings) -> Iterator[None]:
    with exclusive_test_run(settings):
        yield


@pytest.fixture
def clean_identity(settings: Settings, database: Database) -> Iterator[None]:
    clear_identity(settings, database)
    try:
        yield
    finally:
        clear_identity(settings, database)
