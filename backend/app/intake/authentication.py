import hashlib
import hmac
import re
from datetime import UTC, datetime, timedelta

from sqlalchemy import case, delete, func
from sqlalchemy.dialects.postgresql import insert

from app.db.session import Database
from app.identity.models import LoginRateBucket
from app.identity.security import IdentityError, keyed_digest
from app.intake.configuration import SigningKey


def signature(key: SigningKey, timestamp: str, body: bytes) -> str:
    return hmac.new(
        key.secret.get_secret_value().encode(), timestamp.encode() + b"." + body, hashlib.sha256
    ).hexdigest()


def verify(key: SigningKey, source_key: str, timestamp: str, supplied: str, body: bytes) -> None:
    valid = bool(re.fullmatch(r"[0-9]{10,11}", timestamp))
    fresh = valid and abs(datetime.now(UTC).timestamp() - int(timestamp)) <= 300
    digest = signature(key, timestamp[:11], body)
    if (
        not hmac.compare_digest(source_key.encode(), key.source_key.encode())
        or not hmac.compare_digest(digest.encode(), supplied.encode())
        or not fresh
    ):
        raise IdentityError("INTAKE_AUTHENTICATION_FAILED", 401)


def consume_budget(database: Database, secret: str) -> None:
    key = keyed_digest(secret, "intake-rate", "global")
    with database.session() as session, session.begin():
        session.execute(
            delete(LoginRateBucket).where(
                LoginRateBucket.window_started_at < func.now() - timedelta(days=1)
            )
        )
        stale = LoginRateBucket.window_started_at <= func.now() - timedelta(minutes=1)
        attempts = session.scalar(
            insert(LoginRateBucket)
            .values(key=key, window_started_at=func.now(), attempts=1)
            .on_conflict_do_update(
                index_elements=[LoginRateBucket.key],
                set_={
                    "window_started_at": case(
                        (stale, func.now()), else_=LoginRateBucket.window_started_at
                    ),
                    "attempts": case(
                        (stale, 1), else_=func.least(LoginRateBucket.attempts + 1, 301)
                    ),
                },
            )
            .returning(LoginRateBucket.attempts)
        )
    if attempts is None or attempts > 300:
        raise IdentityError("RATE_LIMITED", 429)
