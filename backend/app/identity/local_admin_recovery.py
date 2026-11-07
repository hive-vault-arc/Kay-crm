"""Narrow, auditable recovery for a locked-out local development administrator."""

from datetime import UTC, datetime
from ipaddress import ip_address, ip_interface

from sqlalchemy import delete, select
from sqlalchemy.engine import make_url

from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, AuditEvent, Credential, LoginRateBucket, User
from app.identity.security import IdentityError, hash_password, keyed_digest
from app.identity.users import revoke


def require_local_development_configuration(environment: str, configured_url: str) -> None:
    """Refuse remote, non-development or wrong-name targets before connecting."""
    try:
        url = make_url(configured_url)
        configured_host = url.host
        configured_local = configured_host == "localhost" or (
            configured_host is not None and ip_address(configured_host).is_loopback
        )
    except ValueError:
        raise IdentityError("LOCAL_DEVELOPMENT_DATABASE_REQUIRED", 403) from None
    if (
        environment != "development"
        or url.get_backend_name() != "postgresql"
        or not configured_local
        or url.database != "kayrealestate"
    ):
        raise IdentityError("LOCAL_DEVELOPMENT_DATABASE_REQUIRED", 403)


def require_local_database_identity(database_name: str, server_address: str | None) -> None:
    """Verify PostgreSQL actually connected to the expected local database."""
    try:
        connected_local = server_address is not None and ip_interface(server_address).ip.is_loopback
    except ValueError:
        raise IdentityError("LOCAL_DEVELOPMENT_DATABASE_REQUIRED", 403) from None
    if not connected_local or database_name != "kayrealestate":
        raise IdentityError("LOCAL_DEVELOPMENT_DATABASE_REQUIRED", 403)


def require_local_development_database(
    environment: str,
    configured_url: str,
    database_name: str,
    server_address: str | None,
) -> None:
    """Prove both the configured and connected target are local development."""
    require_local_development_configuration(environment, configured_url)
    require_local_database_identity(database_name, server_address)


def recover_only_local_administrator(database: Database, secret: str, password: str) -> None:
    """Replace the sole active local administrator's credential in one audited transaction."""
    encoded = hash_password(password)
    with database.session() as session, session.begin():
        agency = session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        if agency is None or agency.bootstrap_completed_at is None:
            raise IdentityError("BOOTSTRAP_REQUIRED", 409)

        administrators = list(
            session.scalars(
                select(User).where(User.role == "administrator").order_by(User.id).with_for_update()
            )
        )
        if (
            len(administrators) != 1
            or administrators[0].state != "active"
            or administrators[0].deleted_at is not None
        ):
            raise IdentityError("RECOVERY_TARGET_AMBIGUOUS", 409)
        user = administrators[0]
        credential = session.scalar(
            select(Credential).where(Credential.user_id == user.id).with_for_update()
        )
        if credential is None:
            raise IdentityError("RECOVERY_CREDENTIAL_UNAVAILABLE", 409)

        now = datetime.now(UTC)
        credential.password_hash = encoded
        credential.must_change_password = False
        credential.temporary_expires_at = None
        credential.version += 1
        user.version += 1
        user.updated_at = now
        revoke(session, user)
        session.execute(
            delete(LoginRateBucket).where(
                LoginRateBucket.key == keyed_digest(secret, "rate-identity", user.email)
            )
        )
        session.add(
            AuditEvent(
                actor_user_id=user.id,
                target_user_id=user.id,
                action="identity.local_admin_password_recovered",
            )
        )
        session.flush()
