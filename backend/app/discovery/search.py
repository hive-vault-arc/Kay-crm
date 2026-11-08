from uuid import UUID

from sqlalchemy import (
    ColumnElement,
    String,
    case,
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
from app.files.models import Document, DocumentVersion
from app.generated.catalog import TEMPLATES
from app.generated.visibility import visible_template_codes
from app.identity.security import IdentityError
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


def projections(
    identity: CurrentIdentity, query: SearchQuery, *, prepared: bool = False
) -> Subquery:
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
        template_title: SQLColumnExpression[str] | None = None,
    ) -> Select[str, UUID, str, str, str | None]:
        return select(
            literal(kind).label("kind"),
            identifier.label("id"),
            label.label("label"),
            path.label("href"),
            (template_title if template_title is not None else literal(None, String)).label(
                "template_title"
            ),
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
                Document.purpose != "generated",
                Document.template_code.is_(None),
                parent.in_(ids),
                Document.filename.ilike(needle, escape="\\"),
            )
        )
    codes = visible_template_codes(identity.user.role)
    title = case(
        {template.code: template.title for template in TEMPLATES if template.code in codes},
        value=Document.template_code,
        else_="",
    )
    parents = [(Document.deal_id, deals, "/deals/")]
    if prepared:
        enquiries = select(Enquiry.id).where(
            Enquiry.contact_id.in_(select(contacts.c.id)),
            Enquiry.archived_at.is_(None),
            Enquiry.assigned_agent_id.is_not(None)
            if identity.user.role == "agent"
            else literal(True),
        )
        parents.append((Document.enquiry_id, enquiries, "/leads/"))
    for parent, ids, prefix in parents:
        records.append(
            row(
                "generated_document" if prepared else "document",
                Document.id,
                Document.filename,
                href(prefix, parent) + "?tab=documents" if prepared else href(prefix, parent),
                title if prepared else None,
            ).where(
                Document.archived_at.is_(None),
                Document.purpose == "generated",
                Document.mime_type == "application/pdf",
                Document.template_code.in_(codes),
                parent.in_(ids),
                select(DocumentVersion.id)
                .where(
                    DocumentVersion.document_id == Document.id,
                    DocumentVersion.state == "clean",
                )
                .exists(),
                or_(Document.filename.ilike(needle, escape="\\"), title.ilike(needle, escape="\\"))
                if prepared
                else Document.filename.ilike(needle, escape="\\"),
            )
        )
    return union_all(*records).subquery("visible_matches")


def search(
    database: Database, token: str, query: SearchQuery, *, prepared: bool = False
) -> dict[str, object]:
    if query.kind == "generated_document" and not prepared:
        raise IdentityError("VALIDATION_ERROR", 422)
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        matches = projections(current_identity(session, token), query, prepared=prepared)
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
        items: list[dict[str, object]] = []
        for row in rows:
            item: dict[str, object] = dict(
                kind=row["kind"], id=str(row["id"]), label=row["label"], href=row["href"]
            )
            if prepared and row["kind"] == "generated_document":
                item["template_title"] = row["template_title"]
            items.append(item)
        result = page_result(items, total, query.page, query.page_size) | {"counts": counts}
        if prepared:
            result["search_version"] = 2
        return result
