"""Production configuration is exercised with synthetic values and no database sockets."""

import re
import secrets

import pytest
import trustme
from pydantic import SecretStr, ValidationError
from sqlalchemy.engine import make_url

from app.settings import ConfigurationError, Settings, load_settings

HOST = "kay-postgres.synthetic.invalid"
URL = f"postgresql://synthetic:synthetic-value@{HOST}:25060/kay_crm?sslmode=verify-full&sslrootcert=system"


@pytest.fixture(autouse=True)
def configuration_env(monkeypatch):
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for field in Settings.model_fields:
        monkeypatch.delenv(field.upper(), raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://synthetic@127.0.0.1:1/kay_development")
    monkeypatch.setenv("FACADE_SECRET", secrets.token_hex(32))


def production(monkeypatch):
    monkeypatch.setenv("APP_ENVIRONMENT", "production")
    monkeypatch.setenv("PRODUCTION_DATABASE_HOST", HOST)
    monkeypatch.setenv("DATABASE_URL", URL)
    monkeypatch.setenv("FRONTEND_ORIGIN", "https://kay.synthetic.invalid")


def test_production_accepts_managed_host_with_verified_tls_without_other_environment_urls(
    monkeypatch,
):
    production(monkeypatch)
    settings = load_settings()
    selected = make_url(settings.selected_database_url())
    assert selected.drivername == "postgresql+psycopg"
    assert selected.host == HOST
    assert dict(selected.query) == {"sslmode": "verify-full", "sslrootcert": "system"}
    assert settings.test_database_url is settings.benchmark_database_url is None
    assert settings.recovery_database_url is None
    assert "synthetic-value" not in repr(settings)


def test_development_only_requires_its_own_url():
    assert load_settings().test_database_url is None


def test_blank_unused_urls_are_absent_not_required(monkeypatch):
    production(monkeypatch)
    for name in ("TEST_DATABASE_URL", "BENCHMARK_DATABASE_URL", "RECOVERY_DATABASE_URL"):
        monkeypatch.setenv(name, "")
    assert load_settings().app_environment == "production"


def test_system_root_requires_a_supporting_libpq(monkeypatch):
    production(monkeypatch)
    monkeypatch.setattr("app.settings.pq.version", lambda: 150000)
    with pytest.raises(ConfigurationError, match="DATABASE_URL:TLS_SYSTEM_ROOT_UNSUPPORTED"):
        load_settings()


@pytest.mark.parametrize("environment", ["test", "benchmark", "recovery"])
def test_isolated_environment_requires_only_its_selected_url(monkeypatch, environment):
    monkeypatch.setenv("APP_ENVIRONMENT", environment)
    with pytest.raises(ConfigurationError, match=f"{environment.upper()}_DATABASE_URL:REQUIRED"):
        load_settings()
    target = f"postgresql+psycopg://synthetic@localhost:1/kayrealestate_{environment}"
    monkeypatch.setenv(f"{environment.upper()}_DATABASE_URL", target)
    assert load_settings().selected_database_url() == target


@pytest.mark.parametrize("mode", ["disable", "allow", "prefer", "require", "verify-ca", ""])
def test_production_rejects_unverified_tls(monkeypatch, mode):
    production(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", URL.replace("verify-full", mode))
    with pytest.raises(ConfigurationError, match="DATABASE_URL:TLS_VERIFY_FULL_REQUIRED"):
        load_settings()


@pytest.mark.parametrize(
    "override",
    [
        "host=elsewhere.invalid",
        "hostaddr=127.0.0.1",
        "service=production",
        "dbname=other",
        "options=-c%20role=other",
        "user=other",
        "sslmode=disable",
    ],
)
def test_connection_overrides_cannot_bypass_validation(monkeypatch, override):
    production(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", URL + "&" + override)
    with pytest.raises(ConfigurationError):
        load_settings()


@pytest.mark.parametrize(
    "field,code",
    [
        ("PRODUCTION_DATABASE_HOST", "REQUIRED"),
        ("DATABASE_URL", "MISSING"),
        ("FACADE_SECRET", "MISSING"),
    ],
)
def test_production_required_variables_have_safe_names_and_codes(monkeypatch, field, code):
    production(monkeypatch)
    monkeypatch.delenv(field)
    with pytest.raises(ConfigurationError, match=f"{field}:{code}"):
        load_settings()


def test_unexpected_managed_host_is_refused(monkeypatch):
    production(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", URL.replace(HOST, "other.synthetic.invalid"))
    with pytest.raises(ConfigurationError, match="DATABASE_URL:MANAGED_HOST_MISMATCH"):
        load_settings()


@pytest.mark.parametrize(
    "host", ["localhost", "127.0.0.2", "::1", "bad..invalid", "-bad.invalid", "host/path.invalid"]
)
def test_production_host_requires_an_explicit_managed_dns_name(monkeypatch, host):
    production(monkeypatch)
    monkeypatch.setenv("PRODUCTION_DATABASE_HOST", host)
    with pytest.raises(ConfigurationError, match="PRODUCTION_DATABASE_HOST:MANAGED_HOST_REQUIRED"):
        load_settings()


@pytest.mark.parametrize("environment", ["test", "benchmark", "recovery"])
def test_production_cannot_select_reserved_isolated_databases(monkeypatch, environment):
    production(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", URL.replace("/kay_crm?", f"/kayrealestate_{environment}?"))
    with pytest.raises(ConfigurationError, match="DATABASE_URL:ISOLATED_DATABASE_REFUSED"):
        load_settings()


def test_production_requires_explicit_database_credentials(monkeypatch):
    production(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", URL.replace("synthetic:synthetic-value@", "synthetic@"))
    with pytest.raises(ConfigurationError, match="DATABASE_URL:CREDENTIALS_REQUIRED"):
        load_settings()


@pytest.mark.parametrize("environment", ["development", "test", "benchmark", "recovery"])
def test_nonproduction_remote_database_is_refused(monkeypatch, environment):
    monkeypatch.setenv("APP_ENVIRONMENT", environment)
    field = (
        "DATABASE_URL" if environment == "development" else f"{environment.upper()}_DATABASE_URL"
    )
    monkeypatch.setenv(field, URL.replace("postgresql://", "postgresql+psycopg://"))
    with pytest.raises(ConfigurationError, match=f"{field}:LOCAL_POSTGRESQL_REQUIRED"):
        load_settings()


@pytest.mark.parametrize(
    "root,code",
    [
        (None, "TLS_ROOT_REQUIRED"),
        ("relative.pem", "TLS_ROOT_INVALID"),
        ("/nonexistent/synthetic-ca.pem", "TLS_ROOT_INVALID"),
    ],
)
def test_root_trust_must_be_explicit_and_usable(monkeypatch, root, code):
    production(monkeypatch)
    query = {"sslmode": "verify-full"}
    if root is not None:
        query["sslrootcert"] = root
    monkeypatch.setenv(
        "DATABASE_URL", make_url(URL).set(query=query).render_as_string(hide_password=False)
    )
    with pytest.raises(ConfigurationError, match=f"DATABASE_URL:{code}"):
        load_settings()


def test_custom_root_certificate_is_parsed_and_invalid_pem_fails_safely(monkeypatch, tmp_path):
    production(monkeypatch)
    certificate = tmp_path / "synthetic-ca.pem"
    trustme.CA().cert_pem.write_to_path(certificate)
    url = make_url(URL).set(query={"sslmode": "verify-full", "sslrootcert": str(certificate)})
    monkeypatch.setenv("DATABASE_URL", url.render_as_string(hide_password=False))
    assert load_settings().app_environment == "production"
    certificate.write_text("not a certificate", encoding="utf-8")
    with pytest.raises(ConfigurationError, match="DATABASE_URL:TLS_ROOT_INVALID") as failure:
        load_settings()
    assert str(certificate) not in str(failure.value)


@pytest.mark.parametrize(
    "value", ["sqlite:///private-marker", "not-a-url", "postgresql://host:bad/db"]
)
def test_malformed_inputs_never_escape_into_diagnostics(monkeypatch, value):
    production(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", value)
    with pytest.raises(ConfigurationError) as failure:
        load_settings()
    assert str(failure.value) == "CONFIGURATION_INVALID: DATABASE_URL:POSTGRESQL_URL_INVALID"
    assert failure.value.__suppress_context__


def test_invalid_nonsecret_fields_also_hide_url_values(monkeypatch):
    production(monkeypatch)
    marker = "https://synthetic-user:private-marker@untrusted.invalid/path"
    monkeypatch.setenv("FRONTEND_ORIGIN", marker)
    with pytest.raises(ConfigurationError) as failure:
        load_settings()
    assert str(failure.value) == "CONFIGURATION_INVALID: FRONTEND_ORIGIN:HTTPS_ORIGIN_REQUIRED"
    with pytest.raises(ValidationError) as validation:
        Settings()
    assert marker not in str(validation.value)
    assert "private-marker" not in str(validation.value)


def test_multiple_failures_report_only_allowlisted_names_and_codes(monkeypatch):
    production(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", "private-input-marker")
    monkeypatch.setenv("FACADE_SECRET", "private-short-marker")
    with pytest.raises(ConfigurationError) as failure:
        load_settings()
    assert re.fullmatch(r"CONFIGURATION_INVALID: [A-Z_:, ]+", str(failure.value))
    assert "DATABASE_URL:POSTGRESQL_URL_INVALID" in str(failure.value)
    assert "FACADE_SECRET:TOO_SHORT" in str(failure.value)


def test_copied_environment_has_no_development_url_fallback():
    settings = load_settings().model_copy(update={"app_environment": "recovery"})
    with pytest.raises(ConfigurationError, match="RECOVERY_DATABASE_URL:REQUIRED"):
        settings.selected_database_url()


def test_unknown_environment_copy_cannot_fall_back_to_development():
    settings = load_settings().model_copy(update={"app_environment": "unrecognized"})
    with pytest.raises(ConfigurationError, match="APP_ENVIRONMENT:INVALID"):
        settings.selected_database_url()


def test_secret_values_remain_wrapped():
    assert isinstance(load_settings().database_url, SecretStr)


@pytest.mark.anyio
async def test_production_api_lifespan_and_engine_keep_tls_without_isolation_catalog_probe(
    monkeypatch,
):
    from httpx import ASGITransport, AsyncClient

    from app.db import isolation
    from app.main import create_app

    production(monkeypatch)
    monkeypatch.setattr(
        isolation, "assert_isolated", lambda *args: pytest.fail("TEST_PROBE_ON_PRODUCTION")
    )
    settings = load_settings()
    app = create_app(settings)
    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="https://unit.invalid"
        ) as client:
            assert (await client.get("/api/v1/health/live")).json() == {"status": "live"}
            assert app.state.database.engine.url.query["sslmode"] == "verify-full"
            assert app.state.database.engine.url.query["sslrootcert"] == "system"
    assert app.state.database.closed


def test_production_migration_keeps_offline_safeguard_without_test_catalog_probe(monkeypatch):
    import runpy

    from alembic import context
    from app.db import isolation
    from app.runtime import BACKEND_ROOT

    production(monkeypatch)
    monkeypatch.setattr(
        isolation, "assert_isolated", lambda *args: pytest.fail("TEST_PROBE_ON_PRODUCTION")
    )
    monkeypatch.setattr(context, "is_offline_mode", lambda: True)
    with pytest.raises(RuntimeError, match="OFFLINE_MIGRATIONS_DISABLED"):
        runpy.run_path(str(BACKEND_ROOT / "alembic" / "env.py"))


def test_production_worker_uses_runtime_target_without_test_catalog_probe(monkeypatch, capsys):
    import sys
    from types import SimpleNamespace

    from app.cli import worker
    from app.db import isolation, session
    from app.recovery import maintenance
    from app.work import status

    production(monkeypatch)
    monkeypatch.setattr(
        isolation, "assert_isolated", lambda *args: pytest.fail("TEST_PROBE_ON_PRODUCTION")
    )
    closed, selected = [], []

    def database(url):
        selected.append(make_url(url).host)
        return SimpleNamespace(close=lambda: closed.append(True))

    monkeypatch.setattr(session, "Database", database)
    monkeypatch.setattr(maintenance, "Admission", lambda settings: object())
    monkeypatch.setattr(status, "queue_status", lambda db: {"synthetic": True})
    monkeypatch.setattr(sys, "argv", ["worker", "--status"])
    worker.main()
    assert selected == [HOST] and closed == [True]
    assert capsys.readouterr().out == '{"synthetic": true}\n'


def test_production_bootstrap_preserves_tty_and_uses_runtime_guard(monkeypatch, capsys):
    import sys
    from types import SimpleNamespace
    from uuid import uuid4

    from app.cli import bootstrap_admin
    from app.db import isolation

    production(monkeypatch)
    monkeypatch.setattr(
        isolation, "assert_isolated", lambda *args: pytest.fail("TEST_PROBE_ON_PRODUCTION")
    )
    monkeypatch.setattr(sys, "argv", ["bootstrap"])
    monkeypatch.setattr(sys.stdin, "isatty", lambda: True)
    monkeypatch.setattr(sys.stdout, "isatty", lambda: True)
    inputs = iter(["Administrateur synthétique", "synthetic@example.invalid"])
    monkeypatch.setattr("builtins.input", lambda prompt: next(inputs))
    monkeypatch.setattr(
        bootstrap_admin.getpass, "getpass", lambda prompt: "synthetic-hidden-phrase"
    )
    closed, selected = [], []

    def database(url):
        selected.append(make_url(url).host)
        return SimpleNamespace(close=lambda: closed.append(True))

    monkeypatch.setattr(bootstrap_admin, "Database", database)
    monkeypatch.setattr(bootstrap_admin, "bootstrap_administrator", lambda *args: uuid4())
    assert bootstrap_admin.main() == 0
    assert selected == [HOST] and closed == [True]
    output = capsys.readouterr().out
    assert "BOOTSTRAP_COMPLETED" in output and "synthetic-hidden-phrase" not in output
