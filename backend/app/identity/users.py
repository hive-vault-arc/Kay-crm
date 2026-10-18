"""Named staff commands, serialized with current actor and last-admin checks."""

import json
from datetime import UTC, datetime, timedelta
from typing import cast
from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.db.session import Database
from app.identity.models import (
    AGENCY_ID,
    Agency,
    AuditEvent,
    Credential,
    StaffSession,
    User,
    UserCommandReceipt,
)
from app.identity.rate_limit import consume_login_budget
from app.identity.security import IdentityError, hash_password, keyed_digest, verify_password
from app.identity.sessions import CurrentIdentity, current_identity, require_role
from app.identity.user_contracts import EditUser, NewUser, ResetUser, Versioned


def public_user(user: User, credential: Credential) -> dict[str, object]:
    return {
        "id": str(user.id),
        "display_name": user.display_name,
        "email": user.email,
        "role": user.role,
        "state": user.state,
        "version": user.version,
        "must_change_password": credential.must_change_password,
        "temporary_expires_at": credential.temporary_expires_at.isoformat()
        if credential.temporary_expires_at
        else None,
        "handoff_confirmed_at": credential.handoff_confirmed_at.isoformat()
        if credential.handoff_confirmed_at
        else None,
    }


def administrator(session: Session, token: str) -> CurrentIdentity:
    identity = current_identity(session, token)
    require_role(identity, {"administrator"})
    return identity


