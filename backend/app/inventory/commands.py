"""Versioned inventory commands, current authority and exact-once durable receipts."""

import json
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import cast
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contacts.models import Contact
from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, AuditEvent, User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity, require_role
from app.inventory.contracts import (
    ConfirmAvailability,
    EditOffering,
    EditProperty,
    NewOffering,
    Owners,
    PropertyFields,
)
from app.inventory.hierarchy_contracts import (
    ArchiveDevelopment,
    DevelopmentFields,
    EditDevelopment,
    StructureFields,
    TypeFields,
)
from app.inventory.hierarchy_models import Development, DevelopmentOwner
from app.inventory.hierarchy_rules import development_record, marketable_structure, validate_unit
from app.inventory.history import record
from app.inventory.models import InventoryReceipt, Offering, Property, PropertyOwner
from app.inventory.outcome_contracts import ExternalOutcome
from app.inventory.queries import property_record

Body = (
    PropertyFields
    | Owners
    | NewOffering
    | EditOffering
    | ConfirmAvailability
    | DevelopmentFields
    | StructureFields
    | TypeFields
    | ArchiveDevelopment
    | ExternalOutcome
)


PROJECT_EDIT_OPERATIONS = frozenset(
    {
        "create-development",
        "development-edit",
        "create-property",
        "edit-property",
        "create-block",
        "edit-block",
        "create-floor",
        "edit-floor",
        "create-type",
        "edit-type",
    }
)


def locked_identity(session: Session, token: str, operation: str) -> CurrentIdentity:
    # Same agency → actor → asset ordering as user/contact administrative commands.
    session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
    identity = current_identity(session, token)
    session.scalars(select(User).where(User.id == identity.user.id).with_for_update()).all()
    session.expire_all()
    identity = current_identity(session, token)
    require_role(
        identity, {"manager", "agent"} if operation in PROJECT_EDIT_OPERATIONS else {"manager"}
    )
    return identity


def check_version(actual: int, expected: int) -> None:
    if actual != expected:
        raise IdentityError("INVENTORY_VERSION_CONFLICT", 409)


def bump(item: Property | Development) -> None:
    item.version += 1
    item.updated_at = datetime.now(UTC)


def available(session: Session, item: Property | Development, offering: Offering) -> None:
    from app.inventory.stock_review import marketability

    marketability(session, offering)
    if offering.price_mad is None or offering.price_mad <= 0:
        raise IdentityError("AVAILABILITY_PRICE_REQUIRED", 422)
    owner_model = PropertyOwner if isinstance(item, Property) else DevelopmentOwner
    parent = (
        owner_model.property_id if owner_model is PropertyOwner else DevelopmentOwner.development_id
    )
    if (
        session.scalar(
            select(owner_model.id)
            .where(parent == item.id, owner_model.archived_at.is_(None))
            .limit(1)
        )
        is None
    ):
        raise IdentityError("AVAILABILITY_OWNER_REQUIRED", 422)
    if isinstance(item, Development):
        marketable_structure(session, item)


def set_owners(
    session: Session, identity: CurrentIdentity, item: Property | Development, body: Owners
) -> None:
    model = PropertyOwner if isinstance(item, Property) else DevelopmentOwner
    parent = (
        PropertyOwner.property_id if isinstance(item, Property) else DevelopmentOwner.development_id
    )
    offering_parent = (
        Offering.property_id if isinstance(item, Property) else Offering.development_id
    )
    links = {
        row.contact_id: row
        for row in cast(
            Sequence[PropertyOwner | DevelopmentOwner],
            session.scalars(
                select(model)
                .where(parent == item.id, model.archived_at.is_(None))
                .order_by(model.id)
                .with_for_update()
            ).all(),
        )
    }
    desired = {owner.contact_id for owner in body.owners}
    if not desired and session.scalar(
        select(Offering.id)
        .where(offering_parent == item.id, Offering.state.in_(["available", "reserved"]))
        .limit(1)
    ):
        raise IdentityError("AVAILABILITY_OWNER_REQUIRED", 422)
    for owner in body.owners:
        if owner.contact_id in links:
            links[owner.contact_id].marketing_display = owner.marketing_display
        else:
            contact = session.get(Contact, owner.contact_id)
            if contact is None or contact.archived_at is not None or contact.merged_into_contact_id:
                raise IdentityError("INVALID_LEGAL_OWNER", 422)
            session.add(
                model(
                    **{"property_id" if isinstance(item, Property) else "development_id": item.id},
                    contact_id=contact.id,
                    origin_contact_id=contact.id,
                    marketing_display=owner.marketing_display,
                    created_by_user_id=identity.user.id,
                )
            )
    for cid, link in links.items():
        if cid not in desired:
            link.archived_at = datetime.now(UTC)


