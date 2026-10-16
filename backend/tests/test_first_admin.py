"""The convenience entry point must preserve hidden input and one-time bootstrap rules."""

import getpass
import secrets
import sys
import warnings
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError

import create_first_admin
from app.cli import bootstrap_admin
from app.identity.security import IdentityError
from app.settings import ConfigurationError, Settings


@pytest.fixture
def bootstrap_context(monkeypatch):
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for field in Settings.model_fields:
        monkeypatch.delenv(field.upper(), raising=False)
    monkeypatch.setenv("APP_ENVIRONMENT", "production")
    monkeypatch.setenv("PRODUCTION_DATABASE_HOST", "kay-postgres.synthetic.invalid")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://synthetic:synthetic-probe@kay-postgres.synthetic.invalid:25060/"
        "kay_bootstrap_probe?sslmode=verify-full&sslrootcert=system",
    )
    monkeypatch.setenv("FACADE_SECRET", secrets.token_hex(32))
    monkeypatch.setenv("FRONTEND_ORIGIN", "https://kay.synthetic.invalid")
    monkeypatch.setattr(sys, "argv", ["create_first_admin.py"])
    monkeypatch.setattr(sys.stdin, "isatty", lambda: True)
    monkeypatch.setattr(create_first_admin, "INITIAL_ADMIN_EMAIL", "synthetic@example.invalid")
    prompts, selected, closed, created = [], [], [], []
    password = secrets.token_urlsafe(24)

    def ask(prompt):
        prompts.append(prompt)
        return "Administrateur synthétique"

    def database(url):
        selected.append(url)
        return SimpleNamespace(close=lambda: closed.append(True))

    def create(database, name, email, supplied):
        assert name == "Administrateur synthétique" and email == "synthetic@example.invalid"
        if supplied != password:
            raise AssertionError("HIDDEN_INPUT_NOT_PASSED_TO_BOOTSTRAP")
        created.append(True)
        return uuid4()

    monkeypatch.setattr("builtins.input", ask)
    monkeypatch.setattr(bootstrap_admin.getpass, "getpass", lambda prompt: password)
    monkeypatch.setattr(bootstrap_admin, "Database", database)
    monkeypatch.setattr(bootstrap_admin, "bootstrap_administrator", create)

    def run():
        monkeypatch.setattr(sys.stdout, "isatty", lambda: True)
        return create_first_admin.main()

    return SimpleNamespace(
        password=password,
        prompts=prompts,
        selected=selected,
        closed=closed,
        created=created,
        run=run,
    )


def test_first_admin_uses_selected_identity_and_hidden_password(bootstrap_context, capsys):
    state = bootstrap_context
    assert state.run() == 0
    assert state.prompts == ["Nom affiché : "]
    assert state.created == [True] and state.closed == [True]
    assert len(state.selected) == 1
    output = capsys.readouterr().out
    assert output.startswith("BOOTSTRAP_COMPLETED:")
    if state.password in output or state.selected[0] in output:
        raise AssertionError("PRIVATE_BOOTSTRAP_INPUT_LOGGED")


@pytest.mark.parametrize("extra_argument", [False, True], ids=["non-tty", "arguments"])
def test_arguments_and_non_tty_fail_before_any_input(
    monkeypatch, bootstrap_context, capsys, extra_argument
):
    if extra_argument:
        monkeypatch.setattr(sys, "argv", ["create_first_admin.py", "private-argument-marker"])
    else:
        monkeypatch.setattr(sys.stdin, "isatty", lambda: False)
    assert bootstrap_context.run() == 2
    assert not bootstrap_context.prompts and not bootstrap_context.selected
    output = capsys.readouterr().out
    assert ("ARGUMENTS_NOT_ALLOWED" if extra_argument else "TTY_REQUIRED") in output
    assert "private-argument-marker" not in output


def test_mismatch_never_opens_database(monkeypatch, bootstrap_context, capsys):
    values = iter([bootstrap_context.password, secrets.token_urlsafe(24)])
    monkeypatch.setattr(bootstrap_admin.getpass, "getpass", lambda prompt: next(values))
    assert bootstrap_context.run() == 1
    assert not bootstrap_context.selected
    assert capsys.readouterr().out == "PASSWORD_MISMATCH\n"


def test_hidden_input_unavailable_fails_closed(monkeypatch, bootstrap_context, capsys):
    def unavailable(prompt):
        warnings.warn("Synthetic hidden input unavailable", getpass.GetPassWarning, stacklevel=2)
        raise AssertionError("FALLBACK_MUST_NOT_READ_INPUT")

    monkeypatch.setattr(bootstrap_admin.getpass, "getpass", unavailable)
    assert bootstrap_context.run() == 2
    assert not bootstrap_context.selected
    assert capsys.readouterr().out.startswith("TTY_REQUIRED:")


def test_interruption_never_opens_database(monkeypatch, bootstrap_context, capsys):
    def interrupted(prompt):
        raise KeyboardInterrupt

    monkeypatch.setattr(bootstrap_admin.getpass, "getpass", interrupted)
    assert bootstrap_context.run() == 1
    assert not bootstrap_context.selected
    assert capsys.readouterr().out.startswith("BOOTSTRAP_INTERRUPTED:")


@pytest.mark.parametrize(
    "code",
    ["PASSWORD_POLICY", "ALREADY_INITIALIZED", "MANUAL_RECOVERY_REQUIRED", "MIGRATION_REQUIRED"],
)
def test_existing_bootstrap_failures_are_preserved(monkeypatch, bootstrap_context, capsys, code):
    def rejected(*args):
        raise IdentityError(code)

    monkeypatch.setattr(bootstrap_admin, "bootstrap_administrator", rejected)
    assert bootstrap_context.run() == 1
    assert bootstrap_context.closed == [True]
    assert capsys.readouterr().out == f"{code}\n"


def test_configuration_diagnostics_stay_value_free(monkeypatch, bootstrap_context, capsys):
    def rejected():
        raise ConfigurationError("CONFIGURATION_INVALID: DATABASE_URL:TLS_ROOT_INVALID")

    monkeypatch.setattr(bootstrap_admin, "load_settings", rejected)
    assert bootstrap_context.run() == 1
    assert not bootstrap_context.selected
    assert capsys.readouterr().out == "CONFIGURATION_INVALID: DATABASE_URL:TLS_ROOT_INVALID\n"


def test_database_failure_does_not_print_exception_or_credentials(
    monkeypatch, bootstrap_context, capsys
):
    def rejected(*args):
        raise SQLAlchemyError("private-database-marker")

    monkeypatch.setattr(bootstrap_admin, "bootstrap_administrator", rejected)
    assert bootstrap_context.run() == 1
    assert bootstrap_context.closed == [True]
    output = capsys.readouterr().out
    assert output.startswith("BOOTSTRAP_UNAVAILABLE:")
    if "private-database-marker" in output or bootstrap_context.password in output:
        raise AssertionError("PRIVATE_BOOTSTRAP_INPUT_LOGGED")
