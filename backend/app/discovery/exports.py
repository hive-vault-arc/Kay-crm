import hashlib
import json
import re
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db.session import Database
from app.discovery.contracts import NewExport, PageQuery
from app.discovery.models import ExportJob
from app.discovery.search import page_result
from app.files.models import OutboxEvent
from app.files.storage import PrivateStorage
from app.identity.models import AuditEvent
from app.identity.security import IdentityError, token_hash
from app.imports.access import authorized
from app.settings import Settings


def summary(row: ExportJob) -> dict[str, object]:
    return dict(
        id=str(row.id),
        kind=row.kind,
        state=row.state,
        error_code=row.error_code,
        row_count=row.row_count,
        size_bytes=row.size_bytes,
        created_at=row.created_at.isoformat(),
        completed_at=row.completed_at.isoformat() if row.completed_at else None,
    )


def owned(session: Session, eid: UUID, uid: UUID, *, lock: bool = False) -> ExportJob:
    query = select(ExportJob).where(ExportJob.id == eid, ExportJob.author_user_id == uid)
    row = session.scalar(query.with_for_update() if lock else query)
    if row is None:
        raise IdentityError("NOT_FOUND", 404)
    return row


def request_export(database: Database, token: str, key: UUID, body: NewExport) -> dict[str, object]:
    digest = hashlib.sha256(
        json.dumps(body.model_dump(mode="json"), sort_keys=True).encode()
    ).digest()
    with database.session() as session, session.begin():
        identity = authorized(session, token, lock=True)
        previous = session.scalar(
            select(ExportJob).where(
                ExportJob.author_user_id == identity.user.id, ExportJob.request_key == key
            )
        )
        if previous:
            if previous.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return summary(previous)
        row = ExportJob(
            author_user_id=identity.user.id,
            request_session_id=identity.session.id,
            request_key=key,
            request_hash=digest,
            kind=body.kind,
            filters=body.filters.model_dump(mode="json"),
        )
        session.add(row)
        session.flush()
        session.add(
            OutboxEvent(
                kind="export.generate", export_id=row.id, dedupe_key=f"export.generate:{row.id}"
            )
        )
        session.add(AuditEvent(actor_user_id=identity.user.id, action="exports.requested"))
        return summary(row)


def read_exports(
    database: Database, token: str, query: PageQuery, eid: UUID | None = None
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = authorized(session, token)
        if eid:
            return summary(owned(session, eid, identity.user.id))
        statement = select(ExportJob).where(ExportJob.author_user_id == identity.user.id)
        total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
        rows = session.scalars(
            statement.order_by(ExportJob.created_at.desc(), ExportJob.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return page_result([summary(row) for row in rows], total, query.page, query.page_size)


def issue_download(database: Database, token: str, eid: UUID, binding: str) -> dict[str, str]:
    if not re.fullmatch("[a-f0-9]{64}", binding):
        raise IdentityError("FORBIDDEN", 403)
    with database.session() as session, session.begin():
        identity = authorized(session, token, lock=True)
        row = owned(session, eid, identity.user.id, lock=True)
        if row.state != "ready":
            raise IdentityError("EXPORT_NOT_READY", 409)
        raw = secrets.token_urlsafe(32)
        row.permit_hash, row.binding_hash = token_hash(raw), token_hash(binding)
        row.permit_session_id = identity.session.id
        row.permit_expires_at, row.permit_consumed_at = (
            datetime.now(UTC) + timedelta(minutes=2),
            None,
        )
        return dict(token=raw, expires_at=row.permit_expires_at.isoformat(), export_id=str(row.id))


def download(database: Database, settings: Settings, eid: UUID, raw: str, binding: str) -> bytes:
    with database.session() as session, session.begin():
        # Serialize delivery with role changes; no private lookup grants authority.
        from app.identity.models import AGENCY_ID, Agency

        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        row = session.scalar(select(ExportJob).where(ExportJob.id == eid).with_for_update())
        if (
            row is None
            or not row.permit_hash
            or not row.binding_hash
            or not row.permit_session_id
            or row.permit_consumed_at
            or not row.permit_expires_at
            or row.permit_expires_at <= datetime.now(UTC)
            or not secrets.compare_digest(row.permit_hash, token_hash(raw))
            or not secrets.compare_digest(row.binding_hash, token_hash(binding))
        ):
            raise IdentityError("FILE_PERMIT_INVALID", 403)
        identity = authorized(session, sid=row.permit_session_id)
        if row.author_user_id != identity.user.id or row.state != "ready" or row.object_key is None:
            raise IdentityError("FILE_PERMIT_INVALID", 403)
        data = PrivateStorage(settings).read(row.object_key, row.size_bytes, row.file_hash)
        row.permit_consumed_at = datetime.now(UTC)
        session.add(AuditEvent(actor_user_id=identity.user.id, action="exports.downloaded"))
        return data
