"""Exactly-once bootstrap under the migrated singleton agency lock."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select

from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, AuditEvent, Credential, User
from app.identity.security import IdentityError, hash_password, normalize_email


def bootstrap_administrator(
    database: Database, display_name: str, email: str, password: str
) -> UUID:
    name = display_name.strip()
    if not name or len(name) > 160:
        raise IdentityError("VALIDATION_ERROR", 422)
    normalized = normalize_email(email)
    encoded = hash_password(password)
    with database.session() as session, session.begin():
        agency = session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        if agency is None:
            raise IdentityError("MIGRATION_REQUIRED", 409)
        users_exist = session.scalar(select(User.id).limit(1)) is not None
        if agency.bootstrap_completed_at is not None or users_exist:
            active_admin = session.scalar(
                select(User.id).where(User.role == "administrator", User.state == "active").limit(1)
            )
            code = (
                "MANUAL_RECOVERY_REQUIRED"
                if users_exist and not active_admin
                else "ALREADY_INITIALIZED"
            )
            raise IdentityError(code, 409)
        now = datetime.now(UTC)
        user_id = uuid4()
        session.add(
            User(
                id=user_id,
                agency_id=AGENCY_ID,
                display_name=name,
                email=normalized,
                role="administrator",
                state="active",
            )
        )
        session.flush()
        session.add(Credential(user_id=user_id, password_hash=encoded, must_change_password=False))
        session.add(
            AuditEvent(
                actor_user_id=user_id, target_user_id=user_id, action="identity.bootstrap_completed"
            )
        )
        agency.bootstrap_completed_at = now
    return user_id
