"""Resolve cluster/database identity before allowing isolated migration/test work."""

from dataclasses import dataclass

from sqlalchemy import Engine, text

from app.db.session import create_database_engine
from app.settings import Settings


class UnsafeDatabaseTarget(RuntimeError):
    """The selected target cannot be proved independent of development."""


@dataclass(frozen=True)
class DatabaseIdentity:
    """Cluster system ID plus database OID defeats host/role/URL aliases."""

    cluster: str
    oid: int
    name: str


def resolve_identity(engine: Engine) -> DatabaseIdentity:
    """Read catalog identity only; pg_control_system requires local setup authority."""
    with engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT system_identifier::text, d.oid::bigint, current_database() "
                "FROM pg_control_system(), pg_database d WHERE d.datname=current_database()"
            )
        ).one()
        return DatabaseIdentity(str(row[0]), int(row[1]), str(row[2]))


def assert_isolated(settings: Settings) -> DatabaseIdentity:
    """Fail closed before migration or test DDL, comparing live resolved identities."""
    if settings.app_environment == "development":
        raise UnsafeDatabaseTarget("ISOLATED_DATABASE_REQUIRED")
    expected = f"kayrealestate_{settings.app_environment}"
    engines = [
        create_database_engine(settings.database_url.get_secret_value()),
        create_database_engine(settings.selected_database_url()),
    ]
    try:
        development, target = [resolve_identity(engine) for engine in engines]
        if target.name != expected or (target.cluster, target.oid) == (
            development.cluster,
            development.oid,
        ):
            raise UnsafeDatabaseTarget("DEVELOPMENT_DATABASE_REFUSED")
        return target
    finally:
        for engine in engines:
            engine.dispose()
