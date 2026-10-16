"""Batched current account eligibility for ownership impact and linked assignments."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contacts.models import Contact, ContactCollaborator
from app.identity.models import Credential, User
from app.identity.sessions import credential_active


def accounts(session: Session, ids: set[UUID]) -> dict[UUID, tuple[User, Credential]]:
    return {
        user.id: (user, credential)
        for user, credential in session.execute(
            select(User, Credential).join(Credential).where(User.id.in_(ids)).order_by(User.id)
        )
    }


def eligible(user: User, credential: Credential) -> bool:
    return not credential.must_change_password and credential_active(
        user, credential, datetime.now(UTC)
    )


def valid_assignees(session: Session, contact: Contact, ids: set[UUID]) -> set[UUID]:
    grants = set(
        session.scalars(
            select(ContactCollaborator.user_id).where(
                ContactCollaborator.contact_id == contact.id,
                ContactCollaborator.revoked_at.is_(None),
            )
        )
    )
    return {
        uid
        for uid, (user, credential) in accounts(session, ids).items()
        if eligible(user, credential)
        and (user.role != "agent" or uid == contact.primary_agent_id or uid in grants)
    }
