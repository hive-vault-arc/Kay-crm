"""History attribution is captured at the command, never inferred from ownership."""

from collections.abc import Sequence
from datetime import datetime
from typing import cast
from uuid import UUID, uuid4

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session
from sqlalchemy.sql.selectable import CTE

from app.contacts.access import readable_contact
from app.contacts.history_models import AssignmentEvent, TimelineEvent
from app.contacts.models import Contact
from app.db.session import Database
from app.identity.models import AuditEvent, User
from app.identity.sessions import CurrentIdentity, current_identity


def record(
    session: Session,
    identity: CurrentIdentity,
    cid: UUID,
    action: str,
    *,
    body: str = "",
    reason: str = "",
    enquiry_id: UUID | None = None,
    related: UUID | None = None,
    deal_id: UUID | None = None,
    duration_minutes: int | None = None,
    direction: str | None = None,
    projects: list[str] | None = None,
    occurred_at: datetime | None = None,
) -> UUID:
    eid = uuid4()
    event = TimelineEvent(
        id=eid,
        contact_id=cid,
        actor_user_id=identity.user.id,
        actor_name=identity.user.display_name,
        action=action,
        body=body,
        reason=reason,
        enquiry_id=enquiry_id,
        related_contact_id=related,
        deal_id=deal_id,
        duration_minutes=duration_minutes,
        direction=direction,
        activity_projects=projects or [],
    )
    if occurred_at is not None:
        event.occurred_at = occurred_at
    session.add(event)
    session.add(
        AuditEvent(
            actor_user_id=identity.user.id,
            action=action if "." in action else f"contacts.{action}",
            contact_id=cid,
            enquiry_id=enquiry_id,
            deal_id=deal_id,
        )
    )
    return eid


def assignment(
    session: Session,
    identity: CurrentIdentity,
    cid: UUID,
    action: str,
    previous: UUID | None,
    new: UUID | None,
    reason: str,
    enquiry_id: UUID | None = None,
) -> None:
    def name(uid: UUID | None) -> str | None:
        return session.scalar(select(User.display_name).where(User.id == uid)) if uid else None

    session.add(
        AssignmentEvent(
            contact_id=cid,
            actor_user_id=identity.user.id,
            actor_name=identity.user.display_name,
            action=action,
            previous_user_id=previous,
            new_user_id=new,
            previous_name=name(previous),
            new_name=name(new),
            reason=reason,
            enquiry_id=enquiry_id,
        )
    )


def history_contacts(cid: UUID) -> CTE:
    lineage = select(Contact.id).where(Contact.id == cid).cte("lineage", recursive=True)
    return lineage.union_all(
        select(Contact.id).join(lineage, Contact.merged_into_contact_id == lineage.c.id)
    )


def read_history(
    database: Database, token: str, cid: UUID, kind: str, page: int, size: int
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        contact = readable_contact(session, current_identity(session, token), cid)
        lineage = history_contacts(contact.id)
        model = TimelineEvent if kind == "timeline" else AssignmentEvent
        base = select(model).where(model.contact_id.in_(select(lineage.c.id)))
        total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
        rows = session.scalars(
            base.order_by(model.occurred_at.desc(), model.id).offset((page - 1) * size).limit(size)
        ).all()
        items: list[dict[str, object]] = []
        for row in cast(Sequence[TimelineEvent | AssignmentEvent], rows):
            item: dict[str, object] = {
                "id": str(row.id),
                "contact_id": str(row.contact_id),
                "actor": {
                    "id": str(row.actor_user_id) if row.actor_user_id else None,
                    "display_name": row.actor_name,
                },
                "action": row.action,
                "reason": row.reason,
                "occurred_at": row.occurred_at.isoformat(),
                "enquiry_id": str(row.enquiry_id) if row.enquiry_id else None,
            }
            if isinstance(row, TimelineEvent):
                item.update(
                    body=row.body,
                    deal_id=str(row.deal_id) if row.deal_id else None,
                    related_contact_id=str(row.related_contact_id)
                    if row.related_contact_id
                    else None,
                )
            else:
                item.update(
                    previous_user={
                        "id": str(row.previous_user_id),
                        "display_name": row.previous_name,
                    }
                    if row.previous_user_id
                    else None,
                    new_user={"id": str(row.new_user_id), "display_name": row.new_name}
                    if row.new_user_id
                    else None,
                )
            items.append(item)
        return {
            "items": items,
            "page": page,
            "page_size": size,
            "total": total,
            "has_next": page * size < total,
            "has_previous": page > 1,
        }
