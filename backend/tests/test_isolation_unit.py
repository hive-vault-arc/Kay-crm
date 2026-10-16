"""Guard routing and alias denial without opening database connections or executing DDL."""

from types import SimpleNamespace

import pytest
from pydantic import SecretStr

from app.db import isolation
from app.db.isolation import DatabaseIdentity, UnsafeDatabaseTarget
from app.settings import Settings


def configuration(environment):
    urls = {}
    if environment in {"test", "benchmark", "recovery"}:
        urls[f"{environment}_database_url"] = SecretStr(
            f"postgresql+psycopg://synthetic@localhost/kayrealestate_{environment}"
        )
    return Settings.model_construct(
        app_environment=environment,
        database_url=SecretStr("postgresql+psycopg://synthetic@localhost/base"),
        **urls,
    )


@pytest.mark.parametrize("environment", ["production", "development"])
def test_isolated_helpers_refuse_real_environments_before_engine_creation(monkeypatch, environment):
    monkeypatch.setattr(
        isolation, "create_database_engine", lambda *args: pytest.fail("ENGINE_OPENED")
    )
    with pytest.raises(UnsafeDatabaseTarget, match="ISOLATED_DATABASE_REQUIRED"):
        isolation.assert_isolated(configuration(environment))


@pytest.mark.parametrize("environment", ["test", "benchmark", "recovery"])
def test_runtime_guard_keeps_live_isolation_for_synthetic_modes(monkeypatch, environment):
    seen = []
    monkeypatch.setattr(isolation, "assert_isolated", lambda settings: seen.append(settings))
    settings = configuration(environment)
    isolation.assert_runtime_target(settings)
    assert seen == [settings]


@pytest.mark.parametrize("environment", ["production", "development"])
def test_runtime_guard_does_not_use_privileged_test_identity_on_managed_database(
    monkeypatch, environment
):
    monkeypatch.setattr(
        isolation, "assert_isolated", lambda *args: pytest.fail("TEST_PROBE_ON_REAL_DB")
    )
    isolation.assert_runtime_target(configuration(environment))


@pytest.mark.parametrize("alias", [True, False])
def test_identity_alias_and_wrong_database_name_still_fail_closed(monkeypatch, alias):
    disposed = []
    monkeypatch.setattr(
        isolation,
        "create_database_engine",
        lambda *args: SimpleNamespace(dispose=lambda: disposed.append(True)),
    )
    identities = iter(
        [
            DatabaseIdentity("synthetic-cluster", 100, "development"),
            DatabaseIdentity(
                "synthetic-cluster",
                100 if alias else 101,
                "kayrealestate_test" if alias else "wrong_name",
            ),
        ]
    )
    monkeypatch.setattr(isolation, "resolve_identity", lambda engine: next(identities))
    with pytest.raises(UnsafeDatabaseTarget, match="DEVELOPMENT_DATABASE_REFUSED"):
        isolation.assert_isolated(configuration("test"))
    assert len(disposed) == 2
