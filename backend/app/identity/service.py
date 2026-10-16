"""Authentication commands with short, serialized identity transactions."""

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, select, update

from app.db.session import Database
from app.identity.models import AuditEvent, Credential, LoginRateBucket, StaffSession, User
from app.identity.rate_limit import consume_login_budget
from app.identity.security import (
    IdentityError,
    dummy_hash,
    hash_password,
    keyed_digest,
    normalize_email,
    token_hash,
    verify_password,
)
from app.identity.sessions import credential_active, current_identity


def login(database: Database, secret: str, email: str, password: str) -> tuple[str, datetime]:
    try:
        normalized = normalize_email(email)
    except IdentityError:
        normalized = email.strip().lower()
    consume_login_budget(database, secret, normalized)
    with database.session() as session, session.begin():
        user = session.scalar(select(User).where(User.email == normalized).with_for_update())
        credential = session.get(Credential, user.id) if user is not None else None
        encoded = credential.password_hash if credential is not None else dummy_hash()
        valid_password = verify_password(encoded, password)
        now = datetime.now(UTC)
        if (
            not valid_password
            or user is None
            or credential is None
            or not credential_active(user, credential, now)
        ):
            raise IdentityError("INVALID_CREDENTIALS", 401)
        if credential.must_change_password:
            expires = min(now + timedelta(days=7), credential.temporary_expires_at or now)
        else:
            expires = now + timedelta(days=7)
        token = secrets.token_urlsafe(32)
        session.add(
            StaffSession(
                user_id=user.id,
                token_hash=token_hash(token),
                created_at=now,
                expires_at=expires,
                user_version=user.version,
                credential_version=credential.version,
                role_at_login=user.role,
            )
        )
        session.add(
            AuditEvent(actor_user_id=user.id, target_user_id=user.id, action="identity.login")
        )
        session.execute(
            delete(LoginRateBucket).where(
                LoginRateBucket.key == keyed_digest(secret, "rate-identity", normalized)
            )
        )
    return token, expires


def logout(database: Database, token: str) -> None:
    with database.session() as session, session.begin():
        identity = current_identity(session, token, restricted_allowed=True)
        identity.session.revoked_at = datetime.now(UTC)
        session.add(
            AuditEvent(
                actor_user_id=identity.user.id,
                target_user_id=identity.user.id,
                action="identity.logout",
            )
        )


def change_password(database: Database, token: str, old_password: str, new_password: str) -> None:
    encoded = hash_password(new_password)
    with database.session() as session, session.begin():
        preliminary = current_identity(session, token, restricted_allowed=True)
        user_id: UUID = preliminary.user.id
        session.execute(select(User.id).where(User.id == user_id).with_for_update())
        # Re-read after waiting for a competing login/reset/password change.
        session.expire_all()
        identity = current_identity(session, token, restricted_allowed=True)
        if not verify_password(identity.credential.password_hash, old_password):
            raise IdentityError("INVALID_CREDENTIALS", 401)
        if verify_password(identity.credential.password_hash, new_password):
            raise IdentityError("PASSWORD_UNCHANGED", 422)
        identity.credential.password_hash = encoded
        identity.credential.must_change_password = False
        identity.credential.temporary_expires_at = None
        identity.credential.version += 1
        session.execute(
            update(StaffSession)
            .where(StaffSession.user_id == user_id, StaffSession.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )
        session.add(
            AuditEvent(
                actor_user_id=user_id, target_user_id=user_id, action="identity.password_changed"
            )
        )
