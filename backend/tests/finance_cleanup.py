"""Finance fixture cleanup is called only inside the existing isolated synthetic guard."""

from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.files.models import Document
from app.finance.models import Commission, CommissionRevision, FinanceReceipt, Receipt


def delete_actor_finance(session: Session, uid: UUID, deal_ids: list[UUID]) -> None:
    evidence_ids = select(Document.id).where(Document.created_by_user_id == uid)
    ids = select(Commission.id).where(
        or_(
            Commission.deal_id.in_(deal_ids),
            Commission.created_by_user_id == uid,
            Commission.id.in_(
                select(CommissionRevision.commission_id).where(
                    CommissionRevision.actor_user_id == uid
                )
            ),
            Commission.id.in_(
                select(Receipt.commission_id).where(
                    or_(
                        Receipt.actor_user_id == uid, Receipt.evidence_document_id.in_(evidence_ids)
                    )
                )
            ),
        )
    )
    commission_ids = list(session.scalars(ids))
    session.execute(
        delete(FinanceReceipt).where(
            or_(FinanceReceipt.actor_id == uid, FinanceReceipt.commission_id.in_(commission_ids))
        )
    )
    session.execute(
        delete(CommissionRevision).where(CommissionRevision.commission_id.in_(commission_ids))
    )
    session.execute(delete(Receipt).where(Receipt.commission_id.in_(commission_ids)))
    session.execute(delete(Commission).where(Commission.id.in_(commission_ids)))
