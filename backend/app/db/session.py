"""One lifespan-owned synchronous pool and short, explicitly scoped sessions."""

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    """Shared metadata for migration-owned application tables."""


def create_database_engine(url: str) -> Engine:
    """Bound connection/pool/query waits and suppress SQL parameter logging."""
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=0,
        pool_timeout=3,
        hide_parameters=True,
        connect_args={
            "connect_timeout": 3,
            "options": "-c timezone=UTC -c statement_timeout=2000",
        },
    )


class Database:
    """Create at application startup and dispose at shutdown, even after DB failure."""

    def __init__(self, url: str) -> None:
        # CLI entrypoints need typed audit foreign-key targets too, not just HTTP imports.
        from app.db import models  # noqa: F401

        self.engine = create_database_engine(url)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)
        self.closed = False

    @contextmanager
    def session(self) -> Iterator[Session]:
        """Rollback uncommitted work and return the connection on every exit."""
        with self.sessions() as session:
            yield session

    def close(self) -> None:
        """Release pooled connections during lifespan teardown."""
        self.engine.dispose()
        self.closed = True
