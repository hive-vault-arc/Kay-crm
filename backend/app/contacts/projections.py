"""Explicit private projections, with bounded batched collection reads."""

from collections.abc import Sequence
from typing import cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contacts.models import (
    Contact,
    ContactCollaborator,
    ContactEmail,
    ContactPhone,
    ContactRole,
    Enquiry,
)
from app.contacts.qualification import calling_code
from app.identity.models import User


def contact_views(
    session: Session, contacts: Sequence[Contact], *, detail: bool = False
) -> dict[UUID, dict[str, object]]:
    ids = [c.id for c in contacts]
    agents = {
        user.id: {"id": str(user.id), "display_name": user.display_name}
        for user in session.scalars(
            select(User).where(User.id.in_({c.primary_agent_id for c in contacts}))
        )
    }
    result: dict[UUID, dict[str, object]] = {}
    for contact in contacts:
        result[contact.id] = {
            "id": str(contact.id),
            "name": contact.name,
            "type": contact.type,
            "primary_agent": agents[contact.primary_agent_id],
            "version": contact.version,
            "primary_phone": None,
            "primary_email": None,
            "country": contact.country,
            "nationality": contact.nationality,
            "languages": list(contact.languages),
            "calling_code": None,
            "archived_at": contact.archived_at.isoformat() if contact.archived_at else None,
        }
        if detail:
            result[contact.id].update(
                {
                    "phones": [],
                    "emails": [],
                    "roles": [],
                    "source": contact.source,
                    "source_submission_id": str(contact.source_submission_id)
                    if contact.source_submission_id
                    else None,
                    "created_by_user_id": str(contact.created_by_user_id)
                    if contact.created_by_user_id
                    else None,
                    "created_at": contact.created_at.isoformat(),
                    "updated_at": contact.updated_at.isoformat(),
                    "collaborators": [],
                }
            )
    for model, collection, value_key, primary in (
        (ContactPhone, "phones", "number", "primary_phone"),
        (ContactEmail, "emails", "email", "primary_email"),
    ):
        for row in session.scalars(
            select(model)
            .where(model.contact_id.in_(ids), model.archived_at.is_(None))
            .order_by(model.created_at, model.id)
        ):
            value = cast(ContactPhone | ContactEmail, row)
            view = result[value.contact_id]
            if value.is_primary:
                view[primary] = value.normalized
                if model is ContactPhone:
                    view["calling_code"] = calling_code(value.normalized)
            if detail:
                values = cast(list[dict[str, object]], view[collection])
                values.append(
                    {
                        value_key: value.normalized,
                        "label": value.label,
                        "is_primary": value.is_primary,
                    }
                )
    if detail:
        for cid, user in session.execute(
            select(ContactCollaborator.contact_id, User)
            .join(User, User.id == ContactCollaborator.user_id)
            .where(
                ContactCollaborator.contact_id.in_(ids), ContactCollaborator.revoked_at.is_(None)
            )
            .order_by(User.display_name, User.id)
        ):
            cast(list[dict[str, str]], result[cid]["collaborators"]).append(
                {"id": str(user.id), "display_name": user.display_name}
            )
        for role in session.scalars(
            select(ContactRole).where(ContactRole.contact_id.in_(ids)).order_by(ContactRole.role)
        ):
            roles = cast(list[str], result[role.contact_id]["roles"])
            roles.append(role.role)
    return result


def enquiry_views(
    session: Session,
    enquiries: Sequence[Enquiry],
    contacts: Sequence[Contact],
    *,
    detail: bool = False,
) -> list[dict[str, object]]:
    contact_map = contact_views(session, contacts)
    agents = {
        user.id: {"id": str(user.id), "display_name": user.display_name}
        for user in session.scalars(
            select(User).where(
                User.id.in_({e.assigned_agent_id for e in enquiries if e.assigned_agent_id})
            )
        )
    }
    return [
        {
            "id": str(enquiry.id),
            "contact": contact_map[enquiry.contact_id],
            "message" if detail else "message_preview": enquiry.message
            if detail
            else enquiry.message[:160],
            "source": enquiry.source,
            "source_submission_id": str(enquiry.source_submission_id)
            if enquiry.source_submission_id
            else None,
            "assigned_agent": agents.get(enquiry.assigned_agent_id)
            if enquiry.assigned_agent_id
            else None,
            "received_at": enquiry.received_at.isoformat(),
            "updated_at": enquiry.updated_at.isoformat(),
            "created_by_user_id": str(enquiry.created_by_user_id)
            if enquiry.created_by_user_id
            else None,
            "origin_contact_id": str(enquiry.origin_contact_id),
            "status": enquiry.status,
            "version": enquiry.version,
            "initial_budget": enquiry.initial_budget,
            "campaign_source": enquiry.campaign_source,
            "rating": enquiry.rating,
            "converted_deal_id": str(enquiry.converted_deal_id)
            if enquiry.converted_deal_id
            else None,
            "converted_at": enquiry.converted_at.isoformat() if enquiry.converted_at else None,
            "archived_at": enquiry.archived_at.isoformat() if enquiry.archived_at else None,
        }
        for enquiry in enquiries
    ]
