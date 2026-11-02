from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.identity import local_admin_recovery as recovery
from app.identity.security import IdentityError


@pytest.mark.parametrize(
    ("environment", "configured", "actual_name", "address"),
    [
        ("production", "postgresql+psycopg://u:p@127.0.0.1/kayrealestate", "kayrealestate", "127.0.0.1"),
        ("development", "postgresql+psycopg://u:p@example.com/kayrealestate", "kayrealestate", "127.0.0.1"),
        ("development", "postgresql+psycopg://u:p@127.0.0.1/kayrealestate", "other", "127.0.0.1"),
        ("development", "postgresql+psycopg://u:p@127.0.0.1/kayrealestate", "kayrealestate", "203.0.113.8"),
    ],
)
def test_recovery_refuses_nonlocal_or_non_development_targets(
    environment: str, configured: str, actual_name: str, address: str
) -> None:
    with pytest.raises(IdentityError, match="LOCAL_DEVELOPMENT_DATABASE_REQUIRED"):
        recovery.require_local_development_database(environment, configured, actual_name, address)


def test_recovery_accepts_local_postgresql_alias_and_loopback() -> None:
    recovery.require_local_development_database(
        "development",
        "postgresql+psycopg://u:p@localhost:55432/kayrealestate",
        "kayrealestate",
        "127.0.0.1/32",
    )


class FakeSession:
    def __init__(self, agency: object, administrators: list[object], credential: object) -> None:
        self.agency = agency
        self.administrators = administrators
        self.credential = credential
        self.added: list[object] = []
        self.executed: list[object] = []
        self.flushed = False

    def __enter__(self) -> "FakeSession":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def begin(self) -> "FakeSession":
        return self

    def scalar(self, statement: object) -> object:
        query = str(statement)
        return self.agency if 'FROM agency' in query else self.credential

    def scalars(self, statement: object) -> list[object]:
        return self.administrators

    def execute(self, statement: object) -> None:
        self.executed.append(statement)

    def add(self, value: object) -> None:
        self.added.append(value)

    def flush(self) -> None:
        self.flushed = True


class FakeDatabase:
    def __init__(self, session: FakeSession) -> None:
        self.fake_session = session

    def session(self) -> FakeSession:
        return self.fake_session


def make_admin(*, initialized: bool = True) -> tuple[FakeDatabase, object, object, FakeSession]:
    admin = SimpleNamespace(
        id=uuid4(), email="admin@example.test", role="administrator", state="active", deleted_at=None,
        version=1, updated_at=None,
    )
    credential = SimpleNamespace(
        user_id=admin.id, password_hash="old-hash", must_change_password=True,
        temporary_expires_at=datetime.now(UTC), version=2,
    )
    agency = SimpleNamespace(bootstrap_completed_at=datetime.now(UTC) if initialized else None)
    session = FakeSession(agency, [admin], credential)
    return FakeDatabase(session), admin, credential, session


def test_recovery_updates_only_credential_revokes_sessions_and_audits(monkeypatch: pytest.MonkeyPatch) -> None:
    database, admin, credential, session = make_admin()
    monkeypatch.setattr(recovery, "hash_password", lambda password: "new-argon2-hash")

    recovery.recover_only_local_administrator(
        database, "synthetic-facade-secret", "a-private-password-over-twelve"
    )

    assert credential.password_hash == "new-argon2-hash"
    assert credential.must_change_password is False
    assert credential.temporary_expires_at is None
    assert credential.version == 3
    assert admin.version == 2
    assert admin.updated_at is not None
    assert len(session.executed) == 2 and session.flushed
    event = session.added[-1]
    assert event.actor_user_id == admin.id
    assert event.target_user_id == admin.id
    assert event.action == "identity.local_admin_password_recovered"


def test_recovery_fails_closed_without_bootstrap(monkeypatch: pytest.MonkeyPatch) -> None:
    database, _, credential, _ = make_admin(initialized=False)
    monkeypatch.setattr(recovery, "hash_password", lambda password: "new-argon2-hash")

    with pytest.raises(IdentityError, match="BOOTSTRAP_REQUIRED"):
        recovery.recover_only_local_administrator(
            database, "synthetic-facade-secret", "a-private-password-over-twelve"
        )

    assert credential.password_hash == "old-hash"


def test_recovery_refuses_multiple_administrators(monkeypatch: pytest.MonkeyPatch) -> None:
    database, admin, credential, _ = make_admin()
    database.fake_session.administrators.append(
        SimpleNamespace(id=uuid4(), role="administrator", state="active", deleted_at=None)
    )
    monkeypatch.setattr(recovery, "hash_password", lambda password: "new-argon2-hash")

    with pytest.raises(IdentityError, match="RECOVERY_TARGET_AMBIGUOUS"):
        recovery.recover_only_local_administrator(
            database, "synthetic-facade-secret", "a-private-password-over-twelve"
        )

    assert credential.password_hash == "old-hash"
    assert admin.version == 1
