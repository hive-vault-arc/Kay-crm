"""Contact-merge adapter: identity reparenting is not an inventory edit grant."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.identity.sessions import CurrentIdentity
from app.inventory.hierarchy_models import Development, DevelopmentOwner
from app.inventory.history import record
from app.inventory.models import Property, PropertyOwner


def preview_links(session: Session, ids: list[UUID]) -> tuple[int, list[dict[str, object]]]:
    rows = session.execute(
        select(PropertyOwner, Property.version)
        .join(Property, Property.id == PropertyOwner.property_id)
        .where(PropertyOwner.contact_id.in_(ids))
        .order_by(PropertyOwner.id)
    ).all()
    state: list[dict[str, object]] = [
        {
            "id": str(link.id),
            "property_id": str(link.property_id),
            "property_version": version,
            "contact_id": str(link.contact_id),
            "marketing_display": link.marketing_display,
            "archived_at": link.archived_at.isoformat() if link.archived_at else None,
        }
        for link, version in rows
    ]
    for link, version in session.execute(
        select(DevelopmentOwner, Development.version)
        .join(Development, Development.id == DevelopmentOwner.development_id)
        .where(DevelopmentOwner.contact_id.in_(ids))
        .order_by(DevelopmentOwner.id)
    ):
        state.append(
            {
                "kind": "development_owner",
                "id": str(link.id),
                "development_id": str(link.development_id),
                "version": version,
                "contact_id": str(link.contact_id),
                "marketing_display": link.marketing_display,
                "active": link.archived_at is None,
            }
        )
    for item in session.scalars(
        select(Development)
        .where(Development.developer_contact_id.in_(ids))
        .order_by(Development.id)
    ):
        state.append(
            {
                "kind": "developer",
                "id": str(item.id),
                "version": item.version,
                "contact_id": str(item.developer_contact_id),
                "marketing_display": item.developer_marketing_display,
                "active": True,
            }
        )
    return sum(link.archived_at is None for link, _ in rows), state


def merge_links(session: Session, identity: CurrentIdentity, source: UUID, survivor: UUID) -> None:
    dids = set(
        session.scalars(
            select(DevelopmentOwner.development_id).where(
                DevelopmentOwner.contact_id == source, DevelopmentOwner.archived_at.is_(None)
            )
        )
    )
    dids.update(
        session.scalars(select(Development.id).where(Development.developer_contact_id == source))
    )
    developments = session.scalars(
        select(Development)
        .where(Development.id.in_(dids))
        .order_by(Development.id)
        .with_for_update()
    ).all()
    development_links = session.scalars(
        select(DevelopmentOwner)
        .where(
            DevelopmentOwner.development_id.in_(dids),
            DevelopmentOwner.contact_id.in_([source, survivor]),
            DevelopmentOwner.archived_at.is_(None),
        )
        .order_by(DevelopmentOwner.id)
        .with_for_update()
    ).all()
    kept_developments = {
        row.development_id for row in development_links if row.contact_id == survivor
    }
    for link in development_links:
        if link.contact_id == source:
            if link.development_id in kept_developments:
                link.archived_at = datetime.now(UTC)
            else:
                link.contact_id = survivor
    for development in developments:
        if development.developer_contact_id == source:
            development.developer_contact_id = survivor
        development.version += 1
        development.updated_at = datetime.now(UTC)
        record(session, identity, development, "developments.contact-merged")
    pids = session.scalars(
        select(PropertyOwner.property_id)
        .where(PropertyOwner.contact_id == source, PropertyOwner.archived_at.is_(None))
        .distinct()
    ).all()
    properties = session.scalars(
        select(Property).where(Property.id.in_(pids)).order_by(Property.id).with_for_update()
    ).all()
    rows = session.scalars(
        select(PropertyOwner)
        .where(
            PropertyOwner.property_id.in_(pids),
            PropertyOwner.contact_id.in_([source, survivor]),
            PropertyOwner.archived_at.is_(None),
        )
        .order_by(PropertyOwner.id)
        .with_for_update()
    ).all()
    kept = {row.property_id for row in rows if row.contact_id == survivor}
    for row in rows:
        if row.contact_id == source:
            if row.property_id in kept:
                row.archived_at = datetime.now(UTC)
            else:
                row.contact_id = survivor
    for item in properties:
        item.version += 1
        item.updated_at = datetime.now(UTC)
        # The private contact-merge reason/name must not enter the shared inventory.
        record(session, identity, item, "properties.owner-merged")
