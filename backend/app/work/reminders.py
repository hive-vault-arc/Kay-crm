"""Atomic typed outbox scheduling and invalidation, never a message snapshot."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.files.models import Job, OutboxEvent
from app.schedule.models import Visit
from app.work.models import Task

KINDS = ("visit.reminder.day", "visit.reminder.hour", "task.due")


def synchronize(session: Session, row: Visit | Task) -> None:
    is_visit = isinstance(row, Visit)
    parent = OutboxEvent.visit_id if is_visit else OutboxEvent.task_id
    session.execute(
        update(OutboxEvent)
        .where(
            parent == row.id,
            OutboxEvent.schedule_version != row.schedule_version,
            OutboxEvent.invalidated_at.is_(None),
        )
        .values(invalidated_at=datetime.now(UTC))
    )
    session.execute(
        update(Job)
        .where(
            Job.outbox_id.in_(
                select(OutboxEvent.id).where(
                    parent == row.id, OutboxEvent.schedule_version != row.schedule_version
                )
            ),
            Job.state.in_(["ready", "running", "retry", "failed"]),
        )
        .values(state="invalidated", lease_token=None, lease_until=None, error_code=None)
    )
    active = row.status in ("scheduled", "confirmed") if is_visit else row.status == "open"
    if not active:
        return
    due_times = (
        [
            ("visit.reminder.day", row.start_at - timedelta(days=1)),
            ("visit.reminder.hour", row.start_at - timedelta(hours=1)),
        ]
        if isinstance(row, Visit)
        else [("task.due", row.due_at)]
    )
    for kind, due in due_times:
        session.execute(
            insert(OutboxEvent)
            .values(
                id=uuid4(),
                kind=kind,
                visit_id=row.id if is_visit else None,
                task_id=None if is_visit else row.id,
                schedule_version=row.schedule_version,
                due_at=due,
                dedupe_key=f"{kind}:{row.id}:{row.schedule_version}",
            )
            .on_conflict_do_nothing(index_elements=["dedupe_key"])
        )
