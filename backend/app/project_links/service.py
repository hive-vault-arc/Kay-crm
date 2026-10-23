"""Scoped, idempotent project relationships with immutable actor history."""

import json
from datetime import UTC, datetime
from typing import Literal
from uuid import UUID, uuid4

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.contacts.access import readable_contact
from app.contacts.history import record
from app.contacts.models import Enquiry, IdempotencyRecord
from app.contacts.ownership import locked_identity
from app.contacts.queries import enquiry_in_scope
from app.db.session import Database
from app.deals.access import authorized
from app.deals.models import Deal
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.hierarchy_models import Development
from app.inventory.models import Property
from app.project_links.contracts import LinkQuery, NewLink
from app.project_links.models import ProjectLink

Scope = Literal["enquiries", "deals"]


def parent(
    session: Session, identity: CurrentIdentity, scope: Scope, target: UUID
) -> tuple[UUID, Enquiry | Deal]:
    row = (
        enquiry_in_scope(session, identity, target)
        if scope == "enquiries"
        else authorized(session, identity, target)
    )
    return row.contact_id, row


def as_item(row: ProjectLink) -> dict[str, object]:
    return {
        "id": str(row.id),
        "kind": row.kind,
        "development_id": str(row.development_id) if row.development_id else None,
        "property_id": str(row.property_id) if row.property_id else None,
        "name": row.name,
        "created_at": row.created_at.isoformat(),
    }


def read_links(
    database: Database, token: str, scope: Scope, target: UUID, query: LinkQuery
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        parent(session, current_identity(session, token), scope, target)
        predicate = (
            ProjectLink.enquiry_id == target
            if scope == "enquiries"
            else ProjectLink.deal_id == target
        )
        base = select(ProjectLink).where(
            predicate, ProjectLink.kind == query.kind, ProjectLink.removed_at.is_(None)
        )
        total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
        rows = session.scalars(
            base.order_by(ProjectLink.created_at.desc(), ProjectLink.id.desc())
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return {
            "items": [as_item(row) for row in rows],
            "total": total,
            "page": query.page,
            "page_size": query.page_size,
            "has_next": query.page * query.page_size < total,
            "has_previous": query.page > 1,
        }


def mutate_link(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    scope: Scope,
    target: UUID,
    body: NewLink | None,
    link_id: UUID | None = None,
) -> dict[str, object]:
    operation = "added" if body else "removed"
    route = f"{scope}/{target}/project-links/{link_id or ''}"
    payload = body.model_dump(mode="json") if body else {"link_id": str(link_id)}
    digest = keyed_digest(
        secret, "project-link-command", json.dumps(payload, sort_keys=True, separators=(",", ":"))
    )
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        cid, row = parent(session, identity, scope, target)
        contact = readable_contact(session, identity, cid)
        previous = session.get(IdempotencyRecord, (identity.user.id, route, key))
        if previous:
            if previous.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return previous.response
        if contact.archived_at is not None or row.archived_at is not None:
            raise IdentityError("CONTACT_ARCHIVED", 409)
        parent_model = Enquiry if scope == "enquiries" else Deal
        session.execute(select(parent_model.id).where(parent_model.id == target).with_for_update())
        parent_field = ProjectLink.enquiry_id if scope == "enquiries" else ProjectLink.deal_id
        if body:
            catalogue = (
                session.get(Development, body.development_id)
                if body.development_id
                else session.get(Property, body.property_id)
            )
            if catalogue is None or catalogue.archived_at is not None:
                raise IdentityError("NOT_FOUND", 404)
            target_field = (
                ProjectLink.development_id if body.development_id else ProjectLink.property_id
            )
            catalogue_id = body.development_id or body.property_id
            if session.scalar(
                select(ProjectLink.id).where(
                    parent_field == target,
                    ProjectLink.kind == body.kind,
                    target_field == catalogue_id,
                    ProjectLink.removed_at.is_(None),
                )
            ):
                raise IdentityError("PROJECT_LINK_EXISTS", 409)
            name = (
                catalogue.name
                if isinstance(catalogue, Development)
                else (catalogue.marketing_name or catalogue.reference)
            )
            link = ProjectLink(
                id=uuid4(),
                enquiry_id=target if scope == "enquiries" else None,
                deal_id=target if scope == "deals" else None,
                development_id=body.development_id,
                property_id=body.property_id,
                kind=body.kind,
                name=name,
                created_by_user_id=identity.user.id,
            )
            session.add(link)
            session.flush()
        else:
            existing = session.scalar(
                select(ProjectLink)
                .where(
                    ProjectLink.id == link_id,
                    parent_field == target,
                    ProjectLink.removed_at.is_(None),
                )
                .with_for_update()
            )
            if existing is None:
                raise IdentityError("NOT_FOUND", 404)
            link = existing
            link.removed_at = datetime.now(UTC)
            link.removed_by_user_id = identity.user.id
        label = "Projet discuté" if link.kind == "discussed" else "Projet visité"
        record(
            session,
            identity,
            cid,
            f"{scope}.project_link.{operation}",
            body=f"{label} : {link.name}",
            enquiry_id=target if scope == "enquiries" else None,
            deal_id=target if scope == "deals" else None,
        )
        response: dict[str, object] = {"id": str(link.id)}
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
