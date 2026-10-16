"""PostgreSQL outbox dispatch, SKIP LOCKED leases and fenced ClamAV completion."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import and_, or_, select
from sqlalchemy.dialects.postgresql import insert

from app.db.session import Database
from app.files.models import DocumentVersion, Job, Notification, OutboxEvent
from app.files.scanner import scan
from app.files.storage import PrivateStorage
from app.identity.security import IdentityError
from app.settings import Settings


def dispatch(database: Database) -> None:
    with database.session() as session, session.begin():
        events = session.scalars(
            select(OutboxEvent)
            .where(
                OutboxEvent.kind == "file.scan",
                ~select(Job.id).where(Job.outbox_id == OutboxEvent.id).exists(),
            )
            .order_by(OutboxEvent.created_at, OutboxEvent.id)
            .limit(50)
            .with_for_update(skip_locked=True)
        ).all()
        for event in events:
            session.add(Job(outbox_id=event.id, state="ready", attempts=0))


def claim(database: Database) -> tuple[UUID, UUID, UUID] | None:
    now = datetime.now(UTC)
    with database.session() as session, session.begin():
        exhausted = session.scalars(
            select(Job)
            .where(
                Job.state == "running",
                Job.lease_until <= now,
                Job.attempts >= 5,
                Job.outbox_id.in_(select(OutboxEvent.id).where(OutboxEvent.kind == "file.scan")),
            )
            .with_for_update(skip_locked=True)
            .limit(50)
        ).all()
        for expired_job in exhausted:
            (
                expired_job.state,
                expired_job.lease_token,
                expired_job.lease_until,
                expired_job.error_code,
            ) = (
                "failed",
                None,
                None,
                "WORKER_INTERRUPTED",
            )
            event = session.get(OutboxEvent, expired_job.outbox_id)
            version = session.get(DocumentVersion, event.version_id) if event else None
            if version and version.state == "pending_scan":
                version.scan_error = "WORKER_INTERRUPTED"
        job = session.scalar(
            select(Job)
            .where(
                Job.attempts < 5,
                Job.outbox_id.in_(select(OutboxEvent.id).where(OutboxEvent.kind == "file.scan")),
                or_(
                    and_(Job.state.in_(["ready", "retry"]), Job.available_at <= now),
                    and_(Job.state == "running", Job.lease_until <= now),
                ),
            )
            .order_by(Job.available_at, Job.id)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if job is None:
            return None
        token = uuid4()
        job.state, job.lease_token, job.lease_until = "running", token, now + timedelta(seconds=90)
        job.attempts += 1
        event = session.get(OutboxEvent, job.outbox_id)
        if event is None or event.version_id is None:
            raise RuntimeError("OUTBOX_INTEGRITY_ERROR")
        return job.id, token, event.version_id


def finish(
    database: Database,
    jid: UUID,
    fence: UUID,
    vid: UUID,
    verdict: tuple[str, str] | None,
    error: str | None = None,
) -> bool:
    now = datetime.now(UTC)
    with database.session() as session, session.begin():
        job = session.scalar(select(Job).where(Job.id == jid).with_for_update())
        if (
            job is None
            or job.state != "running"
            or job.lease_token != fence
            or job.lease_until is None
            or job.lease_until <= now
        ):
            return False
        version = session.scalar(
            select(DocumentVersion).where(DocumentVersion.id == vid).with_for_update()
        )
        if version is None or version.state != "pending_scan":
            job.state, job.lease_token, job.lease_until = "done", None, None
            return True
        job.lease_token, job.lease_until = None, None
        if verdict is None:
            job.state = "failed" if job.attempts >= 5 else "retry"
            job.available_at = now + timedelta(seconds=min(300, 2**job.attempts))
            job.error_code = version.scan_error = error or "ANTIVIRUS_UNAVAILABLE"
            return True
        version.state, version.scanner_version = verdict
        version.scanned_at, version.scan_error = now, None
        job.state, job.error_code = "done", None
        session.execute(
            insert(Notification)
            .values(
                id=uuid4(),
                user_id=version.created_by_user_id,
                event_key=f"file.scanned:{version.id}",
                document_id=version.document_id,
            )
            .on_conflict_do_nothing(index_elements=["user_id", "event_key"])
        )
        return True


def run_once(database: Database, settings: Settings) -> bool:
    dispatch(database)
    work = claim(database)
    if work is None:
        return False
    jid, fence, vid = work
    try:
        with database.session() as session:
            version = session.get(DocumentVersion, vid)
            if version is None:
                raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503)
            data = PrivateStorage(settings).read(
                version.object_key, version.size_bytes, version.sha256
            )
        verdict = scan(settings, data)
    except IdentityError as error:
        finish(database, jid, fence, vid, None, error.code)
    else:
        finish(database, jid, fence, vid, verdict)
    return True
