"""Bind approved content and clean photos to a single current inventory record."""

from decimal import Decimal
from typing import cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.files.models import Document, DocumentVersion
from app.identity.security import IdentityError
from app.inventory.hierarchy_models import Development
from app.inventory.models import Property
from app.inventory.queries import property_record
from app.shares.contracts import ListingDraftInput, Snapshot, TargetKind
from app.shares.models import ListingPublication

Record = Property | Development


def target(
    session: Session, kind: TargetKind, identifier: UUID, *, lock: bool = False
) -> tuple[Record, int | None]:
    if kind == "development":
        query = select(Development).where(Development.id == identifier)
        record = session.scalar(query.with_for_update() if lock else query)
        if record is None or record.archived_at:
            raise IdentityError("NOT_FOUND", 404)
        return record, None
    item = property_record(session, identifier, lock=lock)
    if item.archived_at:
        raise IdentityError("NOT_FOUND", 404)
    if item.development_id is None:
        return item, None
    parent = session.get(Development, item.development_id)
    if parent is None or parent.archived_at:
        raise IdentityError("NOT_FOUND", 404)
    return item, parent.version


def target_ids(kind: TargetKind, identifier: UUID) -> dict[str, UUID]:
    return {"property_id" if kind == "property" else "development_id": identifier}


def publication(
    session: Session, kind: TargetKind, identifier: UUID, *, lock: bool = False
) -> ListingPublication | None:
    field = (
        ListingPublication.property_id if kind == "property" else ListingPublication.development_id
    )
    query = select(ListingPublication).where(field == identifier)
    return session.scalar(query.with_for_update() if lock else query)


def publication_target(item: ListingPublication) -> tuple[TargetKind, UUID]:
    if item.property_id is not None:
        return "property", item.property_id
    return "development", cast(UUID, item.development_id)


def current_publication(item: ListingPublication, record: Record, parent: int | None) -> bool:
    return (
        item.withdrawn_at is None
        and item.target_version == record.version
        and item.parent_version == parent
    )


def photo_rows(
    session: Session, kind: TargetKind, identifier: UUID, versions: list[UUID]
) -> dict[UUID, DocumentVersion]:
    if not versions:
        return {}
    field = Document.property_id if kind == "property" else Document.development_id
    rows = session.scalars(
        select(DocumentVersion)
        .join(Document, Document.id == DocumentVersion.document_id)
        .where(
            DocumentVersion.id.in_(versions),
            DocumentVersion.state == "clean",
            DocumentVersion.sha256.is_not(None),
            Document.purpose == "photo",
            Document.mime_type == "image/webp",
            Document.archived_at.is_(None),
            field == identifier,
        )
    )
    return {row.id: row for row in rows}


def make_snapshot(
    session: Session, kind: TargetKind, record: Record, body: ListingDraftInput
) -> Snapshot:
    if len(photo_rows(session, kind, record.id, body.photos)) != len(body.photos):
        raise IdentityError("LISTING_PHOTO_UNAVAILABLE", 422)
    area: Decimal | None = record.area_sqm if isinstance(record, Property) else None
    facts = body.model_dump(exclude={"target_version", "expected_version"})
    return Snapshot.model_validate(
        {
            **facts,
            "kind": kind,
            "category": record.category,
            "area_sqm": str(area) if area is not None else None,
            "rooms": record.rooms if isinstance(record, Property) else None,
        }
    )