def property_values(body: PropertyFields) -> dict[str, object]:
    return {
        "reference": body.reference.upper(),
        "category": body.category,
        "marketing_name": body.marketing_name,
        "location": body.location,
        "area_sqm": Decimal(body.area_sqm) if body.area_sqm is not None else None,
        "development_id": body.development_id,
        "floor_id": body.floor_id,
        "unit_type_id": body.unit_type_id,
        "rooms": body.rooms,
    }


def execute(
    session: Session, identity: CurrentIdentity, operation: str, target: UUID | None, body: Body
) -> tuple[Property | Development, Offering | None, UUID]:
    item: Property | Development
    offering: Offering | None = None
    if operation in {"property-archive", "property-restore"} and isinstance(
        body, ArchiveDevelopment
    ):
        if target is None:
            raise IdentityError("NOT_FOUND", 404)
        item = property_record(session, target, lock=True)
        check_version(item.version, body.expected_version)
        if operation == "property-archive" and session.scalar(
            select(Offering.id).where(Offering.property_id == item.id, Offering.is_current).limit(1)
        ):
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        item.archived_at = datetime.now(UTC) if operation == "property-archive" else None
        bump(item)
        return (
            item,
            None,
            record(
                session,
                identity,
                item,
                "properties.archived" if item.archived_at else "properties.restored",
                reason=body.reason,
            ),
        )
    if isinstance(body, ExternalOutcome):
        from app.deals.contracts import ReviewedStock
        from app.inventory.outcomes import close_stock
        from app.inventory.stock_review import reviewed

        offering, item = reviewed(
            session,
            ReviewedStock(
                expected_version=body.expected_version,
                offering_id=body.offering_id,
                expected_offering_version=body.expected_offering_version,
                expected_target_version=body.expected_version,
                expected_development_version=body.expected_development_version,
                expected_stock_fingerprint=body.expected_stock_fingerprint,
            ),
        )
        if item.id != target or (operation == "development-external-outcome") != isinstance(
            item, Development
        ):
            raise IdentityError("DEAL_TARGET_CHANGED", 409)
        eid = close_stock(
            session, identity, offering, body.completed_on, explanation=body.explanation
        )
        session.add(
            AuditEvent(
                actor_user_id=identity.user.id,
                property_id=item.id if isinstance(item, Property) else None,
                development_id=item.id if isinstance(item, Development) else None,
                offering_id=offering.id,
                action="offerings.external-outcome",
            )
        )
        session.flush()
        return item, offering, eid
    if operation.startswith("development-") or isinstance(
        body, DevelopmentFields | StructureFields | TypeFields | ArchiveDevelopment
    ):
        from app.inventory.hierarchy_commands import execute_hierarchy

        return execute_hierarchy(session, identity, operation, target, body)
    if (
        operation == "create-property"
        and isinstance(body, PropertyFields)
        and not isinstance(body, EditProperty)
    ):
        validate_unit(session, body)
        item = Property(**property_values(body), created_by_user_id=identity.user.id)
        session.add(item)
        session.flush()
        return item, None, record(session, identity, item, "properties.created")
    if isinstance(body, NewOffering):
        item = (
            property_record(session, body.property_id, lock=True)
            if body.property_id
            else development_record(session, cast(UUID, body.development_id), lock=True)
        )
        expected = (
            body.expected_property_version
            if isinstance(item, Property)
            else body.expected_development_version
        )
        check_version(item.version, expected or 0)
        if isinstance(item, Property) and item.archived_at is not None:
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        if isinstance(item, Development) and item.archived_at is not None:
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        parent = Offering.property_id if isinstance(item, Property) else Offering.development_id
        if session.scalar(
            select(Offering.id).where(
                parent == item.id, Offering.kind == body.kind, Offering.is_current
            )
        ):
            raise IdentityError("CURRENT_OFFERING_EXISTS", 409)
        offering = Offering(
            property_id=item.id if isinstance(item, Property) else None,
            development_id=item.id if isinstance(item, Development) else None,
            kind=body.kind,
            price_mad=Decimal(body.price_mad) if body.price_mad else None,
            price_period=body.price_period,
            currency=body.currency,
            conditions=body.conditions,
            created_by_user_id=identity.user.id,
        )
        session.add(offering)
        session.flush()
        bump(item)
        action = "offerings.created"
    elif isinstance(body, EditOffering):
        # Resolve the immutable target before locking in aggregate order.
        offering = session.get(Offering, target)
        if offering is None:
            raise IdentityError("NOT_FOUND", 404)
        item = (
            property_record(session, offering.property_id, lock=True)
            if offering.property_id
            else development_record(session, cast(UUID, offering.development_id), lock=True)
        )
        session.refresh(offering, with_for_update=True)
        if item.archived_at is not None:
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        expected = (
            body.expected_property_version
            if isinstance(item, Property)
            else body.expected_development_version
        )
        if (isinstance(item, Property) and body.expected_development_version is not None) or (
            isinstance(item, Development) and body.expected_property_version is not None
        ):
            raise IdentityError("VALIDATION_ERROR", 422)
        check_version(item.version, expected or 0)
        check_version(offering.version, body.expected_version)
        if offering.state == "reserved":
            raise IdentityError("RESERVATION_RELEASE_REQUIRED", 409)
        if offering.state in {"sold", "rented", "review"}:
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        if not offering.is_current:
            raise IdentityError("OFFERING_WITHDRAWN", 409)
        if (offering.kind == "sale") != (body.price_period is None):
            raise IdentityError("VALIDATION_ERROR", 422)
        if body.state == "available" and offering.state != "available":
            raise IdentityError("CONFIRM_AVAILABILITY_REQUIRED", 422)
        offering.price_mad = Decimal(body.price_mad) if body.price_mad else None
        offering.price_period = body.price_period
        offering.conditions = body.conditions
        offering.state = body.state
        offering.is_current = body.state != "withdrawn"
        if body.state == "available":
            available(session, item, offering)
        offering.version += 1
        bump(item)
        action = "offerings.withdrawn" if body.state == "withdrawn" else "offerings.updated"
    else:
        if target is None:
            raise IdentityError("NOT_FOUND", 404)
        item = property_record(session, target, lock=True)
        if not isinstance(body, EditProperty | Owners | ConfirmAvailability):
            raise IdentityError("VALIDATION_ERROR", 422)
        if item.archived_at is not None:
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        check_version(item.version, body.expected_version)
        if isinstance(body, EditProperty):
            validate_unit(session, body, item)
            for name, value in property_values(body).items():
                setattr(item, name, value)
            action = "properties.updated"
        elif isinstance(body, Owners):
            set_owners(session, identity, item, body)
            action = "properties.owners"
        else:
            offering = session.scalar(
                select(Offering)
                .where(Offering.id == body.offering_id, Offering.property_id == item.id)
                .with_for_update()
            )
            if offering is None:
                raise IdentityError("NOT_FOUND", 404)
            check_version(offering.version, body.expected_offering_version)
            if offering.state == "reserved":
                raise IdentityError("RESERVATION_RELEASE_REQUIRED", 409)
            if not offering.is_current:
                raise IdentityError("OFFERING_WITHDRAWN", 409)
            available(session, item, offering)
            offering.state = "available"
            offering.availability_confirmed_at = datetime.now(UTC)
            offering.version += 1
            action = "offerings.confirmed"
        bump(item)
    session.flush()
    reason = body.reason if isinstance(body, EditOffering | ConfirmAvailability) else ""
    return item, offering, record(session, identity, item, action, offering, reason)


