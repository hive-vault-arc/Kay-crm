"""Filter scope before work counts/pages and use the backend's Casablanca clock."""

from datetime import UTC, datetime, time, timedelta
from uuid import UUID

from sqlalchemy import func, or_, select, text

from app.contacts.access import contact_scope, readable_contact
from app.contacts.models import Contact, Enquiry
from app.db.session import Database
from app.deals.access import authorized as authorized_deal
from app.deals.models import Deal
from app.identity.sessions import current_identity
from app.schedule.models import Visit
from app.schedule.records import view as visit_view
from app.schedule.rules import ACTIVE, ZONE
from app.work.contracts import CalendarWorkQuery, PageQuery, TaskQuery
from app.work.models import Task, TaskEvent
from app.work.records import authorized, view
from app.work.worker import instant


def page(items: list[dict[str, object]], total: int, query: PageQuery) -> dict[str, object]:
    return {
        "items": items,
        "total": total,
        "page": query.page,
        "page_size": query.page_size,
        "has_next": query.page * query.page_size < total,
        "has_previous": query.page > 1,
    }


def clock_context(now: datetime | None = None) -> dict[str, str]:
    clock = instant(now)
    today = clock.astimezone(ZONE).date()
    return {"now": clock.isoformat(), "today": today.isoformat(), "time_zone": "Africa/Casablanca"}


def read_tasks(
    database: Database, token: str, query: TaskQuery, now: datetime | None = None
) -> dict[str, object]:
    clock = instant(now)
    today = clock.astimezone(ZONE).date()
    start = datetime.combine(today, time(), ZONE).astimezone(UTC)
    end = datetime.combine(today + timedelta(days=1), time(), ZONE).astimezone(UTC)
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        base = (
            select(Task).join(Contact, Contact.id == Task.contact_id).where(contact_scope(identity))
        )
        if identity.user.role == "agent":
            base = base.where(Contact.archived_at.is_(None))
        if query.contact_id:
            contact = readable_contact(session, identity, query.contact_id)
            base = base.where(Task.contact_id == contact.id)
        if query.deal_id:
            deal = authorized_deal(session, identity, query.deal_id)
            base = base.where(Task.deal_id == deal.id)
        if query.owner_user_id:
            base = base.where(Task.owner_user_id == query.owner_user_id)
        if query.bucket in ("open", "today", "overdue", "upcoming"):
            base = base.where(Task.status == "open", Contact.archived_at.is_(None))
            if query.bucket == "today":
                base = base.where(Task.due_at >= start, Task.due_at < end)
            elif query.bucket == "overdue":
                base = base.where(Task.due_at < clock)
            elif query.bucket == "upcoming":
                base = base.where(Task.due_at >= end)
        elif query.bucket in ("completed", "cancelled"):
            base = base.where(Task.status == query.bucket)
        total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
        rows = session.scalars(
            base.order_by(Task.due_at, Task.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return page([view(session, row) for row in rows], total, query) | clock_context(clock)


def calendar_work(database: Database, token: str, query: CalendarWorkQuery) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        base = (
            select(Task)
            .join(Contact, Contact.id == Task.contact_id)
            .outerjoin(Deal, Deal.id == Task.deal_id)
            .outerjoin(Enquiry, Enquiry.id == Task.enquiry_id)
            .where(
                contact_scope(identity),
                Contact.archived_at.is_(None),
                Contact.merged_into_contact_id.is_(None),
                Deal.archived_at.is_(None),
                Enquiry.archived_at.is_(None),
                Task.important.is_(True),
                Task.status == "open",
                Task.due_at >= query.start_at,
                Task.due_at < query.end_at,
            )
        )
        if identity.user.role == "agent":
            base = base.where(
                or_(Task.enquiry_id.is_(None), Enquiry.assigned_agent_id.is_not(None))
            )
        total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
        rows = session.scalars(
            base.order_by(Task.due_at, Task.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return page(
            [
                {
                    "id": str(row.id),
                    "title": row.title,
                    "kind": row.kind,
                    "due_local": row.due_at.astimezone(ZONE).isoformat(),
                    "contact_id": str(row.contact_id),
                    "enquiry_id": str(row.enquiry_id) if row.enquiry_id else None,
                    "deal_id": str(row.deal_id) if row.deal_id else None,
                }
                for row in rows
            ],
            total,
            query,
        )


def detail(
    database: Database, token: str, tid: UUID, query: PageQuery | None = None
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        row = authorized(session, current_identity(session, token), tid)
        if query is None:
            return view(session, row)
        base = select(TaskEvent).where(TaskEvent.task_id == row.id)
        total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
        events = session.scalars(
            base.order_by(TaskEvent.occurred_at.desc(), TaskEvent.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return page(
            [
                {
                    "id": str(e.id),
                    "version": e.version,
                    "action": e.action,
                    "actor": {"id": str(e.actor_user_id), "display_name": e.actor_name},
                    "snapshot": e.snapshot,
                    "occurred_at": e.occurred_at.isoformat(),
                    "occurred_local": e.occurred_at.astimezone(ZONE).isoformat(),
                }
                for e in events
            ],
            total,
            query,
        )


def follow_up(
    database: Database, token: str, query: PageQuery, now: datetime | None = None
) -> dict[str, object]:
    clock = instant(now)
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        base = (
            select(Visit)
            .join(Contact, Contact.id == Visit.contact_id)
            .where(
                contact_scope(identity),
                Contact.archived_at.is_(None),
                Visit.status.in_(ACTIVE),
                Visit.end_at < clock,
            )
        )
        total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
        rows = session.scalars(
            base.order_by(Visit.end_at, Visit.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return page([visit_view(session, row) for row in rows], total, query) | clock_context(clock)
