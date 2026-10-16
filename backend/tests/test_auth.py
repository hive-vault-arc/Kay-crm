"""AT-02/26/39 session variants against actual guarded PostgreSQL."""

import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Barrier
from typing import Annotated

import pytest
from fastapi import Depends, Request
from sqlalchemy import event, func, select, update

from app.db.session import Database
from app.identity.models import AuditEvent, Credential, LoginRateBucket, StaffSession, User
from app.identity.rate_limit import consume_login_budget
from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError, csrf_token, keyed_digest, token_hash
from app.identity.service import change_password, login
from app.identity.sessions import current_identity, require_role
from app.main import create_app
from app.settings import Settings
from tests.identity_support import create_actor, observe_two_lock_waiters
from tests.test_foundation import client_for

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def authority(settings: Settings) -> dict[str, str]:
    return {
        "X-Kay-Facade-Secret": settings.facade_secret.get_secret_value(),
        "Origin": settings.frontend_origin,
    }


@pytest.mark.anyio
async def test_login_me_logout_facade_and_csrf(settings: Settings, database: Database) -> None:
    user_id, email, password = create_actor(settings, database)
    async with client_for(create_app(settings)) as client:
        headers = authority(settings)
        for path in ("login", "logout", "change-password"):
            response = await client.post(f"/api/v1/auth/{path}", json={})
            assert response.status_code == 403
        assert (await client.get("/api/v1/auth/me")).status_code == 403
        assert (await client.post("/api/v1/auth/bootstrap", json={})).status_code == 404
        assert (
            await client.post(
                "/api/v1/auth/login",
                headers={**headers, "Origin": "https://foreign.example"},
                json={"email": email, "password": password},
            )
        ).status_code == 403
        response = await client.post(
            "/api/v1/auth/login",
            headers=headers,
            json={"email": email.upper(), "password": password},
        )
        assert response.status_code == 200
        raw_token = response.json()["session_token"]
        expires = datetime.fromisoformat(response.json()["expires_at"])
        assert timedelta(days=6, hours=23) < expires - datetime.now(UTC) <= timedelta(days=7)
        headers["X-Kay-Session"] = raw_token
        me = await client.get("/api/v1/auth/me", headers=headers)
        assert me.status_code == 200 and me.json()["user"]["id"] == str(user_id)
        assert not me.json()["must_change_password"]
        assert me.headers["cache-control"] == "no-store"
        if raw_token in me.text or password in me.text:
            raise AssertionError("SENSITIVE_AUTH_RESPONSE")
        csrf = me.json()["csrf_token"]
        for bad_headers in (
            headers,
            {**headers, "X-CSRF-Token": secrets.token_hex(32)},
            {**headers, "X-CSRF-Token": csrf, "Origin": "null"},
        ):
            denied = await client.post("/api/v1/auth/logout", headers=bad_headers, json={})
            assert denied.status_code == 403
        headers["X-CSRF-Token"] = csrf
        assert (
            await client.post("/api/v1/auth/logout", headers=headers, json={})
        ).status_code == 200
        assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 401
    with database.session() as session:
        stored = session.scalar(select(StaffSession))
        if not stored or stored.token_hash != token_hash(raw_token) or not stored.revoked_at:
            raise AssertionError("SESSION_HASH_OR_REVOCATION_INVALID")
        assert session.scalar(select(func.count()).select_from(AuditEvent)) == 2


@pytest.mark.anyio
async def test_invalid_signin_is_generic_bounded_and_redacted(
    settings: Settings, database: Database, caplog: pytest.LogCaptureFixture
) -> None:
    _, email, password = create_actor(settings, database, state="pending_handoff", restricted=True)
    async with client_for(create_app(settings)) as client:
        for identity, candidate in (
            (email, password),
            (email, secrets.token_urlsafe(24)),
            ("sp03-unknown@example.com", password),
        ):
            response = await client.post(
                "/api/v1/auth/login",
                headers=authority(settings),
                json={"email": identity, "password": candidate},
            )
            assert response.status_code == 401
            assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"
            if candidate in response.text or candidate in caplog.text:
                raise AssertionError("SENSITIVE_ERROR_OR_LOG")
        invalid = await client.post(
            "/api/v1/auth/login",
            headers=authority(settings),
            json={"email": email, "password": password, "role": "administrator"},
        )
        assert invalid.status_code == 422
        if password in invalid.text:
            raise AssertionError("SENSITIVE_VALIDATION_RESPONSE")
        huge = await client.post(
            "/api/v1/auth/login", headers=authority(settings), content=secrets.token_hex(5000)
        )
        assert huge.status_code == 413
    if password in caplog.text:
        raise AssertionError("SENSITIVE_LOG_OUTPUT")


