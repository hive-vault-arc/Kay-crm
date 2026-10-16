"""Persistent, atomic counters; failed sign-ins cannot roll back their budget."""

from datetime import timedelta

from sqlalchemy import case, delete, func
from sqlalchemy.dialects.postgresql import insert

from app.db.session import Database
from app.identity.models import LoginRateBucket
from app.identity.security import IdentityError, keyed_digest


def consume_login_budget(database: Database, secret: str, identity: str) -> None:
    limited = False
    with database.session() as session, session.begin():
        session.execute(
            delete(LoginRateBucket).where(
                LoginRateBucket.window_started_at < func.now() - timedelta(days=1)
            )
        )
        for purpose, value, limit, period in (
            ("rate-global", "facade", 300, timedelta(minutes=1)),
            ("rate-identity", identity, 5, timedelta(minutes=15)),
        ):
            key = keyed_digest(secret, purpose, value)
            stale = LoginRateBucket.window_started_at <= func.now() - period
            statement = (
                insert(LoginRateBucket)
                .values(key=key, window_started_at=func.now(), attempts=1)
                .on_conflict_do_update(
                    index_elements=[LoginRateBucket.key],
                    set_={
                        "window_started_at": case(
                            (stale, func.now()), else_=LoginRateBucket.window_started_at
                        ),
                        "attempts": case((stale, 1), else_=LoginRateBucket.attempts + 1),
                    },
                )
                .returning(LoginRateBucket.attempts)
            )
            attempts = session.execute(statement).scalar_one()
            limited = limited or attempts > limit
            if limited:
                break
    if limited:
        raise IdentityError("RATE_LIMITED", 429)
