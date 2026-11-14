"""Private inbox projections authorize current parents before counts and pagination."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import ColumnElement, SQLColumnExpression, and_, func, or_, select, text
from sqlalchemy.orm import Session

from app.contacts.access import contact_scope
from app.contacts.models import Contact
from app.db.session import Database
from app.files.models import Notification
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity, current_identity
from app.schedule.models import Visit, VisitParticipant
from app.schedule.rules import ACTIVE, ZONE
from app.work.birthdays import BIRTHDAY_EVE, birthday_at, birthday_matches
from app.work.contracts import NotificationQuery
from app.work.holiday_models import HolidayOccurrence
from app.work.holidays import EVE, holiday_at
from app.work.models import Task
from app.work.queries import page


def scope(
    identity: CurrentIdentity, *, birthdays: bool = True, holidays: bool = False
) -> ColumnElement[bool]:
    def contact_allowed(
        cid: SQLColumnExpression[UUID] | SQLColumnExpression[UUID | None],
    ) -> ColumnElement[bool]:
        return (
            select(Contact.id)
            .where(Contact.id == cid, Contact.archived_at.is_(None), contact_scope(identity))
            .exists()
        )

    task = (
        select(Task.id)
        .where(
            Task.id == Notification.task_id,
            Task.status == "open",
            Task.owner_user_id == identity.user.id,
            Task.schedule_version == Notification.schedule_version,
            contact_allowed(Task.contact_id),
        )
        .exists()
    )
    visit = (
        select(Visit.id)
        .where(
            Visit.id == Notification.visit_id,
            Visit.status.in_(ACTIVE),
            Visit.schedule_version == Notification.schedule_version,
            contact_allowed(Visit.contact_id),
            or_(
                Visit.organizer_user_id == identity.user.id,
                select(VisitParticipant.visit_id)
                .where(
                    VisitParticipant.visit_id == Visit.id,
                    VisitParticipant.user_id == identity.user.id,
                )
                .exists(),
            ),
        )
        .exists()
    )
    sources = [task, visit]
    if birthdays:
        sources.append(
            select(Contact.id)
            .where(
                Contact.id == Notification.contact_id,
                Contact.primary_agent_id == identity.user.id,
                Contact.archived_at.is_(None),
                birthday_matches(Notification.birthday_on),
            )
            .exists()
        )
    if holidays:
        return and_(
            Notification.user_id == identity.user.id,
            or_(*sources, Notification.holiday_id.is_not(None)),
        )
    return and_(Notification.user_id == identity.user.id, or_(*sources))


def view(session: Session, row: Notification) -> dict[str, object]:
    extra: dict[str, object] = {}
    if row.holiday_id:
        occurrence = session.get(HolidayOccurrence, row.holiday_id)
        if occurrence is None or occurrence.start_on is None or occurrence.end_on is None:
            raise IdentityError("NOT_FOUND", 404)
        title = "Rappel de jour férié" if row.kind == EVE else "Jour férié aujourd’hui"
        context, href, due = occurrence.name, None, holiday_at(occurrence.start_on).isoformat()
        extra = {
            "start_on": occurrence.start_on.isoformat(),
            "end_on": occurrence.end_on.isoformat(),
            "estimated": occurrence.status == "estimated",
            "corrected": row.holiday_revision is not None,
        }
    elif row.task_id:
        task = session.get(Task, row.task_id)
        if task is None:
            raise IdentityError("NOT_FOUND", 404)
        titles = {
            "task.reminder.day": "Rappel de tâche : J-1",
            "task.reminder.hour": "Rappel de tâche : H-1",
            "task.due": "Échéance de tâche",
        }
        if task.kind == "reminder":
            titles = {
                "task.reminder.day": "Rappel prévu : J-1",
                "task.reminder.hour": "Rappel prévu : H-1",
                "task.due": "Rappel à traiter",
            }
        title, context = titles[row.kind], task.title
        due = task.due_at.astimezone(ZONE).isoformat()
        if task.deal_id:
            href = f"/deals/{task.deal_id}?task={task.id}"
        else:
            href = f"/contacts/{task.contact_id}?task={task.id}"
    elif row.visit_id:
        visit = session.get(Visit, row.visit_id)
        if visit is None:
            raise IdentityError("NOT_FOUND", 404)
        title = (
            "Rappel de visite : J-1"
            if row.kind == "visit.reminder.day"
            else "Rappel de visite : H-1"
            if row.kind == "visit.reminder.hour"
            else "Compte rendu de visite à renseigner"
        )
        context, href, due = (
            visit.title,
            f"/visits/{visit.id}",
            (visit.end_at + timedelta(hours=2) if row.kind == "visit.follow_up" else visit.start_at)
            .astimezone(ZONE)
            .isoformat(),
        )
    elif row.contact_id and row.birthday_on:
        contact = session.get(Contact, row.contact_id)
        if contact is None:
            raise IdentityError("NOT_FOUND", 404)
        title = (
            "Rappel d’anniversaire : J-1" if row.kind == BIRTHDAY_EVE else "Anniversaire du jour"
        )
        context, href, due = (
            contact.name,
            f"/contacts/{contact.id}",
            birthday_at(row.birthday_on).isoformat(),
        )
    else:
        raise IdentityError("NOT_FOUND", 404)
    return {
        **extra,
        "id": str(row.id),
        "kind": row.kind,
        "title": title,
        "context": context,
        "href": href,
        "due_local": due,
        "created_at": row.created_at.isoformat(),
        "read_at": row.read_at.isoformat() if row.read_at else None,
    }


def read_notifications(
    database: Database,
    token: str,
    query: NotificationQuery,
    *,
    birthdays: bool = True,
    holidays: bool = False,
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        visible = select(Notification).where(
            scope(identity, birthdays=birthdays, holidays=holidays)
        )
        unread = (
            session.scalar(
                select(func.count()).select_from(
                    visible.where(Notification.read_at.is_(None)).subquery()
                )
            )
            or 0
        )
        base = visible
        if query.state != "all":
            base = base.where(
                Notification.read_at.is_(None)
                if query.state == "unread"
                else Notification.read_at.is_not(None)
            )
        total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
        rows = session.scalars(
            base.order_by(Notification.created_at.desc(), Notification.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return page([view(session, row) for row in rows], total, query) | {"unread_total": unread}


def mark_read(
    database: Database, token: str, nid: UUID, *, holidays: bool = False
) -> dict[str, bool]:
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        identity = current_identity(session, token)
        session.scalar(select(User).where(User.id == identity.user.id).with_for_update())
        session.expire_all()
        identity = current_identity(session, token)
        row = session.scalar(
            select(Notification)
            .where(Notification.id == nid, scope(identity, holidays=holidays))
            .with_for_update()
        )
        if row is None:
            raise IdentityError("NOT_FOUND", 404)
        if row.read_at is None:
            row.read_at = datetime.now(UTC)
        return {"read": True}
