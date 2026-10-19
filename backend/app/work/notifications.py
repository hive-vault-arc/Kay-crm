"""Private inbox projections authorize current parents before counts and pagination."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import ColumnElement, SQLColumnExpression, and_, func, or_, select, text
from sqlalchemy.orm import Session

from app.contacts.access import contact_scope
from app.contacts.models import Contact
from app.db.session import Database
from app.deals.models import Deal
from app.files.models import Document, Notification
from app.files.service import parent
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.hierarchy_models import Development
from app.inventory.models import Property
from app.schedule.models import Visit, VisitParticipant
from app.schedule.rules import ACTIVE, ZONE
from app.work.contracts import NotificationQuery
from app.work.models import Task
from app.work.queries import page


def scope(identity: CurrentIdentity) -> ColumnElement[bool]:
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
            or_(
                Task.deal_id.is_(None),
                Task.deal_id.in_(select(Deal.id).where(Deal.archived_at.is_(None))),
            ),
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
    document = (
        select(Document.id)
        .where(
            Document.id == Notification.document_id,
            Document.archived_at.is_(None),
            or_(
                contact_allowed(Document.contact_id),
                select(Deal.id)
                .where(
                    Deal.id == Document.deal_id,
                    Deal.archived_at.is_(None),
                    contact_allowed(Deal.contact_id),
                )
                .exists(),
                select(Property.id).where(Property.id == Document.property_id).exists(),
                select(Development.id)
                .where(Development.id == Document.development_id, Development.archived_at.is_(None))
                .exists(),
            ),
        )
        .exists()
    )
    return and_(Notification.user_id == identity.user.id, or_(task, visit, document))


def view(session: Session, row: Notification) -> dict[str, object]:
    title, context, href, due = "Analyse du fichier terminée", "Fichier", None, None
    if row.task_id:
        task = session.get(Task, row.task_id)
        if task is None:
            raise IdentityError("NOT_FOUND", 404)
        title, context, due = (
            "Échéance de tâche",
            task.title,
            task.due_at.astimezone(ZONE).isoformat(),
        )
        href = (
            f"/deals/{task.deal_id}?task={task.id}"
            if task.deal_id
            else f"/contacts/{task.contact_id}?task={task.id}"
        )
    elif row.visit_id:
        visit = session.get(Visit, row.visit_id)
        if visit is None:
            raise IdentityError("NOT_FOUND", 404)
        title = (
            "Rappel de visite : J-1"
            if row.kind == "visit.reminder.day"
            else "Rappel de visite : H-1"
        )
        context, href, due = (
            visit.title,
            f"/visits/{visit.id}",
            visit.start_at.astimezone(ZONE).isoformat(),
        )
    elif row.document_id:
        document = session.get(Document, row.document_id)
        if document is None:
            raise IdentityError("NOT_FOUND", 404)
        kind, pid = parent(document)
        routes = {
            "contact": "contacts",
            "deal": "deals",
            "property": "projects/properties",
            "development": "projects",
        }
        href = f"/{routes[kind]}/{pid}"
    return {
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
    database: Database, token: str, query: NotificationQuery
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        visible = select(Notification).where(scope(identity))
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


def mark_read(database: Database, token: str, nid: UUID) -> dict[str, bool]:
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        identity = current_identity(session, token)
        session.scalar(select(User).where(User.id == identity.user.id).with_for_update())
        session.expire_all()
        identity = current_identity(session, token)
        row = session.scalar(
            select(Notification).where(Notification.id == nid, scope(identity)).with_for_update()
        )
        if row is None:
            raise IdentityError("NOT_FOUND", 404)
        if row.read_at is None:
            row.read_at = datetime.now(UTC)
        return {"read": True}
