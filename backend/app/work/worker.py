"""Deferred internal effects use the existing queue, leases and durable dedupe keys."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import and_, or_, select
from sqlalchemy.dialects.postgresql import insert

from app.contacts.access import has_scope
from app.contacts.models import Contact
from app.db.session import Database
from app.deals.models import Deal
from app.files.models import Job, Notification, OutboxEvent
from app.identity.models import AGENCY_ID, Agency
from app.schedule.models import Visit, VisitParticipant
from app.work.models import Task
from app.work.reminders import KINDS


def instant(now: datetime | None = None) -> datetime:
    value = now or datetime.now(UTC)
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("AWARE_WORKER_CLOCK_REQUIRED")
    return value.astimezone(UTC)


def dispatch(database: Database) -> None:
    with database.session() as session, session.begin():
        events = session.scalars(
            select(OutboxEvent)
            .where(
                OutboxEvent.kind.in_(KINDS),
                ~select(Job.id).where(Job.outbox_id == OutboxEvent.id).exists(),
            )
            .order_by(OutboxEvent.created_at, OutboxEvent.id)
            .limit(50)
            .with_for_update(skip_locked=True)
        ).all()
        for event in events:
            if event.due_at is None:
                raise RuntimeError("OUTBOX_INTEGRITY_ERROR")
            session.add(
                Job(
                    outbox_id=event.id,
                    state="invalidated" if event.invalidated_at else "ready",
                    attempts=0,
                    available_at=event.due_at,
                )
            )


def claim(database: Database, now: datetime | None = None) -> tuple[UUID, UUID] | None:
    clock = instant(now)
    with database.session() as session, session.begin():
        base = Job.outbox_id.in_(select(OutboxEvent.id).where(OutboxEvent.kind.in_(KINDS)))
        exhausted = session.scalars(
            select(Job)
            .where(
                base,
                Job.state == "running",
                Job.lease_until <= clock,
                Job.attempts >= 5,
            )
            .limit(50)
            .with_for_update(skip_locked=True)
        ).all()
        for expired in exhausted:
            expired.state, expired.lease_token, expired.lease_until, expired.error_code = (
                "failed",
                None,
                None,
                "WORKER_INTERRUPTED",
            )
        row = session.scalar(
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
        if row is None:
            return None
        fence = uuid4()
        row.state, row.lease_token, row.lease_until = (
            "running",
            fence,
            clock + timedelta(seconds=90),
        )
        row.attempts += 1
        return row.id, fence


def valid_fence(row: Job | None, fence: UUID, clock: datetime) -> bool:
    return bool(
        row
        and row.state == "running"
        and row.lease_token == fence
        and row.lease_until
        and row.lease_until > clock
    )


def deliver(database: Database, jid: UUID, fence: UUID, now: datetime | None = None) -> bool:
    clock = instant(now)
    with database.session() as session, session.begin():
        # Scope mutations and scheduling commands already serialize on this agency row.
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        job = session.scalar(select(Job).where(Job.id == jid).with_for_update())
        if not valid_fence(job, fence, clock) or job is None:
            return False
        event = session.get(OutboxEvent, job.outbox_id)
        if event is None or event.kind not in KINDS:
            raise RuntimeError("OUTBOX_INTEGRITY_ERROR")
        if event.due_at is None or event.due_at > clock:
            return False
        target: Visit | Task | None
        if event.visit_id:
            target = session.get(Visit, event.visit_id)
            valid = (
                target is not None
                and target.status in ("scheduled", "confirmed")
                and target.start_at > clock
            )
            recipients = set(
                session.scalars(
                    select(VisitParticipant.user_id).where(
                        VisitParticipant.visit_id == event.visit_id
                    )
                )
            )
            if target:
                recipients.add(target.organizer_user_id)
        else:
            target = session.get(Task, event.task_id) if event.task_id else None
            valid = target is not None and target.status == "open"
            recipients = {target.owner_user_id} if target else set()
        if (
            not valid
            or target is None
            or target.schedule_version != event.schedule_version
            or event.invalidated_at
            or (
                target.deal_id is not None
                and (
                    (deal := session.get(Deal, target.deal_id)) is None
                    or deal.archived_at is not None
                )
            )
        ):
            job.state, job.lease_token, job.lease_until = "invalidated", None, None
            return True
        contact = session.get(Contact, target.contact_id)
        if contact is not None and contact.archived_at is None:
            for uid in sorted(recipients):
                if has_scope(session, uid, contact):
                    session.execute(
                        insert(Notification)
                        .values(
                            id=uuid4(),
                            user_id=uid,
                            event_key=event.dedupe_key,
                            kind=event.kind,
                            visit_id=event.visit_id,
                            task_id=event.task_id,
                            schedule_version=event.schedule_version,
                            created_at=clock,
                        )
                        .on_conflict_do_nothing(index_elements=["user_id", "event_key"])
                    )
        # The effect commits before acknowledgement; a crash here is safe to replay.
        return True


def acknowledge(
    database: Database,
    jid: UUID,
    fence: UUID,
    now: datetime | None = None,
    *,
    error: str | None = None,
) -> bool:
    clock = instant(now)
    with database.session() as session, session.begin():
        row = session.scalar(select(Job).where(Job.id == jid).with_for_update())
        if row is None or not valid_fence(row, fence, clock):
            return False
        row.lease_token, row.lease_until = None, None
        row.state = ("failed" if row.attempts >= 5 else "retry") if error else "done"
        row.error_code = error
        if error:
            row.available_at = clock + timedelta(seconds=min(300, 2**row.attempts))
        return True


def run_once(database: Database, now: datetime | None = None) -> bool:
    dispatch(database)
    work = claim(database, now)
    if work is None:
        return False
    jid, fence = work
    try:
        delivered = deliver(database, jid, fence, now)
    except Exception:
        acknowledge(database, jid, fence, now, error="WORKER_DELIVERY_FAILED")
    else:
        if delivered:
            acknowledge(database, jid, fence, now)
    return True
