"""Guard real target identity and unknown migration state before executing DDL."""

from alembic.script import ScriptDirectory
from sqlalchemy import text

from alembic import context
from app.db import models as registered_models  # noqa: F401
from app.db.isolation import assert_runtime_target
from app.db.session import Base, create_database_engine
from app.settings import load_settings

settings = load_settings()
assert_runtime_target(settings)
if context.is_offline_mode():
    raise RuntimeError("OFFLINE_MIGRATIONS_DISABLED: inspect the real target first")

engine = create_database_engine(settings.selected_database_url())
try:
    with engine.connect() as connection:
        tables = (
            connection.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public'"))
            .scalars()
            .all()
        )
        scripts = ScriptDirectory.from_config(context.config)
        if "alembic_version" in tables:
            revisions = connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalars()
            for revision in revisions:
                if scripts.get_revision(revision) is None:
                    raise RuntimeError("UNKNOWN_MIGRATION_STATE")
        elif tables:
            raise RuntimeError("NONEMPTY_UNVERSIONED_SCHEMA_REFUSED")
        connection.commit()
        context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
finally:
    engine.dispose()
