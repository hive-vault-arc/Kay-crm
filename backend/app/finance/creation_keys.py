"""Timestamped request IDs bound the start of a new financial creation.

These IDs are not credentials. Current M/A and dossier authority still govern
issuance, dispatch and retained receipt replay. A retained receipt is checked
before this start window so its original 24-hour replay contract is preserved.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid7

from app.db.session import Database
from app.finance.records import deal_access
from app.identity.security import IdentityError
from app.identity.sessions import current_identity

EPOCH = datetime(1970, 1, 1, tzinfo=UTC)
START_WINDOW = timedelta(minutes=5)
START_WINDOW_MS = START_WINDOW // timedelta(milliseconds=1)
FUTURE_SKEW_MS = 5_000


def require_creation_key(key: UUID, now: datetime | None = None) -> None:
    if key.version != 7:
        raise IdentityError("FINANCE_CREATION_KEY_REQUIRED", 409)
    elapsed = (now or datetime.now(UTC)) - EPOCH
    current_ms = (elapsed.days * 86_400 + elapsed.seconds) * 1_000 + elapsed.microseconds // 1_000
    issued_ms = key.int >> 80
    if issued_ms > current_ms + FUTURE_SKEW_MS or current_ms >= issued_ms + START_WINDOW_MS:
        raise IdentityError("FINANCE_CREATION_KEY_EXPIRED", 409)


def issue_creation_key(database: Database, token: str, did: UUID) -> dict[str, str]:
    with database.session() as session, session.begin():
        identity = current_identity(session, token)
        deal = deal_access(session, identity, did, write=True)
        key = uuid7()
        expires = EPOCH + timedelta(milliseconds=key.int >> 80) + START_WINDOW
        return {"deal_id": str(deal.id), "key": str(key), "expires_at": expires.isoformat()}
