"""Read-only database identity and catalog snapshots; never print record contents."""

import hashlib
import json
from collections.abc import Sequence

from sqlalchemy import text

from app.db import models as registered_models  # noqa: F401
from app.db.isolation import assert_isolated, resolve_identity
from app.db.session import Base, create_database_engine
from app.runtime import BACKEND_ROOT, require_venv
from app.settings import load_settings


def main() -> None:
    """Save metadata only to ignored local evidence for before/after comparison."""
    require_venv()
    settings = load_settings()
    if settings.app_environment != "development":
        assert_isolated(settings)
    engine = create_database_engine(settings.selected_database_url())
    try:
        identity = resolve_identity(engine)
        with engine.connect() as connection:
            rows = connection.execute(
                text(
                    "SELECT table_schema, table_name, column_name, data_type, is_nullable "
                    "FROM information_schema.columns WHERE table_schema NOT IN "
                    "('pg_catalog','information_schema') AND table_name != 'alembic_version' "
                    "ORDER BY table_schema, table_name, ordinal_position"
                )
            ).all()
            rows = [
                row
                for row in rows
                if row.table_schema != "public" or row.table_name not in Base.metadata.tables
            ]
            tables = connection.execute(
                text(
                    "SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN "
                    "('pg_catalog','information_schema') ORDER BY schemaname, tablename"
                )
            ).all()
            revision_exists: bool = connection.execute(
                text("SELECT to_regclass('public.alembic_version') IS NOT NULL")
            ).scalar_one()
            revision: Sequence[str] = (
                connection.execute(text("SELECT version_num FROM alembic_version")).scalars().all()
                if revision_exists
                else []
            )
        result = {
            "environment": settings.app_environment,
            "database": identity.name,
            "database_oid": identity.oid,
            "cluster": identity.cluster,
            "unrelated_catalog_sha256": hashlib.sha256(repr(rows).encode()).hexdigest(),
            "user_table_count": len(tables),
            "migration_revisions": list(revision),
        }
        destination = BACKEND_ROOT / ".local-data" / "inspection"
        destination.mkdir(parents=True, exist_ok=True)
        (destination / f"{settings.app_environment}.json").write_text(
            json.dumps(result), encoding="utf-8"
        )
        print(json.dumps(result))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
