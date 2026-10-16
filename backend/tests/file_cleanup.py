"""Synthetic fixture cleanup only; application storage uses separate guarded reconciliation."""

from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.files.models import (
    Document,
    DocumentVersion,
    FilePermit,
    FileReceipt,
    Job,
    Notification,
    OutboxEvent,
)
from app.identity.models import StaffSession
from tests.deal_cleanup import actor_deal_ids


def delete_actor_files(
    session: Session,
    uid: UUID,
    contacts: list[UUID],
    developments: list[UUID],
    properties: list[UUID],
) -> None:
    documents = select(Document.id).where(
        or_(
            Document.created_by_user_id == uid,
            Document.contact_id.in_(contacts),
            Document.origin_contact_id.in_(contacts),
            Document.development_id.in_(developments),
            Document.property_id.in_(properties),
            Document.deal_id.in_(actor_deal_ids(session, uid, contacts, properties, developments)),
            Document.id.in_(
                select(DocumentVersion.document_id).where(DocumentVersion.created_by_user_id == uid)
            ),
        )
    )
    ids = list(session.scalars(documents))
    versions = select(DocumentVersion.id).where(DocumentVersion.document_id.in_(ids))
    outbox = select(OutboxEvent.id).where(OutboxEvent.version_id.in_(versions))
    session.execute(delete(Job).where(Job.outbox_id.in_(outbox)))
    session.execute(delete(OutboxEvent).where(OutboxEvent.version_id.in_(versions)))
    session.execute(
        delete(Notification).where(
            or_(Notification.document_id.in_(ids), Notification.user_id == uid)
        )
    )
    session.execute(
        delete(FileReceipt).where(
            or_(FileReceipt.document_id.in_(ids), FileReceipt.actor_id == uid)
        )
    )
    session.execute(
        delete(FilePermit).where(
            or_(
                FilePermit.version_id.in_(versions),
                FilePermit.session_id.in_(
                    select(StaffSession.id).where(StaffSession.user_id == uid)
                ),
            )
        )
    )
    session.execute(delete(DocumentVersion).where(DocumentVersion.document_id.in_(ids)))
    session.execute(delete(Document).where(Document.id.in_(ids)))
