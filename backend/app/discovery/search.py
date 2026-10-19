from uuid import UUID

from sqlalchemy import (
    ColumnElement,
    String,
    cast,
    false,
    func,
    literal,
    or_,
    select,
    text,
    union_all,
)
from sqlalchemy.sql import Select, SQLColumnExpression, Subquery

from app.contacts.access import contact_scope
from app.contacts.models import Contact, ContactEmail, ContactPhone, Enquiry
from app.db.session import Database
from app.deals.models import Deal
from app.discovery.contracts import SearchQuery
from app.files.models import Document
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.hierarchy_models import Development, UnitType
from app.inventory.models import Property


def page_result(
    items: list[dict[str, object]], total: int, page: int, size: int
) -> dict[str, object]:
    return dict(
        items=items,
        total=total,
        page=page,
        page_size=size,
        has_next=page * size < total,
        has_previous=page > 1,
    )


def projections(identity: CurrentIdentity, query: SearchQuery) -> Subquery:
    contacts = (
        select(Contact.id)
        .where(
            contact_scope(identity),
            Contact.archived_at.is_(None),
            Contact.merged_into_contact_id.is_(None),
        )
        .cte("scoped_contacts")
    )
    developments = select(Development.id).where(Development.archived_at.is_(None))
    properties = select(Property.id).where(
        Property.archived_at.is_(None),
        or_(Property.development_id.is_(None), Property.development_id.in_(developments)),
    )
    needle = "%" + query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    digits = "".join(c for c in query.q if c.isdecimal())
    contact_match = or_(
        Contact.name.ilike(needle, escape="\\"),
        select(ContactPhone.id)
        .where(
            ContactPhone.contact_id == Contact.id,
            ContactPhone.archived_at.is_(None),
            ContactPhone.normalized.contains(digits, autoescape=True),
        )
        .exists()
        if len(digits) >= 3
        else false(),
        select(ContactEmail.id)
        .where(
            ContactEmail.contact_id == Contact.id,
            ContactEmail.archived_at.is_(None),
            ContactEmail.normalized.ilike(needle, escape="\\"),
        )
        .exists(),
    )

    def row(
        kind: str,
        identifier: SQLColumnExpression[UUID],
        label: SQLColumnExpression[str],
        path: SQLColumnExpression[str],
    ) -> Select[str, UUID, str, str]:
        return select(
            literal(kind).label("kind"),
            identifier.label("id"),
            label.label("label"),
            path.label("href"),
        )

    def href(prefix: str, identifier: SQLColumnExpression[UUID | None]) -> ColumnElement[str]:
        return literal(prefix) + cast(identifier, String)

    deals = select(Deal.id).where(
        Deal.contact_id.in_(select(contacts.c.id)), Deal.archived_at.is_(None)
    )
    records = [
        row("contact", Contact.id, Contact.name, href("/contacts/", Contact.id)).where(
            Contact.id.in_(select(contacts.c.id)), contact_match
        ),
        row("enquiry", Enquiry.id, Contact.name, href("/leads/", Enquiry.id))
        .join(Contact, Contact.id == Enquiry.contact_id)
        .where(
            Enquiry.contact_id.in_(select(contacts.c.id)),
            Enquiry.archived_at.is_(None),
            or_(contact_match, Enquiry.message.ilike(needle, escape="\\")),
            Enquiry.assigned_agent_id.is_not(None)
            if identity.user.role == "agent"
            else literal(True),
        ),
        row("deal", Deal.id, Deal.title, href("/deals/", Deal.id))
        .join(Contact, Contact.id == Deal.contact_id)
        .where(Deal.id.in_(deals), or_(Deal.title.ilike(needle, escape="\\"), contact_match)),
        row(
            "development",
            Development.id,
            Development.reference + " : " + Development.name,
            href("/projects/", Development.id),
        ).where(
            Development.id.in_(developments),
            or_(
                Development.name.ilike(needle, escape="\\"),
                Development.reference.ilike(needle, escape="\\"),
                Development.location.ilike(needle, escape="\\"),
            ),
        ),
        row(
            "property",
            Property.id,
            Property.reference + " : " + func.coalesce(Property.marketing_name, ""),
            href("/projects/properties/", Property.id),
        ).where(
            Property.id.in_(properties),
            or_(
                Property.reference.ilike(needle, escape="\\"),
                Property.marketing_name.ilike(needle, escape="\\"),
                Property.location.ilike(needle, escape="\\"),
            ),
        ),
        row(
            "unit_type",
            UnitType.id,
            UnitType.code + " : " + UnitType.label,
            href("/projects/", UnitType.development_id)
            + "?tab=units&unit_type_id="
            + cast(UnitType.id, String),
        ).where(
            UnitType.development_id.in_(developments),
            or_(
                UnitType.label.ilike(needle, escape="\\"), UnitType.code.ilike(needle, escape="\\")
            ),
        ),
    ]
    for parent, ids, prefix in [
        (Document.contact_id, select(contacts.c.id), "/contacts/"),
        (Document.deal_id, deals, "/deals/"),
        (Document.development_id, developments, "/projects/"),
        (Document.property_id, properties, "/projects/properties/"),
    ]:
        records.append(
            row("document", Document.id, Document.filename, href(prefix, parent)).where(
                Document.archived_at.is_(None),
                parent.in_(ids),
                Document.filename.ilike(needle, escape="\\"),
            )
        )
    return union_all(*records).subquery("visible_matches")


def search(database: Database, token: str, query: SearchQuery) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        matches = projections(current_identity(session, token), query)
        counts: dict[str, int] = dict(
            session.execute(select(matches.c.kind, func.count()).group_by(matches.c.kind)).all()
        )
        statement = select(matches)
        if query.kind:
            statement = statement.where(matches.c.kind == query.kind)
        total = counts.get(query.kind, 0) if query.kind else sum(counts.values())
        rows = (
            session.execute(
                statement.order_by(func.lower(matches.c.label), matches.c.kind, matches.c.id)
                .offset((query.page - 1) * query.page_size)
                .limit(query.page_size)
            )
            .mappings()
            .all()
        )
        items = [
            dict(kind=r["kind"], id=str(r["id"]), label=r["label"], href=r["href"]) for r in rows
        ]
        return page_result(items, total, query.page, query.page_size) | {"counts": counts}
