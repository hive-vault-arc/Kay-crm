"""Current database authorization, never a cached role or self-contained token."""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.identity.models import Credential, StaffSession, User
from app.identity.security import TOKEN_PATTERN, IdentityError, token_hash


@dataclass(frozen=True, repr=False)
class CurrentIdentity:
    user: User
    credential: Credential
    session: StaffSession


def credential_active(user: User, credential: Credential, now: datetime) -> bool:
    if user.state != "active":
        return False
    if credential.must_change_password:
        return bool(
            credential.handoff_confirmed_at is not None
            and credential.temporary_expires_at is not None
            and credential.temporary_expires_at > now
        )
    return credential.temporary_expires_at is None


def current_identity(
    session: Session, token: str, *, restricted_allowed: bool = False
) -> CurrentIdentity:
    if not TOKEN_PATTERN.fullmatch(token):
        raise IdentityError("UNAUTHENTICATED", 401)
    row = session.execute(
        select(StaffSession, User, Credential)
        .join(User, User.id == StaffSession.user_id)
        .join(Credential, Credential.user_id == User.id)
        .where(StaffSession.token_hash == token_hash(token))
    ).one_or_none()
    return validate_identity(row, restricted_allowed=restricted_allowed)


def identity_for_session(session: Session, sid: UUID) -> CurrentIdentity:
    row = session.execute(
        select(StaffSession, User, Credential)
        .join(User, User.id == StaffSession.user_id)
        .join(Credential, Credential.user_id == User.id)
        .where(StaffSession.id == sid)
    ).one_or_none()
    return validate_identity(row)


def validate_identity(row: object, *, restricted_allowed: bool = False) -> CurrentIdentity:
    if row is None:
        raise IdentityError("UNAUTHENTICATED", 401)
    record, user, credential = cast(tuple[StaffSession, User, Credential], row)
    now = datetime.now(UTC)
    if (
        record.revoked_at is not None
        or record.expires_at <= now
        or record.created_at > now
        or not credential_active(user, credential, now)
        or record.user_version != user.version
        or record.credential_version != credential.version
        or record.role_at_login != user.role
    ):
        raise IdentityError("UNAUTHENTICATED", 401)
    if credential.must_change_password and not restricted_allowed:
        raise IdentityError("PASSWORD_CHANGE_REQUIRED", 403)
    return CurrentIdentity(user, credential, record)


def require_role(identity: CurrentIdentity, roles: set[str]) -> None:
    effective_roles = {identity.user.role}
    if identity.user.role == "administrator":
        effective_roles.add("manager")
    if not effective_roles.intersection(roles):
        raise IdentityError("FORBIDDEN", 403)
