"""Current linked-contact scope precedes every count, projection and alias read."""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.contacts.access import readable_contact
from app.db.session import Database
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.models import Offering
from app.inventory.queries import money, offering_view
from app.inventory.selection import target_views
from app.inventory.stock_review import occupied
from app.requirements.contracts import RequirementQuery
from app.requirements.models import Requirement, RequirementCriterion, ShortlistEntry


def authorized(session: Session, identity: CurrentIdentity, rid: UUID) -> Requirement:
    row = session.get(Requirement, rid)
    if row is None:
        raise IdentityError("NOT_FOUND", 404)
    readable_contact(session, identity, row.contact_id)
    return row


def project(session: Session, rows: Sequence[Requirement]) -> list[dict[str, object]]:
    ids = [r.id for r in rows]
    criteria: dict[UUID, list[dict[str, object]]] = {rid: [] for rid in ids}
    for item in session.scalars(
        select(RequirementCriterion)
        .where(RequirementCriterion.requirement_id.in_(ids))
        .order_by(RequirementCriterion.key)
    ):
        value: object = item.value_text
        if item.value_number is not None:
            value = int(item.value_number) if item.key == "rooms" else money(item.value_number)
        elif item.value_bool is not None:
            value = item.value_bool
        criteria[item.requirement_id].append(
            {"key": item.key, "importance": item.importance, "value": value}
        )
    counts = dict(
        session.execute(
            select(ShortlistEntry.requirement_id, func.count())
            .where(ShortlistEntry.requirement_id.in_(ids))
            .group_by(ShortlistEntry.requirement_id)
        ).all()
    )
    return [
        {
            "id": str(r.id),
            "contact_id": str(r.contact_id),
            "title": r.title,
            "intent": r.intent,
            "currency": r.currency,
            "version": r.version,
            "budget_min_mad": money(r.budget_min_mad),
            "budget_max_mad": money(r.budget_max_mad),
            "budget_period": r.budget_period,
            "annual_budget_min_mad": money(
                r.budget_min_mad * (12 if r.budget_period == "month" else 1)
            )
            if r.intent == "rental" and r.budget_min_mad is not None
            else None,
            "annual_budget_max_mad": money(
                r.budget_max_mad * (12 if r.budget_period == "month" else 1)
            )
            if r.intent == "rental" and r.budget_max_mad is not None
            else None,
            "criteria": criteria[r.id],
            "shortlist_count": counts.get(r.id, 0),
            "created_by_user_id": str(r.created_by_user_id),
            "updated_by_user_id": str(r.updated_by_user_id),
            "created_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat(),
        }
        for r in rows
    ]


def detail(session: Session, identity: CurrentIdentity, rid: UUID) -> dict[str, object]:
    row = authorized(session, identity, rid)
    entries = session.execute(
        select(ShortlistEntry, Offering)
        .join(Offering, Offering.id == ShortlistEntry.offering_id)
        .where(ShortlistEntry.requirement_id == rid)
        .order_by(ShortlistEntry.created_at, ShortlistEntry.offering_id)
    ).all()
    targets = target_views(session, [e[1] for e in entries])
    occupancy = occupied(session, [e[1] for e in entries])
    result = project(session, [row])[0]
    result["shortlist"] = [
        {
            "offering": {
                **offering_view(o),
                "occupied": o.id in occupancy,
                "target": targets[o.id],
            },
            "feedback": e.feedback,
            "created_by_user_id": str(e.created_by_user_id),
            "updated_by_user_id": str(e.updated_by_user_id),
            "created_at": e.created_at.isoformat(),
            "updated_at": e.updated_at.isoformat(),
        }
        for e, o in entries
    ]
    return result


def read_detail(database: Database, token: str, rid: UUID) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        return detail(session, current_identity(session, token), rid)


def read_list(database: Database, token: str, query: RequirementQuery) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        contact = readable_contact(session, current_identity(session, token), query.contact_id)
        where = Requirement.contact_id == contact.id
        total = session.scalar(select(func.count()).select_from(Requirement).where(where)) or 0
        rows = session.scalars(
            select(Requirement)
            .where(where)
            .order_by(Requirement.created_at, Requirement.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return {
            "items": project(session, rows),
            "total": total,
            "page": query.page,
            "page_size": query.page_size,
            "has_previous": query.page > 1,
            "has_next": query.page * query.page_size < total,
        }
