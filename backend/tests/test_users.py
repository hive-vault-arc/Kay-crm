"""AT-01/02/38 real PostgreSQL administrator lifecycle and denial tests."""

import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from time import monotonic, sleep
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event, func, select, text, update

from app.db.session import Database
from app.identity.models import (
    AGENCY_ID,
    Agency,
    AuditEvent,
    Credential,
    User,
    UserCommandReceipt,
)
from app.identity.security import IdentityError, csrf_token, verify_password
from app.identity.service import change_password, login
from app.identity.sessions import current_identity
from app.identity.user_contracts import EditUser, NamedUser, ResetUser, Versioned
from app.identity.users import command, read_user, read_users
from app.main import create_app
from app.settings import Settings
from tests.identity_support import create_actor, observe_two_lock_waiters
from tests.test_auth import authority
from tests.test_foundation import client_for

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def admin(settings: Settings, database: Database) -> tuple[UUID, str, str]:
    uid, email, password = create_actor(settings, database)
    with database.session() as session, session.begin():
        session.execute(
            update(Agency)
            .where(Agency.id == AGENCY_ID)
            .values(bootstrap_completed_at=datetime.now(UTC))
        )
    token, _ = login(database, settings.facade_secret.get_secret_value(), email, password)
    return uid, token, password


def create(
    settings: Settings, database: Database, token: str, role: str = "agent"
) -> dict[str, object]:
    body = NamedUser.model_validate(
        {
            "display_name": "Personnel synthétique de contrôle",
            "email": f"sp03-{uuid4().hex}@example.com",
            "role": role,
        }
    )
    return command(
        database, token, settings.facade_secret.get_secret_value(), uuid4(), "create", body
    )


def invoke(
    settings: Settings,
    database: Database,
    token: str,
    operation: str,
    uid: UUID,
    version: int,
    password: str | None = None,
) -> dict[str, object]:
    body = (
        ResetUser(expected_version=version, admin_password=password)
        if password is not None
        else Versioned(expected_version=version)
    )
    return command(
        database, token, settings.facade_secret.get_secret_value(), uuid4(), operation, body, uid
    )


def test_complete_staff_handoff_change_disable(
    settings: Settings, database: Database, caplog: pytest.LogCaptureFixture
) -> None:
    actor_id, token, _ = admin(settings, database)
    created = create(settings, database, token)
    user, temporary = created["user"], str(created["temporary_password"])
    assert isinstance(user, dict)
    uid, email = UUID(str(user["id"])), str(user["email"])
    valid_temporary = user["state"] == "pending_handoff" and len(temporary) == 32
    assert valid_temporary
    expiry = datetime.fromisoformat(str(user["temporary_expires_at"]))
    assert timedelta(hours=23, minutes=59) < expiry - datetime.now(UTC) <= timedelta(hours=24)
    with pytest.raises(IdentityError, match="INVALID_CREDENTIALS"):
        login(database, "test-secret", email, temporary)
    handed = invoke(settings, database, token, "confirm-handoff", uid, 1)
    assert isinstance(handed["user"], dict) and handed["user"]["state"] == "active"
    restricted, _ = login(database, "test-secret", email, temporary)
    with database.session() as session:
        with pytest.raises(IdentityError, match="PASSWORD_CHANGE_REQUIRED"):
            current_identity(session, restricted)
    final = secrets.token_urlsafe(24)
    change_password(database, restricted, temporary, final)
    with database.session() as session:
        with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
            current_identity(session, restricted, restricted_allowed=True)
    full, _ = login(database, "test-secret", email, final)
    invoke(settings, database, token, "disable", uid, 2)
    with database.session() as session:
        with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
            current_identity(session, full)
        assert session.get(User, uid) is not None
        assert (
            session.scalar(
                select(func.count()).select_from(AuditEvent).where(AuditEvent.actor_user_id == uid)
            )
            == 3
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.actor_user_id == actor_id, AuditEvent.target_user_id == uid)
            )
            == 3
        )
        credential = session.get(Credential, uid)
        if credential is None or not verify_password(credential.password_hash, final):
            raise AssertionError("CREDENTIAL_HASH_INVALID")
        stored = str(session.scalars(select(UserCommandReceipt.result)).all())
    if temporary in stored or temporary in caplog.text or final in caplog.text:
        raise AssertionError("TEMPORARY_SECRET_PERSISTED_OR_LOGGED")


