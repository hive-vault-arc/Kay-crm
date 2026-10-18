"""Project interest and client facts never imply an inventory reservation."""

from uuid import UUID

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.contacts.models import Contact
from app.contacts.projections import contact_views
from app.deals.contracts import DealFields, ProjectChoice
from app.deals.models import Deal
from app.deals.project_models import DealProject
from app.identity.security import IdentityError
from app.inventory.hierarchy_models import Development
from app.inventory.models import Property


def project_interest(
    session: Session, choice: ProjectChoice, did: UUID, position: int
) -> DealProject:
    name = choice.external_name
    if choice.development_id:
        development = session.get(Development, choice.development_id)
        if development is None or development.archived_at is not None:
            raise IdentityError("PROJECT_UNAVAILABLE", 422)
        name = development.name
    if choice.property_id:
        property = session.get(Property, choice.property_id)
        if property is None or property.archived_at is not None:
            raise IdentityError("PROJECT_UNAVAILABLE", 422)
        if property.development_id is not None:
            raise IdentityError("PROJECT_DEVELOPMENT_REQUIRED", 422)
        name = property.marketing_name or property.reference
    if not name:
        raise IdentityError("PROJECT_REQUIRED", 422)
    return DealProject(
        deal_id=did,
        position=position,
        development_id=choice.development_id,
        property_id=choice.property_id,
        external_name=choice.external_name,
        name=name,
    )


def client_snapshot(session: Session, contact: Contact) -> dict[str, object]:
    if not contact.languages:
        raise IdentityError("LANGUAGES_REQUIRED", 422)
    profile = contact_views(session, [contact], detail=True)[contact.id]
    return {
        key: profile[key]
        for key in (
            "name",
            "type",
            "phones",
            "emails",
            "country",
            "nationality",
            "languages",
            "calling_code",
        )
    }


def set_fields(session: Session, contact: Contact, row: Deal, body: DealFields) -> None:
    projects = [
        project_interest(session, choice, row.id, index)
        for index, choice in enumerate(body.projects, start=1)
    ]
    snapshot = client_snapshot(session, contact)
    for name in (
        "requirement_id",
        "offering_id",
        "next_action",
        "initial_budget",
        "purchase_reasons",
        "campaign_source",
        "rating",
        "payment_method",
        "number_of_rooms",
        "notes",
    ):
        setattr(row, name, getattr(body, name))
    row.title = f"{contact.name} · {projects[0].name}"[:160]
    row.client_snapshot = snapshot
    # Remove before adding so an explicit reorder does not violate the position/target keys.
    session.execute(delete(DealProject).where(DealProject.deal_id == row.id))
    session.add_all(projects)
