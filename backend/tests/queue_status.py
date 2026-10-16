"""Read-only, payload-free diagnostics for the isolated browser supervisor."""

from sqlalchemy import func, select

from app.db.session import Database
from app.files.models import Job, OutboxEvent


def export_queue(database: Database) -> dict[str, object]:
    with database.session() as session:
        rows = session.execute(
            select(Job.state, Job.error_code, func.count())
            .join(OutboxEvent, OutboxEvent.id == Job.outbox_id)
            .where(OutboxEvent.kind == "export.generate")
            .group_by(Job.state, Job.error_code)
            .order_by(Job.state, Job.error_code)
        ).all()
        undispatched = session.scalar(
            select(func.count())
            .select_from(OutboxEvent)
            .where(
                OutboxEvent.kind == "export.generate",
                ~select(Job.id).where(Job.outbox_id == OutboxEvent.id).exists(),
            )
        )
        return {
            "undispatched": undispatched,
            "jobs": [dict(state=state, error=error, count=count) for state, error, count in rows],
        }
