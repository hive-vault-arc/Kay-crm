"""Only isolated synthetic fixture teardown calls these FK-ordered removals."""

from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.inventory.models import Offering
from app.requirements.models import (
    Requirement,
    RequirementCriterion,
    RequirementReceipt,
    ShortlistEntry,
)


def delete_actor_requirements(
    session: Session,
    user_id: UUID,
    contacts: list[UUID],
    properties: list[UUID],
    developments: list[UUID],
) -> None:
    ids = list(
        session.scalars(
            select(Requirement.id).where(
                or_(
                    Requirement.contact_id.in_(contacts),
                    Requirement.origin_contact_id.in_(contacts),
                    Requirement.created_by_user_id == user_id,
                )
            )
        )
    )
    session.execute(
        delete(RequirementReceipt).where(
            or_(RequirementReceipt.requirement_id.in_(ids), RequirementReceipt.actor_id == user_id)
        )
    )
    offerings = select(Offering.id).where(
        or_(Offering.property_id.in_(properties), Offering.development_id.in_(developments))
    )
    session.execute(
        delete(ShortlistEntry).where(
            or_(ShortlistEntry.requirement_id.in_(ids), ShortlistEntry.offering_id.in_(offerings))
        )
    )
    session.execute(
        delete(RequirementCriterion).where(RequirementCriterion.requirement_id.in_(ids))
    )
    session.execute(delete(Requirement).where(Requirement.id.in_(ids)))