@pytest.mark.parametrize(
    "changed",
    [
        "disabled",
        "pending",
        "role",
        "user_version",
        "credential_version",
        "expired",
        "revoked",
        "temporary_expired",
        "handoff_removed",
    ],
)
def test_current_state_invalidates_session(
    changed: str, settings: Settings, database: Database
) -> None:
    user_id, email, password = create_actor(
        settings, database, restricted=changed in {"temporary_expired", "handoff_removed"}
    )
    token, _ = login(database, settings.facade_secret.get_secret_value(), email, password)
    with database.session() as session, session.begin():
        if changed in {"disabled", "pending", "role", "user_version"}:
            values: dict[str, object] = {
                "disabled": {"state": "disabled"},
                "pending": {"state": "pending_handoff"},
                "role": {"role": "agent"},
                "user_version": {"version": 2},
            }[changed]
            session.execute(update(User).where(User.id == user_id).values(**values))
        elif changed in {"credential_version", "temporary_expired", "handoff_removed"}:
            changes = {
                "credential_version": {"version": 2},
                "temporary_expired": {
                    "temporary_expires_at": datetime.now(UTC) - timedelta(seconds=1)
                },
                "handoff_removed": {"handoff_confirmed_at": None},
            }[changed]
            session.execute(
                update(Credential).where(Credential.user_id == user_id).values(**changes)
            )
        else:
            session.execute(
                update(StaffSession)
                .where(StaffSession.user_id == user_id)
                .values(
                    **(
                        {"revoked_at": datetime.now(UTC)}
                        if changed == "revoked"
                        else {
                            "created_at": datetime.now(UTC) - timedelta(days=7),
                            "expires_at": datetime.now(UTC) - timedelta(days=1),
                        }
                    )
                )
            )
    with database.session() as session, pytest.raises(IdentityError, match="UNAUTHENTICATED"):
        current_identity(session, token, restricted_allowed=True)


@pytest.mark.anyio
async def test_restricted_routes_change_and_fresh_login(
    settings: Settings, database: Database
) -> None:
    user_id, email, password = create_actor(settings, database, restricted=True)
    application = create_app(settings)

    # Fixture-only business boundary, not a product or public bootstrap route.
    @application.get("/test/full", dependencies=[Depends(facade_authority)])
    def full(request: Request, token: Annotated[str, Depends(session_proof)]) -> dict[str, bool]:
        with request.app.state.database.session() as session:
            identity = current_identity(session, token)
            require_role(identity, {"administrator"})
        return {"allowed": True}

    secret = settings.facade_secret.get_secret_value()
    token, _ = login(database, secret, email, password)
    other_token, _ = login(database, secret, email, password)
    headers = {
        **authority(settings),
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(secret, token),
    }
    new_password = secrets.token_urlsafe(24)
    async with client_for(application) as client:
        assert (await client.get("/test/full", headers=headers)).status_code == 403
        assert (await client.get("/api/v1/auth/me", headers=headers)).json()["must_change_password"]
        for old, new, status in (
            (password, secrets.token_hex(5), 422),
            (secrets.token_urlsafe(24), new_password, 401),
            (password, password, 422),
        ):
            response = await client.post(
                "/api/v1/auth/change-password",
                headers=headers,
                json={"old_password": old, "new_password": new},
            )
            assert response.status_code == status
        success = await client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={"old_password": password, "new_password": new_password},
        )
        assert success.status_code == 200 and success.json()["fresh_login_required"]
        for stale in (token, other_token):
            assert (
                await client.get("/api/v1/auth/me", headers={**headers, "X-Kay-Session": stale})
            ).status_code == 401
        with pytest.raises(IdentityError, match="INVALID_CREDENTIALS"):
            login(database, secret, email, password)
        fresh, _ = login(database, secret, email, new_password)
        fresh_headers = {**headers, "X-Kay-Session": fresh}
        assert (await client.get("/test/full", headers=fresh_headers)).status_code == 200
        assert not (await client.get("/api/v1/auth/me", headers=fresh_headers)).json()[
            "must_change_password"
        ]
    with database.session() as session:
        credential = session.get(Credential, user_id)
        assert credential and credential.version == 2 and credential.temporary_expires_at is None


