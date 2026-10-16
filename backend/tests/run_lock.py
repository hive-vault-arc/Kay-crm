"""Session advisory lease: pytest and browser fixtures cannot share a writing target."""

import sys
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import text

from app.db.isolation import assert_isolated
from app.db.session import create_database_engine
from app.settings import Settings, load_settings

TEST_RUN_LOCK = 51505005


@contextmanager
def exclusive_test_run(settings: Settings) -> Iterator[None]:
    assert_isolated(settings)
    engine = create_database_engine(settings.selected_database_url())
    try:
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
            if not connection.scalar(
                text("SELECT pg_try_advisory_lock(:key)"), {"key": TEST_RUN_LOCK}
            ):
                raise RuntimeError("ISOLATED_TEST_RUN_ALREADY_ACTIVE")
            try:
                yield
            finally:
                connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": TEST_RUN_LOCK})
    finally:
        engine.dispose()


def main() -> int:
    try:
        settings = load_settings()
        if settings.app_environment != "test":
            raise RuntimeError("ISOLATED_TEST_ENVIRONMENT_REQUIRED")
        with exclusive_test_run(settings):
            print("ISOLATED_TEST_LEASE_READY", flush=True)
            sys.stdin.buffer.read(1)
        return 0
    except Exception:
        print("ISOLATED_TEST_LEASE_REFUSED", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
