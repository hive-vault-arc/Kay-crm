import hashlib
import re
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select

from app.db.session import Database
from app.identity.security import IdentityError, token_hash
from app.imports.access import authorized, batch_for
from app.imports.models import ImportBatch


def issue_upload(database: Database, token: str, bid: UUID, binding: str) -> dict[str, str]:
    if not re.fullmatch(r"[a-f0-9]{64}", binding):
        raise IdentityError("FORBIDDEN", 403)
    with database.session() as session, session.begin():
        identity = authorized(session, token, lock=True)
        batch = batch_for(session, bid, lock=True)
        if batch.state not in {"awaiting_upload", "uploading"}:
            raise IdentityError("IMPORT_ALREADY_UPLOADED", 409)
        raw = secrets.token_urlsafe(32)
        batch.object_key, batch.permit_hash, batch.binding_hash = (
            uuid4(),
            token_hash(raw),
            token_hash(binding),
        )
        batch.permit_session_id = identity.session.id
        batch.permit_expires_at = datetime.now(UTC) + timedelta(minutes=2)
        batch.permit_consumed_at, batch.state = None, "awaiting_upload"
        return {
            "token": raw,
            "expires_at": batch.permit_expires_at.isoformat(),
            "batch_id": str(bid),
        }


def consume_upload(database: Database, bid: UUID, raw: str, binding: str) -> tuple[UUID, int, UUID]:
    with database.session() as session, session.begin():
        # All sensitive lookup requires a bound current session, never just the batch UUID.
        batch = session.scalar(select(ImportBatch).where(ImportBatch.id == bid).with_for_update())
        if (
            batch is None
            or not batch.permit_hash
            or not batch.binding_hash
            or not batch.permit_session_id
            or not secrets.compare_digest(batch.permit_hash, token_hash(raw))
            or not secrets.compare_digest(batch.binding_hash, token_hash(binding))
            or not batch.permit_expires_at
            or batch.permit_expires_at <= datetime.now(UTC)
            or batch.permit_consumed_at
            or batch.state != "awaiting_upload"
            or not batch.object_key
        ):
            raise IdentityError("FILE_PERMIT_INVALID", 403)
        authorized(session, sid=batch.permit_session_id)
        batch.permit_consumed_at, batch.state = datetime.now(UTC), "uploading"
        return batch.object_key, batch.size_bytes, batch.permit_session_id


def publish_upload(database: Database, bid: UUID, key: UUID, sid: UUID, data: bytes) -> None:
    with database.session() as session, session.begin():
        authorized(session, sid=sid, lock=True)
        batch = batch_for(session, bid, lock=True)
        if batch.state != "uploading" or batch.object_key != key or batch.permit_session_id != sid:
            raise IdentityError("FILE_PERMIT_INVALID", 403)
        batch.file_hash, batch.state = hashlib.sha256(data).digest(), "uploaded"
