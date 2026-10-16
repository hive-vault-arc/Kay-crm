"""Local operator queue counts contain no recipient, record, title or message."""

from sqlalchemy import func, select

from app.db.session import Database
from app.files.models import Job, OutboxEvent


def queue_status(database: Database) -> dict[str, object]:
    with database.session() as session:
        rows = session.execute(
            select(OutboxEvent.kind, Job.state, func.count())
            .join(Job, Job.outbox_id == OutboxEvent.id)
            .group_by(OutboxEvent.kind, Job.state)
            .order_by(OutboxEvent.kind, Job.state)
        ).all()
        undispatched = (
            session.scalar(
                select(func.count())
                .select_from(OutboxEvent)
                .where(
                    OutboxEvent.kind.in_(
                        [
                            "file.scan",
                            "task.due",
                            "visit.reminder.day",
                            "visit.reminder.hour",
                            "export.generate",
                            "website.process",
                        ]
                    ),
                    ~select(Job.id).where(Job.outbox_id == OutboxEvent.id).exists(),
                )
            )
            or 0
        )
        return {
            "jobs": [{"kind": kind, "state": state, "count": count} for kind, state, count in rows],
            "undispatched": undispatched,
        }
