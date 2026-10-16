import hashlib
import os
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import and_, or_, select

from app.db.session import Database
from app.discovery.csv_export import generate
from app.discovery.models import ExportJob
from app.files.models import Job, OutboxEvent
from app.files.storage import PrivateStorage
from app.identity.models import AGENCY_ID, Agency, AuditEvent
from app.identity.security import IdentityError
from app.imports.access import authorized
from app.settings import Settings
from app.work.worker import valid_fence


def claim(database: Database, now: datetime | None = None) -> tuple[UUID, UUID, UUID] | None:
    clock = now or datetime.now(UTC)
    with database.session() as session, session.begin():
        events = session.scalars(
            select(OutboxEvent)
            .where(
                OutboxEvent.kind == "export.generate",
                ~select(Job.id).where(Job.outbox_id == OutboxEvent.id).exists(),
            )
            .order_by(OutboxEvent.created_at, OutboxEvent.id)
            .limit(50)
            .with_for_update(skip_locked=True)
        ).all()
        for pending in events:
            session.add(Job(outbox_id=pending.id, state="ready", attempts=0, available_at=clock))
        session.flush()
        base = Job.outbox_id.in_(
            select(OutboxEvent.id).where(OutboxEvent.kind == "export.generate")
        )
        for expired in session.scalars(
            select(Job)
            .where(base, Job.state == "running", Job.lease_until <= clock, Job.attempts >= 5)
            .limit(50)
            .with_for_update(skip_locked=True)
        ):
            expired.state, expired.lease_token, expired.lease_until, expired.error_code = (
                "failed",
                None,
                None,
                "WORKER_INTERRUPTED",
            )
            event = session.get(OutboxEvent, expired.outbox_id)
            row = session.get(ExportJob, event.export_id) if event and event.export_id else None
            if row and row.state == "queued":
                row.state, row.error_code = "failed", "WORKER_INTERRUPTED"
        job = session.scalar(
            select(Job)
            .where(
                base,
                Job.attempts < 5,
                or_(
                    and_(Job.state.in_(["ready", "retry"]), Job.available_at <= clock),
                    and_(Job.state == "running", Job.lease_until <= clock),
                ),
            )
            .order_by(Job.available_at, Job.id)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if job is None:
            return None
        event = session.get(OutboxEvent, job.outbox_id)
        if event is None or event.export_id is None:
            raise RuntimeError("OUTBOX_INTEGRITY_ERROR")
        fence = uuid4()
        job.state, job.lease_token, job.lease_until = (
            "running",
            fence,
            clock + timedelta(seconds=90),
        )
        job.attempts += 1
        return job.id, fence, event.export_id


def finish(
    database: Database,
    jid: UUID,
    fence: UUID,
    eid: UUID,
    key: UUID | None,
    data: bytes = b"",
    count: int = 0,
    error: str | None = None,
) -> bool:
    clock = datetime.now(UTC)
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        job = session.scalar(select(Job).where(Job.id == jid).with_for_update())
        if not valid_fence(job, fence, clock) or job is None:
            return False
        row = session.scalar(select(ExportJob).where(ExportJob.id == eid).with_for_update())
        if row is None:
            raise RuntimeError("OUTBOX_INTEGRITY_ERROR")
        job.lease_token, job.lease_until = None, None
        job.state = "done"
        if row.state != "queued":
            job.state = "done"
            return True
        try:
            identity = authorized(session, sid=row.request_session_id)
            if identity.user.id != row.author_user_id:
                raise IdentityError("FORBIDDEN", 403)
        except IdentityError:
            row.state, row.error_code, job.state = "denied", "FORBIDDEN", "invalidated"
            return True
        if error:
            terminal = error == "EXPORT_LIMIT_EXCEEDED" or job.attempts >= 5
            job.state, job.error_code = ("failed" if terminal else "retry"), error
            job.available_at = clock + timedelta(seconds=min(300, 2**job.attempts))
            if terminal:
                row.state, row.error_code = "failed", error
            return True
        if key is None:
            raise RuntimeError("EXPORT_OBJECT_REQUIRED")
        row.object_key, row.file_hash, row.size_bytes, row.row_count = (
            key,
            hashlib.sha256(data).digest(),
            len(data),
            count,
        )
        row.state, row.completed_at, row.error_code, job.state = "ready", clock, None, "done"
        session.add(AuditEvent(actor_user_id=row.author_user_id, action="exports.generated"))
        return True


def run_once(database: Database, settings: Settings) -> bool:
    claimed = claim(database)
    if claimed is None:
        return False
    jid, fence, eid = claimed
    key = uuid4()
    try:
        data, count = generate(database, eid)
        storage = PrivateStorage(settings)
        with storage.path(key, partial=True).open("xb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        storage.promote(key)
        finish(database, jid, fence, eid, key, data, count)
    except IdentityError as error:
        finish(
            database,
            jid,
            fence,
            eid,
            None,
            error=error.code
            if error.code == "EXPORT_LIMIT_EXCEEDED"
            else "EXPORT_GENERATION_FAILED",
        )
    except OSError:
        finish(database, jid, fence, eid, None, error="FILE_STORAGE_UNAVAILABLE")
    return True
