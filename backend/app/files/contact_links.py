"""One private contact-merge adapter, with retained origin and immutable authorship."""

from uuid import UUID

from sqlalchemy import or_, select, text
from sqlalchemy.orm import Session

from app.deals.models import Deal
from app.files.models import Document


def preview_documents(session: Session, ids: list[UUID]) -> list[dict[str, object]]:
    return [
        {
            "id": str(row.id),
            "contact_id": str(row.contact_id) if row.contact_id else None,
            "deal_id": str(row.deal_id) if row.deal_id else None,
            "version": row.version,
            "archived": row.archived_at is not None,
        }
        for row in session.scalars(
            select(Document)
            .where(
                or_(
                    Document.contact_id.in_(ids),
                    Document.deal_id.in_(select(Deal.id).where(Deal.contact_id.in_(ids))),
                )
            )
            .order_by(Document.id)
        )
    ]


def merge_documents(session: Session, source: UUID, survivor: UUID) -> None:
    session.execute(text("SET LOCAL kay.document_merge='on'"))
    for row in session.scalars(
        select(Document)
        .where(Document.contact_id == source)
        .order_by(Document.id)
        .with_for_update()
    ):
        row.contact_id = survivor
        row.version += 1
    session.flush()
    session.execute(text("SET LOCAL kay.document_merge='off'"))
