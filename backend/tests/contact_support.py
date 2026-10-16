"""Synthetic contact workflow helpers using the real service boundary."""

from uuid import UUID, uuid4

from app.contacts.commands import command
from app.contacts.contracts import NewEnquiry
from app.db.session import Database
from app.identity.service import login
from app.settings import Settings
from tests.identity_support import create_actor


def actor(settings: Settings, database: Database, role: str = "agent") -> tuple[UUID, str]:
    uid, email, password = create_actor(settings, database, role=role)
    token, _ = login(database, settings.facade_secret.get_secret_value(), email, password)
    return uid, token


def new_lead(phone: str = "+212600000001", **values: object) -> NewEnquiry:
    return NewEnquiry.model_validate(
        {
            "new_contact": {
                "name": "SP05 contact synthétique",
                "phones": [{"number": phone, "is_primary": True}],
                "roles": ["buyer", "owner"],
            },
            "message": "Demande synthétique uniquement",
            "source": "phone",
            **values,
        }
    )


def create_lead(
    settings: Settings,
    database: Database,
    token: str,
    body: NewEnquiry | None = None,
    key: UUID | None = None,
) -> dict[str, object]:
    return command(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        key or uuid4(),
        "enquiries",
        body or new_lead(),
    )
