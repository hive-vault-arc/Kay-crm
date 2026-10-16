"""Called only inside the identity-guarded isolated synthetic fixture cleanup."""

from uuid import UUID

from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from app.files.models import Job, Notification, OutboxEvent
from app.schedule.models import (
    BreakWindow,
    ScheduleEvent,
    SchedulePolicy,
    ScheduleReceipt,
    Visit,
    VisitEvent,
    VisitParticipant,
    WorkingWindow,
)


def delete_actor_visits(session: Session, uid: UUID, contacts: list[UUID]) -> None:
    ids = select(Visit.id).where(
        or_(
            Visit.contact_id.in_(contacts),
            Visit.origin_contact_id.in_(contacts),
            Visit.organizer_user_id == uid,
            Visit.updated_by_user_id == uid,
            Visit.id.in_(select(VisitEvent.visit_id).where(VisitEvent.actor_user_id == uid)),
            select(VisitParticipant.visit_id)
            .where(VisitParticipant.visit_id == Visit.id, VisitParticipant.user_id == uid)
            .exists(),
        )
    )
    ids = list(session.scalars(ids))
    outbox = select(OutboxEvent.id).where(OutboxEvent.visit_id.in_(ids))
    session.execute(delete(Job).where(Job.outbox_id.in_(outbox)))
    session.execute(delete(Notification).where(Notification.visit_id.in_(ids)))
    session.execute(delete(OutboxEvent).where(OutboxEvent.visit_id.in_(ids)))
    for model, condition in (
        (ScheduleReceipt, or_(ScheduleReceipt.actor_id == uid, ScheduleReceipt.visit_id.in_(ids))),
        (VisitEvent, VisitEvent.visit_id.in_(ids)),
        (VisitParticipant, VisitParticipant.visit_id.in_(ids)),
        (Visit, Visit.id.in_(ids)),
    ):
        session.execute(delete(model).where(condition))
    if session.scalar(select(ScheduleEvent.id).where(ScheduleEvent.actor_user_id == uid).limit(1)):
        session.execute(delete(ScheduleReceipt).where(ScheduleReceipt.visit_id.is_(None)))
        session.execute(delete(ScheduleEvent))
        session.execute(delete(WorkingWindow))
        session.execute(delete(BreakWindow))
        session.execute(
            update(SchedulePolicy).values(
                version=1, company_car_capacity_per_hour=2, updated_by_user_id=None
            )
        )
