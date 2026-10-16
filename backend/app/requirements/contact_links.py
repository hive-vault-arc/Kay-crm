"""Move current searches on merge; keep independent identities, origins and actors."""

from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.requirements.models import Requirement


def preview_requirements(session: Session, ids: list[UUID]) -> list[dict[str, object]]:
    return [
        {"id": str(r.id), "contact_id": str(r.contact_id), "version": r.version}
        for r in session.scalars(
            select(Requirement).where(Requirement.contact_id.in_(ids)).order_by(Requirement.id)
        )
    ]


def merge_requirements(session: Session, source: UUID, survivor: UUID) -> None:
    session.execute(text("SET LOCAL kay.requirement_merge='on'"))
    for row in session.scalars(
        select(Requirement)
        .where(Requirement.contact_id == source)
        .order_by(Requirement.id)
        .with_for_update()
    ):
        row.contact_id = survivor
        row.version += 1
    session.flush()
    session.execute(text("SET LOCAL kay.requirement_merge='off'"))
