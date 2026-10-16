"""AT-37 real PostgreSQL rollback/race and actual Windows pseudo-terminal."""

import getpass
import io
import os
import secrets
import subprocess
import sys
import warnings
from concurrent.futures import ThreadPoolExecutor
from time import monotonic

import pytest
from sqlalchemy import event, func, select

from app.cli import bootstrap_admin
from app.db.session import Database
from app.identity.bootstrap import bootstrap_administrator
from app.identity.models import AGENCY_ID, Agency, AuditEvent, Credential, User
from app.identity.security import IdentityError, hash_password, verify_password
from app.runtime import BACKEND_ROOT
from app.settings import Settings
from tests.identity_support import create_actor, observe_two_lock_waiters

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_password_boundary_and_invalid_identity(database: Database) -> None:
    with pytest.raises(IdentityError, match="PASSWORD_POLICY"):
        hash_password(secrets.token_urlsafe(24)[:11])
    twelve = secrets.token_urlsafe(24)[:12]
    assert verify_password(hash_password(twelve), twelve)
    for name, email in (("", "sp03-invalid@example.com"), ("Compte", "invalid")):
        with pytest.raises(IdentityError, match="VALIDATION_ERROR"):
            bootstrap_administrator(database, name, email, secrets.token_urlsafe(24))


def count(database: Database, model: type[User] | type[Credential] | type[AuditEvent]) -> int:
    with database.session() as session:
        return session.scalar(select(func.count()).select_from(model)) or 0


def test_atomic_bootstrap_and_repeat(database: Database) -> None:
    password = secrets.token_urlsafe(24)
    user_id = bootstrap_administrator(
        database, "Administrateur synthétique", " SP03-BOOT@example.com ", password
    )
    assert [count(database, model) for model in (User, Credential, AuditEvent)] == [1, 1, 1]
    with database.session() as session:
        user = session.get(User, user_id)
        credential = session.get(Credential, user_id)
        agency = session.get(Agency, AGENCY_ID)
        assert user and user.email == "sp03-boot@example.com" and user.role == "administrator"
        assert credential and credential.password_hash.startswith("$argon2id$")
        if password in credential.password_hash:
            raise AssertionError("PLAINTEXT_CREDENTIAL_STORED")
        assert not credential.must_change_password
        assert agency and agency.bootstrap_completed_at
    with pytest.raises(IdentityError, match="ALREADY_INITIALIZED"):
        bootstrap_administrator(database, "Autre", "sp03-other@example.com", password)
    assert count(database, User) == 1


def test_existing_user_requires_manual_recovery(settings: Settings, database: Database) -> None:
    create_actor(settings, database, role="agent")
    with pytest.raises(IdentityError, match="MANUAL_RECOVERY_REQUIRED"):
        bootstrap_administrator(
            database, "Autre", "sp03-other@example.com", secrets.token_urlsafe(24)
        )
    assert count(database, User) == 1


def test_completed_marker_and_no_user_still_refuses(database: Database) -> None:
    from datetime import UTC, datetime

    with database.session() as session, session.begin():
        agency = session.get(Agency, AGENCY_ID)
        assert agency
        agency.bootstrap_completed_at = datetime.now(UTC)
    with pytest.raises(IdentityError, match="ALREADY_INITIALIZED"):
        bootstrap_administrator(
            database, "Autre", "sp03-other@example.com", secrets.token_urlsafe(24)
        )
    assert count(database, User) == 0


def test_interrupt_before_commit_leaves_no_partial_identity(database: Database) -> None:
    def interrupt(*_: object) -> None:
        raise KeyboardInterrupt

    event.listen(AuditEvent, "before_insert", interrupt)
    try:
        with pytest.raises(KeyboardInterrupt):
            bootstrap_administrator(
                database, "Interruption", "sp03-interrupt@example.com", secrets.token_urlsafe(24)
            )
    finally:
        event.remove(AuditEvent, "before_insert", interrupt)
    assert [count(database, model) for model in (User, Credential, AuditEvent)] == [0, 0, 0]
    with database.session() as session:
        agency = session.get(Agency, AGENCY_ID)
        assert agency and agency.bootstrap_completed_at is None


