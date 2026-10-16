"""Manager-only hierarchy changes share existing locks, history and receipts."""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity
from app.inventory.commands import Body, available, bump, check_version, set_owners
from app.inventory.contracts import ConfirmAvailability, Owners
from app.inventory.hierarchy_contracts import (
    ArchiveDevelopment,
    DevelopmentFields,
    EditDevelopment,
    StructureFields,
    TypeFields,
)
from app.inventory.hierarchy_models import Block, Development, Floor, UnitType
from app.inventory.hierarchy_rules import active_contact, development_record, marketable_structure
from app.inventory.history import record
from app.inventory.models import Offering, Property


def execute_hierarchy(
    session: Session, identity: CurrentIdentity, operation: str, target: UUID | None, body: Body
) -> tuple[Development, Offering | None, UUID]:
    if isinstance(body, DevelopmentFields) and not isinstance(body, EditDevelopment):
        active_contact(session, body.developer_contact_id)
        item = Development(**body.model_dump(), created_by_user_id=identity.user.id)
        session.add(item)
        session.flush()
        return item, None, record(session, identity, item, "developments.created")
    if target is None:
        raise IdentityError("NOT_FOUND", 404)
    level: Block | Floor | UnitType | None = None
    if operation in {"edit-block", "create-floor"}:
        level = session.get(Block, target)
    elif operation == "edit-floor":
        level = session.get(Floor, target)
    elif operation == "edit-type":
        level = session.get(UnitType, target)
    did = target
    if operation in {"edit-block", "create-floor", "edit-floor", "edit-type"}:
        if level is None:
            raise IdentityError("NOT_FOUND", 404)
        if isinstance(level, Floor):
            block = session.get(Block, level.block_id)
            if block is None:
                raise IdentityError("NOT_FOUND", 404)
            did = block.development_id
        else:
            did = level.development_id
    item = development_record(session, did, lock=True)
    if not isinstance(
        body,
        EditDevelopment
        | StructureFields
        | TypeFields
        | ArchiveDevelopment
        | Owners
        | ConfirmAvailability,
    ):
        raise IdentityError("VALIDATION_ERROR", 422)
    check_version(item.version, body.expected_version)
    if item.archived_at and operation != "development-restore":
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    offering = None
    action = "developments.updated"
    if isinstance(body, EditDevelopment):
        if body.developer_contact_id != item.developer_contact_id:
            active_contact(session, body.developer_contact_id)
        for key, value in body.model_dump(exclude={"expected_version"}).items():
            setattr(item, key, value)
        if session.scalar(
            select(Offering.id)
            .where(
                Offering.development_id == item.id, Offering.state.in_(["available", "reserved"])
            )
            .limit(1)
        ):
            marketable_structure(session, item)
    elif isinstance(body, Owners):
        set_owners(session, identity, item, body)
        action = "developments.owners"
    elif isinstance(body, ConfirmAvailability):
        offering = session.scalar(
            select(Offering)
            .where(Offering.id == body.offering_id, Offering.development_id == item.id)
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
    elif isinstance(body, ArchiveDevelopment):
        if operation == "development-archive":
            if session.scalar(
                select(Property.id).where(Property.development_id == item.id).limit(1)
            ) or session.scalar(
                select(Offering.id)
                .where(Offering.development_id == item.id, Offering.is_current)
                .limit(1)
            ):
                raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
            item.archived_at = datetime.now(UTC)
            action = "developments.archived"
        else:
            item.archived_at = None
            action = "developments.restored"
    elif isinstance(body, StructureFields):
        values = body.model_dump(exclude={"expected_version"})
        if operation == "create-block":
            session.add(Block(development_id=item.id, **values))
        elif operation == "create-floor":
            session.add(Floor(block_id=target, **values))
        elif level is not None:
            for key, value in values.items():
                setattr(level, key, value)
        else:
            raise IdentityError("VALIDATION_ERROR", 422)
        action = "developments.hierarchy"
    else:
        if body.development_id != item.id:
            raise IdentityError("INVALID_HIERARCHY", 422)
        if (
            isinstance(level, UnitType)
            and level.category != body.category
            and session.scalar(
                select(Property.id).where(Property.unit_type_id == level.id).limit(1)
            )
        ):
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        values = body.model_dump(exclude={"expected_version"})
        values["default_area_sqm"] = (
            Decimal(body.default_area_sqm) if body.default_area_sqm else None
        )
        if operation == "create-type":
            session.add(UnitType(**values))
        elif isinstance(level, UnitType):
            for key, value in values.items():
                setattr(level, key, value)
        else:
            raise IdentityError("VALIDATION_ERROR", 422)
        action = "developments.unit-type"
    bump(item)
    session.flush()
    reason = body.reason if isinstance(body, ConfirmAvailability | ArchiveDevelopment) else ""
    return item, offering, record(session, identity, item, action, offering, reason)