@pytest.mark.parametrize("role", ["manager", "agent"])
@pytest.mark.anyio
async def test_every_user_route_denies_non_admin(
    settings: Settings, database: Database, role: str
) -> None:
    _, email, password = create_actor(settings, database, role=role)
    token, _ = login(database, "test-secret", email, password)
    headers = {
        **authority(settings),
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
        "Idempotency-Key": str(uuid4()),
    }
    target = uuid4()
    async with client_for(create_app(settings)) as client:
        for path in ("/api/v1/users", f"/api/v1/users/{target}"):
            assert (await client.get(path, headers=headers)).status_code == 403
        create_body = {
            "display_name": "Compte test",
            "email": f"sp03-{uuid4().hex}@example.com",
            "role": "agent",
        }
        assert (
            await client.post("/api/v1/users", headers=headers, json=create_body)
        ).status_code == 403
        assert (
            await client.patch(
                f"/api/v1/users/{target}",
                headers=headers,
                json={**create_body, "expected_version": 1},
            )
        ).status_code == 403
        for action in ("confirm-handoff", "disable", "reset-password"):
            body = {
                "expected_version": 1,
                **({"admin_password": password} if action == "reset-password" else {}),
            }
            assert (
                await client.post(f"/api/v1/users/{target}/{action}", headers=headers, json=body)
            ).status_code == 403


