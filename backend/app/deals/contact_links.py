"""Merge moves only current deal parents; origin, exact targets and authors survive."""

from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.deals.history import append_event
from app.deals.models import Deal
from app.identity.sessions import CurrentIdentity


def preview_deals(session: Session, ids: list[UUID]) -> list[dict[str, object]]:
    return [
        {
            "id": str(row.id),
            "contact_id": str(row.contact_id),
            "version": row.version,
            "stage": row.stage,
        }
        for row in session.scalars(select(Deal).where(Deal.contact_id.in_(ids)).order_by(Deal.id))
    ]


def merge_deals(session: Session, identity: CurrentIdentity, source: UUID, survivor: UUID) -> None:
    session.execute(text("SET LOCAL kay.deal_merge='on'"))
    for row in session.scalars(
        select(Deal).where(Deal.contact_id == source).order_by(Deal.id).with_for_update()
    ):
        row.contact_id = survivor
        row.version += 1
        append_event(session, identity, row, "contact_merged", row.stage)
    session.flush()
    session.execute(text("SET LOCAL kay.deal_merge='off'"))
