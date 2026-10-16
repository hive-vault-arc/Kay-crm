"""Finance commits facts, true-actor audit and retry receipt in one locked transaction."""

import json
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import Database
from app.finance.contracts import (
    Body,
    CorrectCommission,
    CorrectReceipt,
    NewCommission,
    NewReceipt,
    ReceiptFields,
    Recognize,
    Terms,
)
from app.finance.models import Commission, CommissionRevision, FinanceReceipt, Receipt
from app.finance.records import authorized, collected, deal_access, evidence, head, require_manager
from app.identity.models import AGENCY_ID, Agency, AuditEvent, User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity

TERM_NAMES = ("kind", "base_mad", "rate_percent", "amount_mad", "due_on")


def new_receipt(
    session: Session,
    identity: CurrentIdentity,
    row: Commission,
    body: ReceiptFields | None,
    reason: str,
    original: Receipt | None = None,
) -> Receipt:
    deal = deal_access(session, identity, row.deal_id, write=True)
    document = body.evidence_document_id if body else None
    value = Receipt(
        id=uuid4(),
        commission_id=row.id,
        supersedes_id=original.id if original else None,
        amount_mad=Decimal(body.amount_mad) if body else None,
        received_on=body.received_on
        if body
        else original.received_on
        if original
        else datetime.now(UTC).date(),
        evidence_document_id=document,
        evidence_version_id=evidence(session, deal, document),
        reason=reason,
        actor_user_id=identity.user.id,
        actor_name=identity.user.display_name,
    )
    session.add(value)
    session.flush()
    return value


def apply(
    session: Session, identity: CurrentIdentity, body: Body, did: UUID | None, cid: UUID | None
) -> Commission:
    receipt = None
    terms: Terms
    if isinstance(body, NewCommission):
        if did is None:
            raise IdentityError("NOT_FOUND", 404)
        deal = deal_access(session, identity, did, write=True)
        if deal.version != body.expected_deal_version:
            raise IdentityError("VERSION_CONFLICT", 409)
        row = Commission(id=uuid4(), deal_id=did, version=1, created_by_user_id=identity.user.id)
        session.add(row)
        session.flush()
        previous, state, review, action, reason = None, "expected", False, "created", ""
        terms = body
    else:
        if cid is None:
            raise IdentityError("NOT_FOUND", 404)
        row = authorized(session, identity, cid, write=True)
        if row.version != body.expected_version:
            raise IdentityError("VERSION_CONFLICT", 409)
        previous = head(session, row)
        state, review, reason = previous.state, previous.review_required, ""
        terms = Terms(
            kind=previous.kind,
            base_mad=str(previous.base_mad),
            rate_percent=str(previous.rate_percent) if previous.rate_percent is not None else None,
            amount_mad=str(previous.amount_mad) if previous.kind == "fixed" else None,
            due_on=previous.due_on,
        )
        total = collected(session, row.id)
        if isinstance(body, Recognize):
            if state != "expected":
                raise IdentityError("COMMISSION_ALREADY_RECOGNIZED", 409)
            state, review, action = "recognized", False, "recognized"
        elif isinstance(body, CorrectCommission):
            terms, reason, review, action = body, body.reason, False, "commission_corrected"
            if state == "recognized" and terms.calculated() < total:
                raise IdentityError("COMMISSION_BELOW_COLLECTIONS", 409)
        else:
            if state != "recognized":
                raise IdentityError("COMMISSION_NOT_RECOGNIZED", 409)
            if isinstance(body, NewReceipt):
                if Decimal(body.amount_mad) > previous.amount_mad - total:
                    raise IdentityError("OVER_COLLECTION", 409)
                receipt = new_receipt(session, identity, row, body, body.reason)
                action, reason = "receipt", body.reason
            elif isinstance(body, CorrectReceipt):
                original = session.get(Receipt, body.receipt_id)
                if original is None or original.commission_id != row.id:
                    raise IdentityError("NOT_FOUND", 404)
                if session.scalar(select(Receipt.id).where(Receipt.supersedes_id == original.id)):
                    raise IdentityError("RECEIPT_ALREADY_CORRECTED", 409)
                replacement_amount = (
                    Decimal(body.replacement.amount_mad) if body.replacement else Decimal(0)
                )
                if (
                    total - (original.amount_mad or Decimal(0)) + replacement_amount
                    > previous.amount_mad
                ):
                    raise IdentityError("OVER_COLLECTION", 409)
                receipt = new_receipt(
                    session,
                    identity,
                    row,
                    body.replacement,
                    body.replacement.reason if body.replacement else body.reason,
                    original,
                )
                action, reason = "receipt_corrected", body.reason
            else:
                raise IdentityError("VALIDATION_ERROR", 422)
        row.version += 1
    revision = CommissionRevision(
        id=uuid4(),
        commission_id=row.id,
        version=row.version,
        previous_revision_id=previous.id if previous else None,
        kind=terms.kind,
        base_mad=Decimal(terms.base_mad),
        rate_percent=Decimal(terms.rate_percent) if terms.rate_percent else None,
        amount_mad=terms.calculated(),
        due_on=terms.due_on,
        state=state,
        review_required=review,
        action=action,
        reason=reason,
        actor_user_id=identity.user.id,
        actor_name=identity.user.display_name,
        receipt_id=receipt.id if receipt else None,
    )
    session.add(revision)
    session.add(
        AuditEvent(
            actor_user_id=identity.user.id, deal_id=row.deal_id, action=f"deals.finance.{action}"
        )
    )
    session.flush()
    return row


def command(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    body: Body,
    did: UUID | None = None,
    cid: UUID | None = None,
) -> dict[str, object]:
    route = f"{type(body).__name__}/{did or ''}/{cid or ''}"
    digest = keyed_digest(
        secret,
        "finance-command",
        json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")),
    )
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        identity = current_identity(session, token)
        session.scalar(select(User).where(User.id == identity.user.id).with_for_update())
        session.expire_all()
        identity = current_identity(session, token)
        require_manager(identity)
        if cid:
            authorized(session, identity, cid, write=True)
        elif did:
            deal_access(session, identity, did, write=True)
        session.execute(
            delete(FinanceReceipt).where(
                FinanceReceipt.created_at < datetime.now(UTC) - timedelta(hours=24)
            )
        )
        retry = session.get(FinanceReceipt, (identity.user.id, route, key))
        if retry:
            authorized(session, identity, retry.commission_id, write=True)
            if retry.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return retry.result
        row = apply(session, identity, body, did, cid)
        result: dict[str, object] = {"id": str(row.id), "version": row.version}
        session.add(
            FinanceReceipt(
                actor_id=identity.user.id,
                route=route,
                key=key,
                commission_id=row.id,
                request_hash=digest,
                result=result,
            )
        )
        session.flush()
        return result
