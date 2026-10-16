"""Guarded real PostgreSQL migration checks, never development resets."""

import os
import subprocess
import sys

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from pydantic import SecretStr
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.db.isolation import UnsafeDatabaseTarget, assert_isolated, resolve_identity
from app.db.session import Database, create_database_engine
from app.runtime import BACKEND_ROOT
from app.settings import Settings

HEAD = ScriptDirectory.from_config(Config(str(BACKEND_ROOT / "alembic.ini"))).get_current_head()


@pytest.mark.postgres
def test_targets_have_distinct_resolved_identities(settings: Settings) -> None:
    identities = []
    for environment in ["test", "benchmark", "recovery"]:
        selected = settings.model_copy(update={"app_environment": environment})
        identity = assert_isolated(selected)
        identities.append((identity.cluster, identity.oid))
    assert len(set(identities)) == 3


@pytest.mark.postgres
def test_development_alias_and_environment_are_refused(settings: Settings) -> None:
    alias = make_url(settings.database_url.get_secret_value()).set(host="127.0.0.1")
    unsafe = settings.model_copy(
        update={
            "test_database_url": SecretStr(alias.render_as_string(hide_password=False)),
        }
    )
    with pytest.raises(UnsafeDatabaseTarget, match="DEVELOPMENT_DATABASE_REFUSED"):
        assert_isolated(unsafe)
    with pytest.raises(UnsafeDatabaseTarget, match="ISOLATED_DATABASE_REQUIRED"):
        assert_isolated(settings.model_copy(update={"app_environment": "development"}))


def migrate(*arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(  # noqa: S603 - fixed module, explicit venv, no shell.
        [sys.executable, "-m", "alembic", *arguments],
        cwd=BACKEND_ROOT,
        env={**os.environ, "APP_ENVIRONMENT": "test"},
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )


@pytest.mark.postgres
def test_migration_upgrade_downgrade_upgrade_preserves_unknown_table(
    settings: Settings,
    database: Database,
) -> None:
    assert_isolated(settings)
    assert migrate("upgrade", "head").returncode == 0
    with database.engine.begin() as connection:
        connection.execute(text("CREATE TABLE sp02_unrelated_probe (id integer PRIMARY KEY)"))
        connection.execute(text("INSERT INTO sp02_unrelated_probe VALUES (7)"))
    try:
        assert migrate("downgrade", "base").returncode == 0
        assert migrate("upgrade", "head").returncode == 0
        with database.engine.connect() as connection:
            assert connection.execute(text("SELECT id FROM sp02_unrelated_probe")).scalar_one() == 7
            assert (
                connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
                == HEAD
            )
    finally:
        with database.engine.begin() as connection:
            connection.execute(text("DROP TABLE sp02_unrelated_probe"))


@pytest.mark.postgres
def test_unknown_revision_refused_without_stamp(settings: Settings, database: Database) -> None:
    assert_isolated(settings)
    assert migrate("upgrade", "head").returncode == 0
    with database.engine.begin() as connection:
        connection.execute(text("UPDATE alembic_version SET version_num='sp02_unknown'"))
    try:
        assert migrate("upgrade", "head").returncode != 0
        with database.engine.connect() as connection:
            assert (
                connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
                == "sp02_unknown"
            )
    finally:
        with database.engine.begin() as connection:
            connection.execute(
                text("UPDATE alembic_version SET version_num=:revision"), {"revision": HEAD}
            )


@pytest.mark.postgres
def test_identity_resolves_existing_database(settings: Settings) -> None:
    engine = create_database_engine(settings.selected_database_url())
    try:
        assert resolve_identity(engine).name == "kayrealestate_test"
    finally:
        engine.dispose()


@pytest.mark.postgres
def test_real_pytest_fixture_refuses_development_before_test_body(settings: Settings) -> None:
    refused = subprocess.run(  # noqa: S603 - explicit venv and fixed test selection.
        [
            sys.executable,
            "-m",
            "pytest",
            "-q",
            "tests/test_foundation.py",
            "-k",
            "live_ready_and_pool",
        ],
        cwd=BACKEND_ROOT,
        env={**os.environ, "TEST_DATABASE_URL": settings.database_url.get_secret_value()},
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert refused.returncode != 0
    assert "DEVELOPMENT_DATABASE_REFUSED" in refused.stdout
    if settings.database_url.get_secret_value() in refused.stdout:
        raise AssertionError("SENSITIVE_SUBPROCESS_OUTPUT")


@pytest.mark.postgres
def test_nonempty_unversioned_schema_refused(settings: Settings, database: Database) -> None:
    assert_isolated(settings)
    assert migrate("upgrade", "head").returncode == 0
    with database.engine.begin() as connection:
        connection.execute(text("ALTER TABLE alembic_version RENAME TO sp02_version_probe"))
    try:
        refused = migrate("upgrade", "head")
        assert refused.returncode != 0
        assert "NONEMPTY_UNVERSIONED_SCHEMA_REFUSED" in refused.stderr
        with database.engine.connect() as connection:
            assert (
                connection.execute(
                    text("SELECT to_regclass('public.alembic_version')")
                ).scalar_one()
                is None
            )
    finally:
        with database.engine.begin() as connection:
            connection.execute(text("ALTER TABLE sp02_version_probe RENAME TO alembic_version"))