def test_session_csrf_is_bound_and_password_change_rolls_back(
    settings: Settings, database: Database
) -> None:
    _, email, password = create_actor(settings, database)
    secret = settings.facade_secret.get_secret_value()
    first, _ = login(database, secret, email, password)
    second, _ = login(database, secret, email, password)
    if first == second or csrf_token(secret, first) == csrf_token(secret, second):
        raise AssertionError("SESSION_PROOF_NOT_ROTATED")
    with pytest.raises(IdentityError, match="INVALID_CREDENTIALS"):
        change_password(database, first, secrets.token_urlsafe(24), secrets.token_urlsafe(24))
    with database.session() as session:
        identity = current_identity(session, first)
        require_role(identity, {"administrator"})
        require_role(identity, {"manager"})
        with pytest.raises(IdentityError, match="FORBIDDEN"):
            require_role(identity, set())


def test_rate_limit_persists_and_is_atomic(settings: Settings, database: Database) -> None:
    secret = settings.facade_secret.get_secret_value()
    email = "sp03-rate@example.com"
    barrier = Barrier(8)

    def attempt(_: int) -> str:
        barrier.wait(timeout=10)
        try:
            consume_login_budget(database, secret, email)
            return "allowed"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=8) as executor:
        outcomes = list(executor.map(attempt, range(8)))
    assert outcomes.count("allowed") == 5 and outcomes.count("RATE_LIMITED") == 3
    with database.session() as session, session.begin():
        record = session.get(LoginRateBucket, keyed_digest(secret, "rate-identity", email))
        assert record and record.attempts == 8
        record.window_started_at = datetime.now(UTC) - timedelta(minutes=16)
    consume_login_budget(database, secret, email)


def test_concurrent_password_change_has_one_winner(settings: Settings, database: Database) -> None:
    user_id, email, password = create_actor(settings, database)
    secret = settings.facade_secret.get_secret_value()
    token, _ = login(database, secret, email, password)
    replacements = [secrets.token_urlsafe(24), secrets.token_urlsafe(24)]

    def attempt(index: int) -> str:
        try:
            change_password(database, token, password, replacements[index])
            return "changed"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as executor:
        with database.session() as holder:
            holder.execute(select(User).where(User.id == user_id).with_for_update())
            futures = [executor.submit(attempt, index) for index in (0, 1)]
            try:
                observe_two_lock_waiters(database, "user")
            finally:
                holder.rollback()
        outcomes = [future.result(timeout=10) for future in futures]
    assert sorted(outcomes) == ["UNAUTHENTICATED", "changed"]
    with database.session() as session:
        credential = session.get(Credential, user_id)
        assert credential and credential.version == 2
        with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
            current_identity(session, token)


def test_interrupted_password_change_rolls_back(settings: Settings, database: Database) -> None:
    user_id, email, password = create_actor(settings, database)
    secret = settings.facade_secret.get_secret_value()
    token, _ = login(database, secret, email, password)

    def interrupt(*_: object) -> None:
        raise RuntimeError("SYNTHETIC_TRANSACTION_INTERRUPTION")

    event.listen(AuditEvent, "before_insert", interrupt)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_TRANSACTION_INTERRUPTION"):
            change_password(database, token, password, secrets.token_urlsafe(24))
    finally:
        event.remove(AuditEvent, "before_insert", interrupt)
    with database.session() as session:
        credential = session.get(Credential, user_id)
        assert credential and credential.version == 1
        current_identity(session, token)
    login(database, secret, email, password)


@pytest.mark.parametrize("role", ["administrator", "manager", "agent"])
def test_role_inheritance_and_admin_only_denial(
    role: str, settings: Settings, database: Database
) -> None:
    _, email, password = create_actor(settings, database, role=role)
    token, _ = login(database, settings.facade_secret.get_secret_value(), email, password)
    with database.session() as session:
        identity = current_identity(session, token)
        if role in {"administrator", "manager"}:
            require_role(identity, {"manager"})
        else:
            with pytest.raises(IdentityError, match="FORBIDDEN"):
                require_role(identity, {"manager"})
        if role == "administrator":
            require_role(identity, {"administrator"})
        else:
            with pytest.raises(IdentityError, match="FORBIDDEN"):
                require_role(identity, {"administrator"})
