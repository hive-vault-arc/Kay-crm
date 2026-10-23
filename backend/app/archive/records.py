"""Recoverable, record-scoped Lead and Deal removal without erasing history."""

import json
from datetime import UTC, datetime, timedelta
from typing import Literal, cast
from uuid import UUID

from pydantic import Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.contacts.access import ContactConflict, readable_contact
from app.contacts.contracts import StrictBody
from app.contacts.history import record
from app.contacts.models import Enquiry, IdempotencyRecord
from app.contacts.queries import detail_in_session, enquiry_in_scope
from app.db.session import Database
from app.deals.access import authorized
from app.deals.history import append_event
from app.deals.models import Deal, DealReceipt
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.reservation_models import Reservation
from app.schedule.models import Visit
from app.work.models import Task

Action = Literal["archive", "restore"]
Kind = Literal["enquiries", "deals"]
RECOVERY_WINDOW = timedelta(days=30)


class RecordLifecycle(StrictBody):
    expected_version: int = Field(ge=1)
    reason: str = Field(min_length=1, max_length=1000)


def permitted(
    session: Session, identity: CurrentIdentity, kind: Kind, target: UUID
) -> Enquiry | Deal:
    if kind == "enquiries":
        enquiry = enquiry_in_scope(session, identity, target)
        if identity.user.role == "agent" and enquiry.assigned_agent_id != identity.user.id:
            raise IdentityError("FORBIDDEN", 403)
        return enquiry
    else:
        deal = authorized(session, identity, target)
        contact = readable_contact(session, identity, deal.contact_id)
        if identity.user.role == "agent" and contact.primary_agent_id != identity.user.id:
            raise IdentityError("FORBIDDEN", 403)
        return deal


def blockers(session: Session, row: Deal) -> None:
    if session.scalar(
        select(Reservation.id).where(
            Reservation.deal_id == row.id, Reservation.released_at.is_(None)
        )
    ):
        raise IdentityError("RESERVATION_RELEASE_REQUIRED", 409)
    if session.scalar(
        select(Visit.id).where(
            Visit.deal_id == row.id,
            Visit.status.in_(("draft", "scheduled", "confirmed")),
        )
    ):
        raise IdentityError("RECORD_ACTIVE_VISIT", 409)
    if session.scalar(select(Task.id).where(Task.deal_id == row.id, Task.status == "open")):
        raise IdentityError("RECORD_ACTIVE_TASK", 409)


def command(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    kind: Kind,
    target: UUID,
    action: Action,
    body: RecordLifecycle,
) -> dict[str, object]:
    route = f"record-lifecycle/{kind}/{target}/{action}"
    digest = keyed_digest(
        secret,
        "record-lifecycle",
        json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")),
    )
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        identity = current_identity(session, token)
        session.scalar(select(User).where(User.id == identity.user.id).with_for_update())
        session.expire_all()
        identity = current_identity(session, token)
        now = datetime.now(UTC)
        receipt: IdempotencyRecord | DealReceipt | None
        if kind == "enquiries":
            session.execute(
                delete(IdempotencyRecord).where(
                    IdempotencyRecord.created_at < now - timedelta(hours=24)
                )
            )
            receipt = session.get(IdempotencyRecord, (identity.user.id, route, key))
        else:
            session.execute(
                delete(DealReceipt).where(DealReceipt.created_at < now - timedelta(hours=24))
            )
            receipt = session.get(DealReceipt, (identity.user.id, route, key))
        row = permitted(session, identity, kind, target)
        if receipt is not None:
            if receipt.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            if isinstance(receipt, IdempotencyRecord):
                return receipt.response
            return {"id": str(row.id), "version": receipt.result_version}
        model = Enquiry if kind == "enquiries" else Deal
        session.scalar(select(model).where(model.id == target).with_for_update())
        session.refresh(row)
        if row.version != body.expected_version:
            if kind == "enquiries":
                raise ContactConflict(
                    "VERSION_CONFLICT",
                    {"current": detail_in_session(session, identity, kind, target)},
                )
            raise ContactConflict("DEAL_VERSION_CONFLICT", {"current": {"version": row.version}})
        if action == "archive":
            if row.archived_at is not None:
                raise IdentityError("RECORD_ALREADY_ARCHIVED", 409)
            contact = readable_contact(session, identity, row.contact_id)
            if contact.archived_at is not None:
                raise IdentityError("CONTACT_ARCHIVED", 409)
            if kind == "deals":
                blockers(session, cast(Deal, row))
            row.archived_at, row.archived_by_user_id = now, identity.user.id
        else:
            if row.archived_at is None:
                raise IdentityError("RECORD_NOT_ARCHIVED", 409)
            if now >= row.archived_at + RECOVERY_WINDOW:
                raise IdentityError("RECORD_RESTORE_EXPIRED", 409)
            contact = readable_contact(session, identity, row.contact_id)
            if contact.archived_at is not None:
                raise IdentityError("CONTACT_ARCHIVED", 409)
            row.archived_at, row.archived_by_user_id = None, None
        row.version += 1
        row.updated_at = now
        if kind == "enquiries":
            row = cast(Enquiry, row)
            record(
                session,
                identity,
                row.contact_id,
                f"enquiries.{action}",
                reason=body.reason,
                enquiry_id=row.id,
            )
        else:
            row = cast(Deal, row)
            row.updated_by_user_id = identity.user.id
            append_event(
                session,
                identity,
                row,
                "archived" if action == "archive" else "restored",
                row.stage,
                reason=body.reason,
            )
        session.flush()
        response: dict[str, object] = {"id": str(row.id), "version": row.version}
        if kind == "enquiries":
            session.add(
                IdempotencyRecord(
                    actor_id=identity.user.id,
                    route=route,
                    key=key,
                    request_hash=digest,
                    contact_id=row.contact_id,
                    response=response,
                )
            )
        else:
            session.add(
                DealReceipt(
                    actor_id=identity.user.id,
                    route=route,
                    key=key,
                    request_hash=digest,
                    deal_id=row.id,
                    result_version=row.version,
                )
            )
        return response
