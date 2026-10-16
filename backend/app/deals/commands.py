"""Agency-first transactions protect current authority, versions, retries and history."""

import json
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.contacts.access import ContactConflict, readable_contact
from app.db.session import Database
from app.deals.access import authorized, check_links, check_period, context_kind, writable
from app.deals.contracts import (
    ORDINARY_STAGES,
    CloseDeal,
    DealFields,
    EditCustomerOffer,
    EditDeal,
    NewCustomerOffer,
    NewDeal,
    ReleaseReservation,
    ReopenDeal,
    Reserve,
    Transition,
)
from app.deals.history import append_event
from app.deals.models import CustomerOffer, Deal, DealReceipt
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory import reservations

Body = (
    NewDeal
    | EditDeal
    | Transition
    | NewCustomerOffer
    | EditCustomerOffer
    | Reserve
    | ReleaseReservation
    | CloseDeal
    | ReopenDeal
)


def set_fields(row: Deal, body: DealFields) -> None:
    for name in ("title", "requirement_id", "offering_id", "next_action"):
        setattr(row, name, getattr(body, name))


def result(row: Deal, offer: CustomerOffer | None) -> dict[str, object]:
    return {
        "id": str(row.id),
        "version": row.version,
        "customer_offer_id": str(offer.id) if offer else None,
        "offer_version": offer.version if offer else None,
    }


def apply(
    session: Session,
    identity: CurrentIdentity,
    body: Body,
    did: UUID | None,
    oid: UUID | None,
) -> tuple[Deal, CustomerOffer | None]:
    offer = None
    now = datetime.now(UTC)
    if isinstance(body, NewDeal):
        contact = readable_contact(session, identity, body.contact_id)
        if contact.archived_at is not None:
            raise IdentityError("CONTACT_ARCHIVED", 409)
        check_links(session, identity, contact, body, enquiry_id=body.enquiry_id)
        row = Deal(
            id=uuid4(),
            contact_id=contact.id,
            origin_contact_id=contact.id,
            enquiry_id=body.enquiry_id,
            stage=body.stage,
            version=1,
            created_by_user_id=identity.user.id,
            updated_by_user_id=identity.user.id,
        )
        set_fields(row, body)
        session.add(row)
        session.flush()
        previous, action, reason = None, "created", ""
    else:
        if isinstance(body, EditCustomerOffer):
            offer = session.get(CustomerOffer, oid)
            if offer is None:
                raise IdentityError("NOT_FOUND", 404)
            did = offer.deal_id
        if did is None:
            raise IdentityError("NOT_FOUND", 404)
        row = authorized(session, identity, did)
        contact = writable(session, identity, row)
        expected = (
            body.expected_deal_version
            if isinstance(body, EditCustomerOffer)
            else body.expected_version
        )
        if row.version != expected or (offer and offer.version != body.expected_version):
            raise ContactConflict("DEAL_VERSION_CONFLICT", {"current": {"version": row.version}})
        if row.stage not in (*ORDINARY_STAGES, "reserved") and not isinstance(body, ReopenDeal):
            raise IdentityError("DEAL_DEDICATED_COMMAND_REQUIRED", 409)
        previous, reason = row.stage, ""
        if isinstance(body, CloseDeal | ReopenDeal):
            from app.deals.outcomes import apply as outcome_command

            action = outcome_command(session, identity, row, contact, body)
            reason = body.explanation if isinstance(body, CloseDeal) else body.reason
        elif isinstance(body, Reserve):
            action = reservations.apply(session, identity, row, body)
            reason = body.reason if isinstance(body, ReleaseReservation) else ""
        elif isinstance(body, EditDeal):
            if row.offering_id != body.offering_id and reservations.active_hold(session, row.id):
                raise IdentityError("RESERVATION_RELEASE_REQUIRED", 409)
            check_links(session, identity, contact, body, did=row.id)
            set_fields(row, body)
            action = "updated"
        elif isinstance(body, Transition):
            if row.stage == body.stage:
                raise IdentityError("DEAL_STAGE_UNCHANGED", 422)
            row.stage, action, reason = body.stage, "transition", body.reason
        else:
            check_period(context_kind(session, row), body.price_period)
            if offer is None:
                offer = CustomerOffer(
                    id=uuid4(),
                    deal_id=row.id,
                    version=1,
                    created_by_user_id=identity.user.id,
                    updated_by_user_id=identity.user.id,
                )
                session.add(offer)
                action = "customer_offer.created"
            else:
                offer.version += 1
                action = "customer_offer.updated"
            for name in (
                "amount_mad",
                "currency",
                "price_period",
                "conditions",
                "expires_on",
                "status",
            ):
                setattr(offer, name, getattr(body, name))
            offer.updated_by_user_id, offer.updated_at = identity.user.id, now
            session.flush()
        row.version += 1
    row.updated_by_user_id, row.updated_at = identity.user.id, now
    append_event(session, identity, row, action, previous, reason=reason, offer=offer)
    session.flush()
    return row, offer


def command(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    body: Body,
    did: UUID | None = None,
    oid: UUID | None = None,
) -> dict[str, object]:
    route = f"{type(body).__name__}/{did or ''}/{oid or ''}"
    digest = keyed_digest(
        secret,
        "deal-command",
        json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")),
    )
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        identity = current_identity(session, token)
        session.scalar(select(User).where(User.id == identity.user.id).with_for_update())
        session.expire_all()
        identity = current_identity(session, token)
        session.execute(
            delete(DealReceipt).where(
                DealReceipt.created_at < datetime.now(UTC) - timedelta(hours=24)
            )
        )
        receipt = session.get(DealReceipt, (identity.user.id, route, key))
        if receipt:
            row = authorized(session, identity, receipt.deal_id)
            writable(session, identity, row)
            if receipt.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return {
                "id": str(row.id),
                "version": receipt.result_version,
                "customer_offer_id": str(receipt.customer_offer_id)
                if receipt.customer_offer_id
                else None,
                "offer_version": receipt.result_offer_version,
            }
        row, offer = apply(session, identity, body, did, oid)
        session.add(
            DealReceipt(
                actor_id=identity.user.id,
                route=route,
                key=key,
                request_hash=digest,
                deal_id=row.id,
                result_version=row.version,
                customer_offer_id=offer.id if offer else None,
                result_offer_version=offer.version if offer else None,
            )
        )
        return result(row, offer)
