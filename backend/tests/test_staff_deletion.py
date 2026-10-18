"""Owner-requested staff lifecycle preserves credentials and authored business history."""

import secrets
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event, func, select
from sqlalchemy.orm import Session

from app.contacts.history_models import TimelineEvent
from app.contacts.models import Contact, Enquiry
from app.identity.models import AuditEvent, Credential, StaffSession, User, UserCommandReceipt
from app.identity.security import IdentityError, csrf_token
from app.identity.service import login
from app.identity.sessions import current_identity
from app.identity.user_contracts import EditUser, NewUser, ResetUser, Versioned
from app.identity.users import command, read_user, read_users
from app.main import create_app
from tests.contact_support import create_lead
from tests.identity_support import create_actor
from tests.test_auth import authority
from tests.test_foundation import client_for
from tests.test_isolation_migrations import migrate
from tests.test_users import admin, create

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def delete_staff(settings, database, token, uid, key=None):
    return command(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        key or uuid4(),
        "delete",
        Versioned(expected_version=1),
        uid,
    )


def test_delete_hides_account_and_retains_authored_records(settings, database):
    _, token, _ = admin(settings, database)
    uid, email, password = create_actor(settings, database, role="agent")
    staff, _ = login(database, "test-secret", email, password)
    lead = create_lead(settings, database, staff)
    eid, cid = UUID(lead["id"]), UUID(lead["contact"]["id"])
    with database.session() as session:
        history = [tuple(row) for row in session.execute(select(TimelineEvent.__table__))]
        credential_hash = session.get(Credential, uid).password_hash
    key = uuid4()
    result = delete_staff(settings, database, token, uid, key)
    assert delete_staff(settings, database, token, uid, key) == result
    assert read_users(database, token, 1, 50)["total"] == 1
    assert read_users(database, token, 10, 50)["items"] == []
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_user(database, token, uid)
    with pytest.raises(IdentityError, match="INVALID_CREDENTIALS"):
        login(database, "test-secret", email, password)
    with database.session() as session:
        with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
            current_identity(session, staff)
        assert session.get(User, uid).deleted_at is not None
        assert session.get(Contact, cid) is not None and session.get(Enquiry, eid) is not None
        unchanged = history == [
            tuple(row) for row in session.execute(select(TimelineEvent.__table__))
        ]
        if not unchanged or credential_hash != session.get(Credential, uid).password_hash:
            raise AssertionError("DELETION_CHANGED_PROTECTED_HISTORY_OR_CREDENTIAL")
        assert (
            session.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.target_user_id == uid, AuditEvent.action == "users.delete")
            )
            == 1
        )
        assert all(
            row.revoked_at
            for row in session.scalars(select(StaffSession).where(StaffSession.user_id == uid))
        )
    for operation, body in [
        (
            "edit",
            EditUser(display_name="Synthétique", email=email, role="agent", expected_version=2),
        ),
        (
            "reset-password",
            ResetUser(
                expected_version=2,
                admin_password=password,
                temporary_password=secrets.token_urlsafe(24),
            ),
        ),
        ("delete", Versioned(expected_version=2)),
    ]:
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            command(
                database,
                token,
                settings.facade_secret.get_secret_value(),
                uuid4(),
                operation,
                body,
                uid,
            )
    assert migrate("downgrade", "0025_scoped_activities").returncode != 0
    assert migrate("check").returncode == 0


def test_concurrent_same_key_delete_has_single_effect(settings, database):
    _, token, _ = admin(settings, database)
    uid, _, _ = create_actor(settings, database, role="agent")
    key = uuid4()
    with ThreadPoolExecutor(max_workers=2) as pool:
        calls = [pool.submit(delete_staff, settings, database, token, uid, key) for _ in range(2)]
        assert calls[0].result() == calls[1].result()
    with database.session() as session:
        assert session.get(User, uid).version == 2
        assert (
            session.scalar(
                select(func.count())
                .select_from(UserCommandReceipt)
                .where(UserCommandReceipt.key == key)
            )
            == 1
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.action == "users.delete")
            )
            == 1
        )
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        delete_staff(settings, database, token, uid)
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        command(
            database,
            token,
            settings.facade_secret.get_secret_value(),
            key,
            "delete",
            Versioned(expected_version=2),
            uid,
        )


