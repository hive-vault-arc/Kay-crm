"""Hierarchy invariants before writes; SQL guards are the final boundary."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contacts.models import Contact
from app.identity.security import IdentityError
from app.inventory.contracts import PropertyFields
from app.inventory.hierarchy_models import Block, Development, Floor, UnitType
from app.inventory.models import Offering, Property


def development_record(session: Session, did: UUID, *, lock: bool = False) -> Development:
    query = select(Development).where(Development.id == did)
    item = session.scalar(query.with_for_update() if lock else query)
    if item is None:
        raise IdentityError("NOT_FOUND", 404)
    return item


def active_contact(session: Session, cid: UUID | None) -> None:
    if cid is None:
        return
    contact = session.get(Contact, cid)
    if contact is None or contact.archived_at is not None or contact.merged_into_contact_id:
        raise IdentityError("INVALID_LEGAL_OWNER", 422)


def validate_unit(session: Session, body: PropertyFields, current: Property | None = None) -> None:
    if (
        current is not None
        and any(
            getattr(current, key) != getattr(body, key)
            for key in ("category", "development_id", "floor_id", "unit_type_id")
        )
        and session.scalar(select(Offering.id).where(Offering.property_id == current.id).limit(1))
    ):
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    if body.development_id is None:
        if body.floor_id or body.unit_type_id:
            raise IdentityError("INVALID_HIERARCHY", 422)
        return
    development = development_record(session, body.development_id, lock=True)
    if development.archived_at is not None:
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    if body.category == "apartment" and (body.floor_id is None or body.unit_type_id is None):
        raise IdentityError("INVALID_HIERARCHY", 422)
    if (
        body.floor_id is not None
        and session.scalar(
            select(Floor.id)
            .join(Block, Block.id == Floor.block_id)
            .where(Floor.id == body.floor_id, Block.development_id == body.development_id)
        )
        is None
    ):
        raise IdentityError("INVALID_HIERARCHY", 422)
    if (
        body.unit_type_id is not None
        and session.scalar(
            select(UnitType.id).where(
                UnitType.id == body.unit_type_id,
                UnitType.development_id == body.development_id,
                UnitType.category == body.category,
            )
        )
        is None
    ):
        raise IdentityError("INVALID_HIERARCHY", 422)


def marketable_structure(session: Session, item: Development) -> None:
    if item.archived_at:
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    if (
        item.category == "apartment"
        and session.scalar(
            select(Property.id)
            .join(Floor, Floor.id == Property.floor_id)
            .join(Block, Block.id == Floor.block_id)
            .where(
                Property.development_id == item.id,
                Block.development_id == item.id,
                Property.category == "apartment",
            )
            .limit(1)
        )
        is None
    ):
        raise IdentityError("DEVELOPMENT_UNITS_REQUIRED", 422)