def read_users(database: Database, token: str, page: int, page_size: int) -> dict[str, object]:
    with database.session() as session:
        administrator(session, token)
        # One statement gives the count and page the same MVCC snapshot.
        total = (
            select(func.count())
            .select_from(User)
            .where(User.deleted_at.is_(None))
            .scalar_subquery()
        )
        page_rows = (
            select(User.id)
            .where(User.deleted_at.is_(None))
            .order_by(User.updated_at.desc(), User.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .subquery()
        )
        rows = session.execute(
            select(total, User, Credential)
            .select_from(Agency)
            .outerjoin(page_rows, Agency.id == AGENCY_ID)
            .outerjoin(User, User.id == page_rows.c.id)
            .outerjoin(Credential, Credential.user_id == User.id)
            .order_by(User.updated_at.desc(), User.id)
        ).all()
        count = rows[0][0]
        return {
            "items": [
                public_user(cast(User, u), cast(Credential, c)) for _, u, c in rows if u is not None
            ],
            "page": page,
            "page_size": page_size,
            "total": count,
            "has_next": page * page_size < count,
            "has_previous": page > 1,
        }


def read_user(database: Database, token: str, target: UUID) -> dict[str, object]:
    with database.session() as session:
        administrator(session, token)
        user, credential = target_pair(session, target)
        return public_user(user, credential)


def target_pair(session: Session, target: UUID) -> tuple[User, Credential]:
    row = session.execute(
        select(User, Credential)
        .join(Credential)
        .where(User.id == target, User.deleted_at.is_(None))
    ).one_or_none()
    if row is None:
        raise IdentityError("NOT_FOUND", 404)
    return row[0], row[1]


def revoke(session: Session, user: User) -> None:
    session.execute(
        update(StaffSession)
        .where(StaffSession.user_id == user.id, StaffSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )


def protect_last_administrator(session: Session, user: User, new_role: str, new_state: str) -> None:
    if (
        user.role != "administrator"
        or user.state != "active"
        or (new_role == "administrator" and new_state == "active")
    ):
        return
    remaining = session.scalar(
        select(func.count())
        .select_from(User)
        .join(Credential)
        .where(
            User.id != user.id,
            User.role == "administrator",
            User.state == "active",
            Credential.must_change_password.is_(False),
        )
    )
    if not remaining:
        raise IdentityError("LAST_ADMIN_REQUIRED", 409)


def apply_existing(
    session: Session,
    actor: CurrentIdentity,
    target: UUID,
    operation: str,
    body: EditUser | ResetUser | Versioned,
) -> dict[str, object]:
    user, credential = target_pair(session, target)
    if user.version != body.expected_version:
        raise IdentityError("VERSION_CONFLICT", 409)
    now = datetime.now(UTC)
    if operation == "edit" and isinstance(body, EditUser):
        protect_last_administrator(session, user, body.role, user.state)
        if session.scalar(select(User.id).where(User.email == body.email, User.id != target)):
            raise IdentityError("EMAIL_IN_USE", 409)
        user.display_name, user.email, user.role = body.display_name, body.email, body.role
        revoke(session, user)
    elif operation == "delete":
        protect_last_administrator(session, user, user.role, "disabled")
        user.state = "disabled"
        user.deleted_at = now
        revoke(session, user)
    elif operation == "reset-password" and isinstance(body, ResetUser):
        if target == actor.user.id:
            raise IdentityError("USE_OWN_PASSWORD_CHANGE", 409)
        if not verify_password(
            actor.credential.password_hash, body.admin_password.get_secret_value()
        ):
            raise IdentityError("ADMIN_PASSWORD_INVALID", 403)
        user.state = "active"
        credential.password_hash = hash_password(body.temporary_password.get_secret_value())
        credential.must_change_password = True
        credential.temporary_expires_at = now + timedelta(hours=24)
        credential.handoff_confirmed_at = None
        credential.version += 1
        revoke(session, user)
    else:
        raise IdentityError("VALIDATION_ERROR", 422)
    user.version += 1
    user.updated_at = now
    session.flush()
    result: dict[str, object] = {"user": public_user(user, credential)}
    return result


def command(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    operation: str,
    body: NewUser | EditUser | ResetUser | Versioned,
    target: UUID | None = None,
) -> dict[str, object]:
    digest_body = body.model_dump(mode="json")
    if isinstance(body, ResetUser):
        digest_body["admin_password"] = body.admin_password.get_secret_value()
    if isinstance(body, (NewUser, ResetUser)):
        digest_body["temporary_password"] = body.temporary_password.get_secret_value()
    digest = keyed_digest(secret, "user-command", json.dumps(digest_body, sort_keys=True))
    route = f"{operation}:{target or 'new'}"
    if operation == "reset-password":
        with database.session() as session:
            actor_id = administrator(session, token).user.id
        consume_login_budget(database, secret, f"admin-reset:{actor_id}")
    with database.session() as session, session.begin():
        preliminary = administrator(session, token)
        agency = session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        ids = sorted({preliminary.user.id} | ({target} if target else set()))
        session.execute(select(User.id).where(User.id.in_(ids)).order_by(User.id).with_for_update())
        session.expire_all()
        actor = administrator(session, token)
        if agency is None or agency.bootstrap_completed_at is None:
            raise IdentityError("BOOTSTRAP_REQUIRED", 409)
        receipt = session.get(UserCommandReceipt, (actor.user.id, key))
        if receipt:
            if receipt.operation != route or receipt.request_digest != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            if receipt.secret_issued:
                raise IdentityError("ONE_TIME_RESULT_UNAVAILABLE", 409)
            return receipt.result
        if operation == "create":
            if (
                session.scalar(select(User.id).where(User.email == body.email))
                if isinstance(body, NewUser)
                else True
            ):
                raise IdentityError("EMAIL_IN_USE", 409)
            if not isinstance(body, NewUser):
                raise IdentityError("VALIDATION_ERROR", 422)
            user = User(
                agency_id=AGENCY_ID,
                display_name=body.display_name,
                email=body.email,
                role=body.role,
                state="active",
            )
            session.add(user)
            session.flush()
            credential = Credential(
                user_id=user.id,
                password_hash=hash_password(body.temporary_password.get_secret_value()),
                must_change_password=True,
                temporary_expires_at=datetime.now(UTC) + timedelta(hours=24),
            )
            session.add(credential)
            session.flush()
            target = user.id
            result: dict[str, object] = {
                "user": public_user(user, credential),
            }
        else:
            if target is None or not isinstance(body, (EditUser, ResetUser, Versioned)):
                raise IdentityError("VALIDATION_ERROR", 422)
            result = apply_existing(session, actor, target, operation, body)
        session.add(
            AuditEvent(
                actor_user_id=actor.user.id, target_user_id=target, action=f"users.{operation}"
            )
        )
        session.add(
            UserCommandReceipt(
                actor_user_id=actor.user.id,
                key=key,
                operation=route,
                request_digest=digest,
                result=result,
                secret_issued=False,
            )
        )
        session.execute(
            delete(UserCommandReceipt).where(
                UserCommandReceipt.created_at < datetime.now(UTC) - timedelta(hours=24)
            )
        )
        return result