def test_interrupted_delete_rolls_back_access_and_receipt(settings, database):
    _, token, _ = admin(settings, database)
    uid, email, password = create_actor(settings, database, role="agent")
    staff, _ = login(database, "test-secret", email, password)
    key = uuid4()

    def interrupted(session):
        raise RuntimeError("SIMULATED_INTERRUPT")

    event.listen(Session, "before_commit", interrupted)
    try:
        with pytest.raises(RuntimeError, match="SIMULATED_INTERRUPT"):
            delete_staff(settings, database, token, uid, key)
    finally:
        event.remove(Session, "before_commit", interrupted)
    with database.session() as session:
        current_identity(session, staff)
        assert session.get(User, uid).deleted_at is None
        assert session.get(User, uid).version == 1
        assert (
            session.scalar(
                select(func.count())
                .select_from(UserCommandReceipt)
                .where(UserCommandReceipt.key == key)
            )
            == 0
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.action == "users.delete")
            )
            == 0
        )
    delete_staff(settings, database, token, uid, key)


def test_additive_migration_keeps_existing_staff_password_and_session(settings, database):
    uid, token, _ = admin(settings, database)
    with database.session() as session:
        credential_before = tuple(session.execute(select(Credential.__table__)).one())
        session_before = tuple(session.execute(select(StaffSession.__table__)).one())
        user_before = tuple(
            session.execute(
                select(*[column for column in User.__table__.c if column.name != "deleted_at"])
            ).one()
        )
    assert migrate("downgrade", "0025_scoped_activities").returncode == 0
    assert migrate("upgrade", "head").returncode == 0
    with database.session() as session:
        unchanged = (
            credential_before == tuple(session.execute(select(Credential.__table__)).one())
            and session_before == tuple(session.execute(select(StaffSession.__table__)).one())
            and user_before
            == tuple(
                session.execute(
                    select(*[column for column in User.__table__.c if column.name != "deleted_at"])
                ).one()
            )
        )
        if not unchanged:
            raise AssertionError("EXISTING_STAFF_FACTS_CHANGED")
        current_identity(session, token)
        assert session.get(User, uid).deleted_at is None
    create(settings, database, token)
    with database.session() as session:
        credential_after = tuple(
            session.execute(select(Credential.__table__).where(Credential.user_id == uid)).one()
        )
        if credential_before != credential_after:
            raise AssertionError("EXISTING_PASSWORD_CHANGED_BY_NEW_ACCOUNT")
        current_identity(session, token)


@pytest.mark.anyio
async def test_http_delete_and_password_validation_are_strict_and_secret_free(settings, database):
    _, token, _ = admin(settings, database)
    uid, _, _ = create_actor(settings, database, role="agent")
    headers = {
        **authority(settings),
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
        "Idempotency-Key": str(uuid4()),
    }
    secret = secrets.token_urlsafe(24)
    async with client_for(create_app(settings)) as client:
        for invalid in ["", "short", " " * 12, "x" * 1025]:
            response = await client.post(
                "/api/v1/users",
                headers=headers,
                json={
                    "display_name": "Synthétique",
                    "email": f"sp03-{uuid4().hex}@example.com",
                    "role": "agent",
                    "temporary_password": invalid,
                },
            )
            assert response.status_code == 422
            assert set(response.json()) == {"error"}
        for query in ["?page=1&page=2", "?unknown=1"]:
            assert (await client.get("/api/v1/users" + query, headers=headers)).status_code == 422
        assert (
            await client.request(
                "DELETE",
                f"/api/v1/users/{uid}?extra=1",
                headers=headers,
                json={"expected_version": 1},
            )
        ).status_code == 422
        assert (
            await client.request(
                "DELETE",
                f"/api/v1/users/{uid}",
                headers={k: v for k, v in headers.items() if k != "X-CSRF-Token"},
                json={"expected_version": 1},
            )
        ).status_code == 403
        response = await client.request(
            "DELETE", f"/api/v1/users/{uid}", headers=headers, json={"expected_version": 1}
        )
        assert response.status_code == 200
        assert set(response.json()) == {"user"}
        assert (
            await client.request(
                "DELETE", f"/api/v1/users/{uid}", headers=headers, json={"expected_version": 1}
            )
        ).json() == response.json()
        assert (await client.get(f"/api/v1/users/{uid}", headers=headers)).status_code == 404
    body = NewUser(
        display_name="Synthétique",
        email=f"sp03-{uuid4().hex}@example.com",
        role="agent",
        temporary_password=secret,
    )
    if secret in repr(body) or secret in body.model_dump_json():
        raise AssertionError("CONTRACT_SECRET_REPR_LEAK")
