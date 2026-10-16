"""Merge reparents current task scope without rewriting owners, origins or authors."""

from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.identity.sessions import CurrentIdentity
from app.work.models import Task
from app.work.records import append_event


def preview_tasks(session: Session, ids: list[UUID]) -> list[dict[str, object]]:
    return [
        {
            "id": str(t.id),
            "contact_id": str(t.contact_id),
            "version": t.version,
            "status": t.status,
            "owner_user_id": str(t.owner_user_id),
        }
        for t in session.scalars(select(Task).where(Task.contact_id.in_(ids)).order_by(Task.id))
    ]


def merge_tasks(session: Session, identity: CurrentIdentity, source: UUID, survivor: UUID) -> None:
    session.execute(text("SET LOCAL kay.task_merge='on'"))
    session.execute(text("SET LOCAL kay.task_action='contact_merged'"))
    for row in session.scalars(
        select(Task).where(Task.contact_id == source).order_by(Task.id).with_for_update()
    ):
        row.contact_id, row.updated_by_user_id = survivor, identity.user.id
        row.version += 1
        session.flush()
        append_event(session, identity, row, "contact_merged")
    session.flush()
    session.execute(text("SET LOCAL kay.task_merge='off'"))