def test_reset_wrong_password_expiry_and_recovery(settings: Settings, database: Database) -> None:
    _, token, password = admin(settings, database)
    uid, email, old = create_actor(settings, database, role="agent")
    old_session, _ = login(database, "test-secret", email, old)
    with pytest.raises(IdentityError, match="ADMIN_PASSWORD_INVALID"):
        invoke(settings, database, token, "reset-password", uid, 1, secrets.token_urlsafe(24))
    with database.session() as session:
        current_identity(session, old_session)
        assert session.get(User, uid).version == 1
    reset = invoke(settings, database, token, "reset-password", uid, 1, password)
    temporary = str(reset["temporary_password"])
    with database.session() as session, session.begin():
        with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
            current_identity(session, old_session)
        session.execute(
            update(Credential)
            .where(Credential.user_id == uid)
            .values(temporary_expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
    with pytest.raises(IdentityError, match="TEMPORARY_EXPIRED"):
        invoke(settings, database, token, "confirm-handoff", uid, 2)
    replacement = invoke(settings, database, token, "reset-password", uid, 2, password)
    invoke(settings, database, token, "confirm-handoff", uid, 3)
    with pytest.raises(IdentityError, match="INVALID_CREDENTIALS"):
        login(database, "test-secret", email, temporary)
    login(database, "test-secret", email, str(replacement["temporary_password"]))


def test_retry_version_email_pagination_and_no_get_secret(
    settings: Settings, database: Database
) -> None:
    _, token, _ = admin(settings, database)
    secret = settings.facade_secret.get_secret_value()
    key = uuid4()
    body = NamedUser(
        display_name="Test synthétique", email=f"sp03-{uuid4().hex}@example.com", role="manager"
    )
    created = command(database, token, secret, key, "create", body)
    with pytest.raises(IdentityError, match="ONE_TIME_RESULT_UNAVAILABLE"):
        command(database, token, secret, key, "create", body)
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        command(
            database,
            token,
            secret,
            key,
            "create",
            body.model_copy(update={"display_name": "Autre"}),
        )
    with pytest.raises(IdentityError, match="EMAIL_IN_USE"):
        command(database, token, secret, uuid4(), "create", body)
    uid = UUID(str(created["user"]["id"]))
    if str(created["temporary_password"]) in str(read_user(database, token, uid)):
        raise AssertionError("PLAINTEXT_GET_FORBIDDEN")
    first, second, deep = [read_users(database, token, p, 1) for p in (1, 2, 100)]
    assert first["total"] == second["total"] == deep["total"] == 2
    assert first["items"] != second["items"] and deep["items"] == [] and first["has_next"]
    command_key = uuid4()
    edit = EditUser(**body.model_dump(), expected_version=1)
    result = command(database, token, secret, command_key, "edit", edit, uid)
    assert command(database, token, secret, command_key, "edit", edit, uid) == result
    with pytest.raises(IdentityError, match="VERSION_CONFLICT"):
        invoke(settings, database, token, "disable", uid, 1)


@pytest.mark.parametrize("operation", ["disable", "edit"])
def test_last_admin_and_expiring_admin_not_counted(
    settings: Settings, database: Database, operation: str
) -> None:
    uid, token, _ = admin(settings, database)
    create_actor(settings, database, restricted=True)
    body = (
        EditUser(
            display_name="Test",
            email=read_user(database, token, uid)["email"],
            role="agent",
            expected_version=1,
        )
        if operation == "edit"
        else Versioned(expected_version=1)
    )
    with pytest.raises(IdentityError, match="LAST_ADMIN_REQUIRED"):
        command(
            database,
            token,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            operation,
            body,
            uid,
        )


@pytest.mark.parametrize("operation", ["disable", "edit"])
def test_competing_administrators_recheck_after_actual_lock_wait(
    settings: Settings, database: Database, operation: str
) -> None:
    first_id, first_token, _ = admin(settings, database)
    second_id, second_token, _ = admin(settings, database)

    def disable_own(uid: UUID, token: str) -> str:
        try:
            if operation == "disable":
                invoke(settings, database, token, "disable", uid, 1)
            else:
                body = EditUser(
                    display_name="Compte synthétique",
                    email=read_user(database, token, uid)["email"],
                    role="agent",
                    expected_version=1,
                )
                command(
                    database,
                    token,
                    settings.facade_secret.get_secret_value(),
                    uuid4(),
                    "edit",
                    body,
                    uid,
                )
            return "OK"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as executor:
        with database.session() as blocker, blocker.begin():
            blocker.execute(select(Agency.id).with_for_update())
            futures = [
                executor.submit(disable_own, uid, proof)
                for uid, proof in ((first_id, first_token), (second_id, second_token))
            ]
            observe_two_lock_waiters(database, "agency")
        assert sorted(f.result() for f in futures) == ["LAST_ADMIN_REQUIRED", "OK"]


@pytest.mark.anyio
async def test_admin_http_create_strict_input_transport_and_no_get_secret(
    settings: Settings, database: Database, caplog: pytest.LogCaptureFixture
) -> None:
    uid, token, password = admin(settings, database)
    headers = {
        **authority(settings),
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
        "Idempotency-Key": str(uuid4()),
    }
    body = {
        "display_name": "Compte synthétique",
        "email": f"sp03-{uuid4().hex}@example.com",
        "role": "administrator",
    }
    async with client_for(create_app(settings)) as client:
        assert (await client.post("/api/v1/users", json=body)).status_code == 403
        assert (
            await client.post("/api/v1/users", json=body, headers={**headers, "Origin": "null"})
        ).status_code == 403
        assert (
            await client.post(
                "/api/v1/users", json=body, headers={**headers, "X-CSRF-Token": "wrong"}
            )
        ).status_code == 403
        for invalid in (
            {**body, "password": password},
            {**body, "role": "owner"},
            {**body, "display_name": " "},
            {**body, "email": "bad"},
        ):
            response = await client.post("/api/v1/users", json=invalid, headers=headers)
            assert response.status_code == 422
            if password in response.text:
                raise AssertionError("VALIDATION_SECRET_ECHO")
        assert (
            await client.post(
                "/api/v1/users",
                json=body,
                headers={k: v for k, v in headers.items() if k != "Idempotency-Key"},
            )
        ).status_code == 422
        response = await client.post("/api/v1/users", json=body, headers=headers)
        assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
        target = response.json()["user"]["id"]
        temporary = response.json()["temporary_password"]
        assert (await client.post("/api/v1/users", json=body, headers=headers)).status_code == 409
        for path in ("/api/v1/users?page=1&page_size=100", f"/api/v1/users/{target}"):
            safe = await client.get(path, headers=headers)
            assert safe.status_code == 200
            if temporary in safe.text or "password_hash" in safe.text:
                raise AssertionError("PRIVATE_GET_PROJECTION_FAILED")
        for query in ("page=0", "page_size=101", "sort=+email", "unknown=1"):
            assert (await client.get(f"/api/v1/users?{query}", headers=headers)).status_code == 422
        assert (await client.get(f"/api/v1/users/{uuid4()}", headers=headers)).status_code == 404
        assert (
            await client.patch(
                f"/api/v1/users/{target}", json={**body, "expected_version": True}, headers=headers
            )
        ).status_code == 422
        own_reset = await client.post(
            f"/api/v1/users/{uid}/reset-password",
            json={"expected_version": 1, "admin_password": password},
            headers={**headers, "Idempotency-Key": str(uuid4())},
        )
        assert own_reset.status_code == 409
    if temporary in caplog.text or password in caplog.text:
        raise AssertionError("PASSWORD_LOGGED")


def test_reset_interruption_preserves_prior_sessions_and_credentials(
    settings: Settings, database: Database
) -> None:
    _, token, password = admin(settings, database)
    uid, email, previous = create_actor(settings, database, role="agent")
    proof, _ = login(database, "test-secret", email, previous)

    def interrupt(session: object, context: object) -> None:
        if any(
            isinstance(item, AuditEvent) and item.action == "users.reset-password"
            for item in session.new
        ):
            raise RuntimeError("RESET_INTERRUPTED")

    event.listen(database.sessions, "after_flush", interrupt)
    try:
        with pytest.raises(RuntimeError, match="RESET_INTERRUPTED"):
            invoke(settings, database, token, "reset-password", uid, 1, password)
    finally:
        event.remove(database.sessions, "after_flush", interrupt)
    with database.session() as session:
        current_identity(session, proof)
        if not verify_password(session.get(Credential, uid).password_hash, previous):
            raise AssertionError("PREVIOUS_CREDENTIAL_NOT_PRESERVED")
        assert session.get(User, uid).version == 1


def test_expired_activated_temporary_cannot_login_or_continue(
    settings: Settings, database: Database
) -> None:
    _, token, _ = admin(settings, database)
    created = create(settings, database, token)
    uid = UUID(created["user"]["id"])
    invoke(settings, database, token, "confirm-handoff", uid, 1)
    proof, _ = login(
        database, "test-secret", created["user"]["email"], created["temporary_password"]
    )
    with database.session() as session, session.begin():
        session.execute(
            update(Credential)
            .where(Credential.user_id == uid)
            .values(temporary_expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
    with database.session() as session:
        with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
            current_identity(session, proof, restricted_allowed=True)
    with pytest.raises(IdentityError, match="INVALID_CREDENTIALS"):
        login(database, "test-secret", created["user"]["email"], created["temporary_password"])


def test_actor_demoted_while_waiting_cannot_commit_an_admin_command(
    settings: Settings, database: Database
) -> None:
    actor_id, token, _ = admin(settings, database)
    target, _, _ = create_actor(settings, database, role="agent")

    def attempt() -> str:
        try:
            invoke(settings, database, token, "disable", target, 1)
            return "UNEXPECTED_SUCCESS"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=1) as executor:
        with database.session() as blocker, blocker.begin():
            blocker.execute(select(Agency.id).with_for_update())
            future = executor.submit(attempt)
            deadline = monotonic() + 1.5
            waiting = 0
            while monotonic() < deadline:
                with database.session() as observer:
                    waiting = observer.scalar(
                        text(
                            "SELECT count(*) FROM pg_stat_activity "
                            "WHERE datname=current_database() AND wait_event_type='Lock' "
                            "AND query LIKE '%agency%FOR UPDATE%'"
                        )
                    )
                if waiting == 1:
                    break
                sleep(0.01)
            assert waiting == 1
            blocker.execute(update(User).where(User.id == actor_id).values(role="agent", version=2))
        assert future.result() == "UNAUTHENTICATED"
    with database.session() as session:
        assert session.get(User, target).state == "active"


def test_reset_retry_never_reissues_or_retrieves_plaintext(
    settings: Settings, database: Database
) -> None:
    _, token, password = admin(settings, database)
    uid, _, _ = create_actor(settings, database, role="agent")
    key = uuid4()
    body = ResetUser(expected_version=1, admin_password=password)
    secret = settings.facade_secret.get_secret_value()
    issued = command(database, token, secret, key, "reset-password", body, uid)
    with pytest.raises(IdentityError, match="ONE_TIME_RESULT_UNAVAILABLE"):
        command(database, token, secret, key, "reset-password", body, uid)
    with database.session() as session:
        assert session.get(User, uid).version == 2
        assert session.get(Credential, uid).version == 2
        assert (
            session.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(
                    AuditEvent.target_user_id == uid, AuditEvent.action == "users.reset-password"
                )
            )
            == 1
        )
        receipts = str(session.scalars(select(UserCommandReceipt.result)).all())
        if str(issued["temporary_password"]) in receipts or password in receipts:
            raise AssertionError("RESET_RECEIPT_CONTAINS_PASSWORD")


def test_interrupted_command_rolls_back_account_receipt_audit(
    settings: Settings, database: Database
) -> None:
    _, token, _ = admin(settings, database)

    def stop_before_commit(*_: object) -> None:
        raise RuntimeError("SYNTHETIC_INTERRUPTION")

    event.listen(database.sessions, "before_commit", stop_before_commit)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_INTERRUPTION"):
            create(settings, database, token)
    finally:
        event.remove(database.sessions, "before_commit", stop_before_commit)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(User)) == 1
        assert session.scalar(select(func.count()).select_from(UserCommandReceipt)) == 0
        assert (
            session.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.action.like("users.%"))
            )
            == 0
        )