def test_two_connections_exactly_one_success(database: Database) -> None:
    def attempt(index: int) -> str:
        try:
            bootstrap_administrator(
                database,
                "Course synthétique",
                f"sp03-race-{index}@example.com",
                secrets.token_urlsafe(24),
            )
            return "created"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as executor:
        with database.session() as holder:
            holder.execute(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            futures = [executor.submit(attempt, index) for index in (1, 2)]
            try:
                observe_two_lock_waiters(database, "agency")
            finally:
                holder.rollback()
        outcomes = [future.result(timeout=10) for future in futures]
    assert sorted(outcomes) == ["ALREADY_INITIALIZED", "created"]
    assert [count(database, model) for model in (User, Credential, AuditEvent)] == [1, 1, 1]


def test_non_tty_refuses_without_reading_or_echoing(database: Database) -> None:
    result = subprocess.run(  # noqa: S603 - fixed module, explicit venv, no secret input.
        [sys.executable, "-m", "app.cli.bootstrap_admin"],
        cwd=BACKEND_ROOT,
        env={**os.environ, "APP_ENVIRONMENT": "test"},
        input="",
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert result.returncode == 2 and "TTY_REQUIRED" in result.stdout
    assert count(database, User) == 0


def test_arguments_are_refused_without_echo(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    argument = secrets.token_urlsafe(24)
    monkeypatch.setattr(sys, "argv", ["bootstrap_admin", argument])
    assert bootstrap_admin.main() == 2
    captured = capsys.readouterr()
    assert "ARGUMENTS_NOT_ALLOWED" in captured.out
    if argument in captured.out:
        raise AssertionError("ARGUMENT_ECHOED")


def test_hidden_prompt_fallback_fails_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    class Terminal(io.StringIO):
        def isatty(self) -> bool:
            return True

    output = Terminal()
    monkeypatch.setattr(sys, "argv", ["bootstrap_admin"])
    monkeypatch.setattr(sys, "stdin", Terminal())
    monkeypatch.setattr(sys, "stdout", output)
    inputs = iter(["Compte synthétique", "sp03-fallback@example.com"])
    monkeypatch.setattr("builtins.input", lambda _: next(inputs))

    def unavailable(_: str) -> str:
        warnings.warn("Hidden prompt unavailable", getpass.GetPassWarning, stacklevel=2)
        raise AssertionError("FALLBACK_MUST_NOT_READ_INPUT")

    monkeypatch.setattr(getpass, "getpass", unavailable)
    assert bootstrap_admin.main() == 2 and "TTY_REQUIRED" in output.getvalue()


@pytest.mark.parametrize("case", ["valid", "weak", "mismatch", "interrupt", "repeat"])
def test_real_hidden_tty(case: str, database: Database) -> None:
    from winpty import PtyProcess

    if case == "repeat":
        bootstrap_administrator(
            database, "Compte synthétique", "sp03-existing@example.com", secrets.token_urlsafe(24)
        )

    process = PtyProcess.spawn(
        [sys.executable, "-m", "app.cli.bootstrap_admin"],
        cwd=str(BACKEND_ROOT),
        dimensions=(30, 160),
        env={**os.environ, "APP_ENVIRONMENT": "test", "PYTHONIOENCODING": "utf-8"},
    )
    password = secrets.token_urlsafe(24) if case != "weak" else secrets.token_hex(5)
    confirmation = secrets.token_urlsafe(24) if case == "mismatch" else password
    captured = ""

    def until(fragment: str) -> None:
        nonlocal captured
        deadline = monotonic() + 20
        process.fileobj.settimeout(20)
        while fragment not in captured:
            if monotonic() > deadline:
                raise AssertionError("TTY_PROMPT_TIMEOUT")
            try:
                captured += process.read()
            except EOFError:
                raise AssertionError("TTY_ENDED_BEFORE_EXPECTED_STATE") from None

    try:
        until("Nom affich")
        process.write("Compte synthétique\r")
        until("Adresse e-mail")
        process.write("sp03-tty@example.com\r")
        until("minimum)")
        if case == "interrupt":
            process.write("\x03")
            until("BOOTSTRAP_INTERRUPTED")
        else:
            process.write(password + "\r")
            until("Confirmez")
            process.write(confirmation + "\r")
            expected = {
                "valid": "BOOTSTRAP_COMPLETED",
                "weak": "PASSWORD_POLICY",
                "mismatch": "PASSWORD_MISMATCH",
                "repeat": "ALREADY_INITIALIZED",
            }[case]
            until(expected)
        if password in captured or confirmation in captured:
            raise AssertionError("HIDDEN_INPUT_ECHOED")
    finally:
        process.close(force=True)
    assert count(database, User) == (1 if case in {"valid", "repeat"} else 0)
