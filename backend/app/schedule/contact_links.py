"""Merging changes current visit parent, never provenance, participants or actors."""

from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.identity.sessions import CurrentIdentity
from app.schedule.models import Visit
from app.schedule.records import append_event


def preview_visits(session: Session, ids: list[UUID]) -> list[dict[str, object]]:
    return [
        {"id": str(v.id), "contact_id": str(v.contact_id), "version": v.version, "status": v.status}
        for v in session.scalars(select(Visit).where(Visit.contact_id.in_(ids)).order_by(Visit.id))
    ]


def merge_visits(session: Session, identity: CurrentIdentity, source: UUID, survivor: UUID) -> None:
    session.execute(text("SET LOCAL kay.visit_merge='on'"))
    session.execute(text("SET LOCAL kay.visit_action='contact_merged'"))
    for row in session.scalars(
        select(Visit).where(Visit.contact_id == source).order_by(Visit.id).with_for_update()
    ):
        row.contact_id, row.updated_by_user_id = survivor, identity.user.id
        row.version += 1
        session.flush()
        append_event(session, identity, row, "contact_merged")
    session.flush()
    session.execute(text("SET LOCAL kay.visit_merge='off'"))
