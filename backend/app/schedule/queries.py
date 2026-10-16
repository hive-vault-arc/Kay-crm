"""Scoped details and deliberately metadata-free colleague busy intervals."""

from uuid import UUID

from sqlalchemy import func, select, text

from app.contacts.access import contact_scope, has_scope, readable_contact
from app.contacts.models import Contact
from app.db.session import Database
from app.identity.models import User
from app.identity.security import IdentityError
from app.identity.sessions import current_identity
from app.schedule.contracts import AvailabilityQuery, CalendarQuery, PolicyEdit
from app.schedule.models import Visit, VisitEvent, VisitParticipant
from app.schedule.policy import preview
from app.schedule.records import authorized, view
from app.schedule.rules import ACTIVE, ZONE, capacity_intervals, hard_error, policy_view


def page(items: list[dict[str, object]], total: int, query: CalendarQuery) -> dict[str, object]:
    return {
        "items": items,
        "total": total,
        "page": query.page,
        "page_size": query.page_size,
        "has_next": query.page * query.page_size < total,
        "has_previous": query.page > 1,
    }


def read_policy(
    database: Database, token: str, body: PolicyEdit | None = None, secret: str = ""
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        return preview(session, identity, body, secret) if body else policy_view(session)


def read_visits(
    database: Database, token: str, query: CalendarQuery, *, busy: bool = False
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        base = select(Visit).where(Visit.start_at < query.end_at, Visit.end_at > query.start_at)
        if busy:
            if query.contact_id:
                raise IdentityError("VALIDATION_ERROR", 422)
            base = base.where(Visit.status.in_(ACTIVE))
        else:
            base = base.join(Contact, Contact.id == Visit.contact_id).where(
                contact_scope(identity), Contact.merged_into_contact_id.is_(None)
            )
            if identity.user.role == "agent":
                base = base.where(Contact.archived_at.is_(None))
            if query.contact_id:
                contact = readable_contact(session, identity, query.contact_id)
                base = base.where(Visit.contact_id == contact.id)
        if query.user_id:
            base = base.where(
                select(VisitParticipant.visit_id)
                .where(
                    VisitParticipant.visit_id == Visit.id, VisitParticipant.user_id == query.user_id
                )
                .exists()
            )
        total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
        rows = session.scalars(
            base.order_by(Visit.start_at, Visit.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        policy = policy_view(session)
        values = [
            {
                "start_at": row.start_at.astimezone(ZONE).isoformat(),
                "end_at": row.end_at.astimezone(ZONE).isoformat(),
                "busy": True,
            }
            if busy
            else {
                **view(session, row),
                "review_code": hard_error(session, row, policy, row.id)
                if row.status in ACTIVE
                else None,
            }
            for row in rows
        ]
        return page(values, total, query)


def detail(
    database: Database, token: str, vid: UUID, *, history: bool = False
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        row = authorized(session, current_identity(session, token), vid)
        if history:
            # One event per version; a bounded chronological tail keeps detail finite.
            events = session.scalars(
                select(VisitEvent)
                .where(VisitEvent.visit_id == vid)
                .order_by(VisitEvent.version.desc())
                .limit(100)
            ).all()
            return {
                "items": [
                    {
                        "id": str(e.id),
                        "actor": {"id": str(e.actor_user_id), "display_name": e.actor_name},
                        "action": e.action,
                        "version": e.version,
                        "reason": e.reason,
                        "snapshot": e.snapshot,
                        "occurred_at": e.occurred_at.isoformat(),
                    }
                    for e in events
                ]
            }
        return {
            **view(session, row),
            "review_code": hard_error(session, row, policy_view(session), row.id)
            if row.status in ACTIVE
            else None,
        }


def availability(database: Database, token: str, query: AvailabilityQuery) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        if query.exclude_visit_id:
            authorized(session, identity, query.exclude_visit_id)
        policy = policy_view(session)
        return {
            "policy_version": policy["version"],
            "time_zone": "Africa/Casablanca",
            "type": query.type,
            "bookable": hard_error(session, query, policy, query.exclude_visit_id) is None,
            "code": hard_error(session, query, policy, query.exclude_visit_id),
            "company_car_intervals": capacity_intervals(
                session,
                query,
                int(str(policy["company_car_capacity_per_hour"])),
                query.exclude_visit_id,
            )
            if query.type == "company_car"
            else [],
            "preview_only": True,
        }


def colleagues(database: Database, token: str, cid: UUID | None = None) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        contact = readable_contact(session, identity, cid) if cid else None
        from app.contacts.eligibility import accounts, eligible

        rows = accounts(session, set(session.scalars(select(User.id))))
        return {
            "items": [
                {"id": str(u.id), "display_name": u.display_name}
                for u, c in sorted(
                    rows.values(), key=lambda pair: (pair[0].display_name, pair[0].id)
                )
                if eligible(u, c) and (contact is None or has_scope(session, u.id, contact))
            ]
        }
