"""Numbered privileged projections compute valid leaf receipts within one snapshot."""

from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db.session import Database
from app.finance.contracts import FinanceQuery
from app.finance.models import Commission, CommissionRevision, Receipt
from app.finance.records import authorized, collected, deal_access, head
from app.identity.sessions import current_identity
from app.inventory.queries import money
from app.schedule.rules import ZONE


def revision_view(row: CommissionRevision) -> dict[str, object]:
    return {
        "id": str(row.id),
        "version": row.version,
        "previous_revision_id": str(row.previous_revision_id) if row.previous_revision_id else None,
        "kind": row.kind,
        "base_mad": str(row.base_mad),
        "rate_percent": str(row.rate_percent) if row.rate_percent is not None else None,
        "amount_mad": money(row.amount_mad),
        "due_on": row.due_on.isoformat() if row.due_on else None,
        "state": row.state,
        "review_required": row.review_required,
        "action": row.action,
        "reason": row.reason,
        "actor": {"id": str(row.actor_user_id), "display_name": row.actor_name},
        "receipt_id": str(row.receipt_id) if row.receipt_id else None,
        "reopening_id": str(row.reopening_id) if row.reopening_id else None,
        "created_at": row.created_at.isoformat(),
        "created_local": row.created_at.astimezone(ZONE).isoformat(),
        "calculation_policy": "MAD_FINAL_ROUND_HALF_UP_2",
    }


def view(session: Session, row: Commission) -> dict[str, object]:
    current = head(session, row)
    received = collected(session, row.id)
    return {
        "id": str(row.id),
        "deal_id": str(row.deal_id),
        "version": row.version,
        "current": revision_view(current),
        "collected_mad": money(received),
        "balance_mad": money(current.amount_mad - received)
        if current.state == "recognized"
        else None,
        "created_by_user_id": str(row.created_by_user_id),
        "created_at": row.created_at.isoformat(),
    }


def read(
    database: Database, token: str, identifier: UUID, query: FinanceQuery, mode: str = "list"
) -> dict[str, object]:
    with database.session() as session, session.begin():
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ"))
        identity = current_identity(session, token)
        if mode == "list":
            deal = deal_access(session, identity, identifier)
            statement = select(Commission).where(Commission.deal_id == deal.id)
            total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
            rows = session.scalars(
                statement.order_by(Commission.created_at, Commission.id)
                .offset((query.page - 1) * query.page_size)
                .limit(query.page_size)
            ).all()
            items: list[dict[str, object]] = [view(session, row) for row in rows]
        else:
            row = authorized(session, identity, identifier)
            if mode == "detail":
                return view(session, row)
            if mode == "revisions":
                revisions = select(CommissionRevision).where(
                    CommissionRevision.commission_id == row.id
                )
                total = session.scalar(select(func.count()).select_from(revisions.subquery())) or 0
                items = [
                    revision_view(item)
                    for item in session.scalars(
                        revisions.order_by(CommissionRevision.version.desc())
                        .offset((query.page - 1) * query.page_size)
                        .limit(query.page_size)
                    )
                ]
            else:
                receipts = select(Receipt).where(Receipt.commission_id == row.id)
                total = session.scalar(select(func.count()).select_from(receipts.subquery())) or 0
                received_rows = list(
                    session.scalars(
                        receipts.order_by(Receipt.created_at.desc(), Receipt.id)
                        .offset((query.page - 1) * query.page_size)
                        .limit(query.page_size)
                    )
                )
                superseded = set(
                    session.scalars(
                        select(Receipt.supersedes_id).where(
                            Receipt.commission_id == row.id,
                            Receipt.supersedes_id.in_([item.id for item in received_rows]),
                        )
                    )
                )
                items = [
                    {
                        "id": str(item.id),
                        "commission_id": str(item.commission_id),
                        "supersedes_id": str(item.supersedes_id) if item.supersedes_id else None,
                        "valid": item.id not in superseded and item.amount_mad is not None,
                        "amount_mad": money(item.amount_mad),
                        "received_on": item.received_on.isoformat(),
                        "evidence_document_id": str(item.evidence_document_id)
                        if item.evidence_document_id
                        else None,
                        "evidence_version_id": str(item.evidence_version_id)
                        if item.evidence_version_id
                        else None,
                        "reason": item.reason,
                        "actor": {"id": str(item.actor_user_id), "display_name": item.actor_name},
                        "created_at": item.created_at.isoformat(),
                    }
                    for item in received_rows
                ]
        return {
            "items": items,
            "page": query.page,
            "page_size": query.page_size,
            "total": total,
            "has_next": query.page * query.page_size < total,
            "has_previous": query.page > 1,
        }
