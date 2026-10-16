"""Current privileged authority and derived balances, never cached private summaries."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.deals.access import authorized as deal_authorized
from app.deals.access import writable
from app.deals.models import Deal
from app.files.models import Document, DocumentVersion
from app.finance.models import Commission, CommissionRevision, Receipt
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity


def require_manager(identity: CurrentIdentity) -> None:
    if identity.user.role not in {"manager", "administrator"}:
        raise IdentityError("FORBIDDEN", 403)


def deal_access(
    session: Session, identity: CurrentIdentity, did: UUID, *, write: bool = False
) -> Deal:
    require_manager(identity)
    deal = deal_authorized(session, identity, did)
    if write:
        writable(session, identity, deal)
    return deal


def authorized(
    session: Session, identity: CurrentIdentity, cid: UUID, *, write: bool = False
) -> Commission:
    require_manager(identity)
    row = (
        session.scalar(select(Commission).where(Commission.id == cid).with_for_update())
        if write
        else session.get(Commission, cid)
    )
    if row is None:
        raise IdentityError("NOT_FOUND", 404)
    deal_access(session, identity, row.deal_id, write=write)
    return row


def head(session: Session, row: Commission) -> CommissionRevision:
    value = session.scalar(
        select(CommissionRevision).where(
            CommissionRevision.commission_id == row.id, CommissionRevision.version == row.version
        )
    )
    if value is None:
        raise IdentityError("DEPENDENCY_UNAVAILABLE", 503)
    return value


def collected(session: Session, cid: UUID) -> Decimal:
    replacement = aliased(Receipt)
    return session.scalar(
        select(func.coalesce(func.sum(Receipt.amount_mad), 0)).where(
            Receipt.commission_id == cid,
            ~select(replacement.id).where(replacement.supersedes_id == Receipt.id).exists(),
        )
    ) or Decimal(0)


def evidence(session: Session, deal: Deal, document_id: UUID | None) -> UUID | None:
    if document_id is None:
        return None
    document = session.get(Document, document_id)
    if (
        document is None
        or document.archived_at
        or not (document.deal_id == deal.id or document.contact_id == deal.contact_id)
    ):
        raise IdentityError("INVALID_FINANCIAL_EVIDENCE", 422)
    version = session.scalar(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.created_at.desc(), DocumentVersion.id.desc())
        .limit(1)
    )
    if version is None or version.state != "clean":
        raise IdentityError("INVALID_FINANCIAL_EVIDENCE", 422)
    return version.id
