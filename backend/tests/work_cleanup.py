"""Only the existing identity/root/lease-guarded synthetic fixture path calls this."""

from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.files.models import Job, Notification, OutboxEvent
from app.work.models import Task, TaskEvent, TaskReceipt


def delete_actor_tasks(session: Session, uid: UUID, contacts: list[UUID]) -> None:
    ids = list(
        session.scalars(
            select(Task.id).where(
                or_(
                    Task.contact_id.in_(contacts),
                    Task.origin_contact_id.in_(contacts),
                    Task.owner_user_id == uid,
                    Task.created_by_user_id == uid,
                    Task.updated_by_user_id == uid,
                    Task.id.in_(select(TaskEvent.task_id).where(TaskEvent.actor_user_id == uid)),
                )
            )
        )
    )
    outbox = select(OutboxEvent.id).where(OutboxEvent.task_id.in_(ids))
    session.execute(delete(Job).where(Job.outbox_id.in_(outbox)))
    session.execute(delete(Notification).where(Notification.task_id.in_(ids)))
    session.execute(delete(OutboxEvent).where(OutboxEvent.task_id.in_(ids)))
    session.execute(
        delete(TaskReceipt).where(or_(TaskReceipt.actor_id == uid, TaskReceipt.task_id.in_(ids)))
    )
    session.execute(delete(TaskEvent).where(TaskEvent.task_id.in_(ids)))
    session.execute(delete(Task).where(Task.id.in_(ids)))
