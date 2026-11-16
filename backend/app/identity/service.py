"""Authentication commands with short, serialized identity transactions."""

import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select

from app.db.session import Database
from app.identity.models import AuditEvent, Credential, LoginRateBucket, StaffSession, User
from app.identity.rate_limit import consume_login_budget
from app.identity.security import (
    IdentityError,
    dummy_hash,
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
            or credential.must_change_password
            or not credential_active(user, credential, now)
        ):
            raise IdentityError("INVALID_CREDENTIALS", 401)
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
        identity = current_identity(session, token)
        identity.session.revoked_at = datetime.now(UTC)
        session.add(
            AuditEvent(
                actor_user_id=identity.user.id,
                target_user_id=identity.user.id,
                action="identity.logout",
            )
        )