def result(receipt: InventoryReceipt) -> dict[str, object]:
    return {
        **(
            {"property_id": str(receipt.property_id)}
            if receipt.property_id
            else {"development_id": str(receipt.development_id)}
        ),
        "offering_id": str(receipt.offering_id) if receipt.offering_id else None,
        "version": receipt.version,
        "event_id": str(receipt.event_id),
    }


def command(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    operation: str,
    body: Body,
    target: UUID | None = None,
) -> dict[str, object]:
    route = f"{operation}/{target or ''}"
    payload = body.model_dump(mode="json")
    if isinstance(body, EditDevelopment) and "developer_contact_id" not in body.model_fields_set:
        payload.pop("developer_contact_id")
    digest = keyed_digest(
        secret,
        "inventory-command",
        json.dumps(payload, sort_keys=True, separators=(",", ":")),
    )
    try:
        with database.session() as session, session.begin():
            identity = locked_identity(session, token, operation)
            session.execute(
                delete(InventoryReceipt).where(
                    InventoryReceipt.created_at < datetime.now(UTC) - timedelta(hours=24)
                )
            )
            previous = session.get(InventoryReceipt, (identity.user.id, route, key))
            if previous:
                if previous.request_hash != digest:
                    raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
                return result(previous)
            item, offering, eid = execute(session, identity, operation, target, body)
            receipt = InventoryReceipt(
                actor_id=identity.user.id,
                route=route,
                key=key,
                request_hash=digest,
                property_id=item.id if isinstance(item, Property) else None,
                development_id=item.id if isinstance(item, Development) else None,
                offering_id=offering.id if offering else None,
                event_id=eid,
                version=item.version,
            )
            session.add(receipt)
            return result(receipt)
    except IntegrityError as error:
        # Return only known conflict codes; never driver text/identifiers/values.
        constraint = getattr(getattr(error.orig, "diag", None), "constraint_name", "")
        if constraint == "property_reference_key":
            raise IdentityError("PROPERTY_REFERENCE_EXISTS", 409) from None
        if constraint in {"uq_offering_current", "uq_offering_development_current"}:
            raise IdentityError("CURRENT_OFFERING_EXISTS", 409) from None
        if constraint == "development_reference_key":
            raise IdentityError("DEVELOPMENT_REFERENCE_EXISTS", 409) from None
        if constraint in {"uq_block_code", "uq_floor_code", "uq_unit_type_code"}:
            raise IdentityError("HIERARCHY_CODE_EXISTS", 409) from None
        raise
