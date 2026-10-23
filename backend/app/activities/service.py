"""Current authority and immutable explicit context precede every activity operation."""

import json
from typing import Literal
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.activities.contracts import MANUAL_KINDS, ActivityQuery, NewActivity
from app.contacts.access import readable_contact, scoped_contact
from app.contacts.history import record
from app.contacts.history_models import TimelineEvent
from app.contacts.history_text import activity_body
from app.contacts.models import IdempotencyRecord
from app.contacts.ownership import locked_identity
from app.contacts.queries import enquiry_in_scope
from app.db.session import Database
from app.deals.access import authorized
from app.deals.models import Deal
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity

ActivityScope = Literal["enquiries", "deals"]


def context(
    session: Session, identity: CurrentIdentity, scope: ActivityScope, target: UUID
) -> UUID:
    return (
        enquiry_in_scope(session, identity, target).contact_id
        if scope == "enquiries"
        else authorized(session, identity, target).contact_id
    )


def append_activity(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    scope: ActivityScope,
    target: UUID,
    body: NewActivity,
) -> dict[str, object]:
    route = f"{scope}/{target}/activities"
    digest = keyed_digest(
        secret,
        "activity-command",
        json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")),
    )
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        scoped_record = (
            enquiry_in_scope(session, identity, target)
            if scope == "enquiries"
            else authorized(session, identity, target)
        )
        if scoped_record.archived_at is not None:
            raise IdentityError("RECORD_ARCHIVED", 409)
        cid = scoped_record.contact_id
        contact = readable_contact(session, identity, cid)
        previous = session.get(IdempotencyRecord, (identity.user.id, route, key))
        if previous:
            if previous.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return previous.response
        if contact.archived_at:
            raise IdentityError("CONTACT_ARCHIVED", 409)
        scoped_contact(session, identity, cid)
        event_id = record(
            session,
            identity,
            cid,
            body.kind,
            body=body.body,
            enquiry_id=target if scope == "enquiries" else None,
            deal_id=target if scope == "deals" else None,
            duration_minutes=body.duration_minutes,
            direction=body.direction,
            projects=list(body.projects),
        )
        session.flush()
        response: dict[str, object] = {"id": str(event_id)}
        session.add(
            IdempotencyRecord(
                actor_id=identity.user.id,
                route=route,
                key=key,
                request_hash=digest,
                contact_id=cid,
                response=response,
            )
        )
        return response


def read_activities(
    database: Database,
    token: str,
    scope: ActivityScope,
    target: UUID,
    query: ActivityQuery,
    *,
    origin: bool = False,
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        context(session, identity, scope, target)
        origin_id: UUID | None = None
        if origin:
            if scope != "deals":
                raise IdentityError("NOT_FOUND", 404)
            origin_id = authorized(session, identity, target).enquiry_id
            if origin_id:
                enquiry_in_scope(session, identity, origin_id)
            predicate = TimelineEvent.enquiry_id == origin_id if origin_id else text("false")
        else:
            predicate = (
                TimelineEvent.enquiry_id == target
                if scope == "enquiries"
                else (TimelineEvent.deal_id == target)
                & (TimelineEvent.action != "enquiries.converted")
            )
        base = select(TimelineEvent).where(predicate)
        if query.kind:
            base = base.where(
                TimelineEvent.action.not_in(MANUAL_KINDS)
                if query.kind == "system"
                else TimelineEvent.action == query.kind
            )
        total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
        latest = session.scalar(
            select(func.max(TimelineEvent.occurred_at)).where(
                TimelineEvent.id.in_(select(base.subquery().c.id))
            )
        )
        rows = session.scalars(
            base.order_by(TimelineEvent.occurred_at.desc(), TimelineEvent.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        linked_lead = (
            session.scalar(select(Deal.enquiry_id).where(Deal.id == target))
            if scope == "deals"
            and any(row.action == "deals.created" and not row.body for row in rows)
            else None
        )
        return {
            "items": [
                {
                    "id": str(row.id),
                    "action": row.action,
                    "body": activity_body(
                        row.action,
                        row.body,
                        row.occurred_at,
                        converted_deal=bool(linked_lead),
                    ),
                    "reason": row.reason,
                    "occurred_at": row.occurred_at.isoformat(),
                    "actor": {
                        "id": str(row.actor_user_id) if row.actor_user_id else None,
                        "display_name": row.actor_name,
                    },
                    "duration_minutes": row.duration_minutes,
                    "direction": row.direction,
                    "projects": row.activity_projects,
                }
                for row in rows
            ],
            "page": query.page,
            "page_size": query.page_size,
            "total": total,
            "has_next": query.page * query.page_size < total,
            "has_previous": query.page > 1,
            "last_activity_at": latest.isoformat() if latest else None,
            "origin_enquiry_id": str(origin_id) if origin_id else None,
        }
