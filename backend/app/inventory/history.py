"""Inventory changes and their true actors commit with the business mutation."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.identity.models import AuditEvent
from app.identity.sessions import CurrentIdentity
from app.inventory.hierarchy_models import Development
from app.inventory.models import InventoryEvent, Offering, Property


def record(
    session: Session,
    identity: CurrentIdentity,
    item: Property | Development,
    action: str,
    offering: Offering | None = None,
    reason: str = "",
) -> UUID:
    event = InventoryEvent(
        property_id=item.id if isinstance(item, Property) else None,
        development_id=item.id if isinstance(item, Development) else None,
        offering_id=offering.id if offering else None,
        actor_user_id=identity.user.id,
        actor_display_name=identity.user.display_name,
        action=action,
        property_version=item.version,
        offering_version=offering.version if offering else None,
        state=offering.state if offering else None,
        price_mad=offering.price_mad if offering else None,
        price_period=offering.price_period if offering else None,
        conditions=offering.conditions if offering else None,
        reason=reason,
    )
    session.add(event)
    session.add(
        AuditEvent(
            actor_user_id=identity.user.id,
            property_id=item.id if isinstance(item, Property) else None,
            development_id=item.id if isinstance(item, Development) else None,
            offering_id=offering.id if offering else None,
            action=action,
        )
    )
    session.flush()
    return event.id
