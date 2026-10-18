"""Independent database constraints and hostile/stale transport variants for SP-05."""

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from typing import cast
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.contacts.commands import command
from app.contacts.contracts import EditContact, NewContact, NewEnquiry
from app.contacts.models import Contact, ContactPhone, Enquiry
from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError, csrf_token
from app.main import create_app
from app.settings import Settings
from tests.contact_support import actor, create_lead, new_lead
from tests.identity_support import observe_two_lock_waiters
from tests.test_auth import authority
from tests.test_foundation import client_for

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_unique_phone_survives_two_independent_unserialized_database_transactions(
    settings: Settings, database: Database
) -> None:
    uid, _ = actor(settings, database)
    synchronize = Barrier(2)

    def claim() -> str:
        try:
            with database.session() as session, session.begin():
                contact = Contact(
                    name="SP05 course synthétique",
                    type="person",
                    primary_agent_id=uid,
                    created_by_user_id=uid,
                    source="manual",
                )
                session.add(contact)
                session.flush()
                synchronize.wait(timeout=5)
                session.add(
                    ContactPhone(
                        origin_contact_id=contact.id,
                        contact_id=contact.id,
                        normalized="+212600000001",
                        label="",
                        is_primary=True,
                        created_by_user_id=uid,
                    )
                )
            return "created"
        except IntegrityError:
            return "unique-conflict"

    with ThreadPoolExecutor(2) as executor:
        results = list(executor.map(lambda _: claim(), range(2)))
    assert sorted(results) == ["created", "unique-conflict"]
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Contact)) == 1
        assert session.scalar(select(func.count()).select_from(ContactPhone)) == 1


def test_waiting_business_writes_recheck_revoked_actor(
    settings: Settings, database: Database
) -> None:
    uid, token = actor(settings, database)

    def submit() -> str:
        try:
            create_lead(settings, database, token)
            return "unexpected-success"
        except IdentityError as error:
            return error.code

    with database.session() as blocker, blocker.begin():
        blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        with ThreadPoolExecutor(2) as executor:
            futures = [executor.submit(submit) for _ in range(2)]
            observe_two_lock_waiters(database, "agency")
            blocker.execute(update(User).where(User.id == uid).values(version=User.version + 1))
            blocker.commit()
            assert [future.result() for future in futures] == ["UNAUTHENTICATED", "UNAUTHENTICATED"]
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Contact)) == 0


def test_invalid_assignment_rolls_back_new_contact_and_enquiry(
    settings: Settings, database: Database
) -> None:
    _, token = actor(settings, database)
    other, _ = actor(settings, database)
    for body in (
        new_lead(assigned_agent_id=str(other)),
        new_lead(
            new_contact={
                "name": "SP05 propriétaire interdit",
                "phones": [{"number": "+212600000001", "is_primary": True}],
                "primary_agent_id": str(other),
            }
        ),
    ):
        with pytest.raises(IdentityError, match="FORBIDDEN"):
            create_lead(settings, database, token, body)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Contact)) == 0
        assert session.scalar(select(func.count()).select_from(Enquiry)) == 0


def test_contact_create_retry_and_real_concurrent_versions(
    settings: Settings, database: Database
) -> None:
    _, token = actor(settings, database)
    body = cast(NewContact, new_lead().new_contact)
    key = uuid4()
    contact = command(database, token, "synthetic-secret", key, "contacts", body)
    assert command(database, token, "synthetic-secret", key, "contacts", body) == contact
    target = UUID(str(contact["id"]))
    patch = EditContact.model_validate(
        {
            **body.model_dump(exclude={"primary_agent_id"}),
            "expected_version": 1,
            "name": "SP05 course de version",
        }
    )

    def save() -> str:
        try:
            command(database, token, "synthetic-secret", uuid4(), "contacts", patch, target)
            return "saved"
        except IdentityError as error:
            return error.code

    with database.session() as blocker, blocker.begin():
        blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        with ThreadPoolExecutor(2) as executor:
            futures = [executor.submit(save) for _ in range(2)]
            observe_two_lock_waiters(database, "agency")
            blocker.commit()
            assert sorted(future.result() for future in futures) == ["VERSION_CONFLICT", "saved"]


@pytest.mark.anyio
async def test_every_contact_http_route_and_immutable_provenance(
    settings: Settings, database: Database
) -> None:
    uid, token = actor(settings, database)
    _, manager = actor(settings, database, "manager")

    def proof(value: str) -> dict[str, str]:
        return {
            **authority(settings),
            "X-Kay-Session": value,
            "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), value),
            "Idempotency-Key": str(uuid4()),
        }

    async with client_for(create_app(settings)) as client:
        headers = proof(token)
        data = cast(NewContact, new_lead().new_contact).model_dump(mode="json")
        created = await client.post("/api/v1/contacts", headers=headers, json=data)
        assert created.status_code == 200
        cid = created.json()["id"]
        assert (await client.get("/api/v1/contacts?q=6000000&sort=name", headers=headers)).json()[
            "total"
        ] == 1
        assert (await client.get(f"/api/v1/contacts/{cid}", headers=headers)).status_code == 200
        updated = await client.patch(
            f"/api/v1/contacts/{cid}",
            headers=proof(token),
            json={**data, "primary_agent_id": None, "expected_version": 1},
        )
        assert updated.status_code == 422
        updated = await client.patch(
            f"/api/v1/contacts/{cid}",
            headers=proof(token),
            json={
                **{key: value for key, value in data.items() if key != "primary_agent_id"},
                "expected_version": 1,
            },
        )
        assert updated.status_code == 200 and updated.json()["version"] == 2
        lead = await client.post(
            "/api/v1/enquiries",
            headers=proof(token),
            json=NewEnquiry(initial_budget="500000", contact_id=cid).model_dump(mode="json"),
        )
        assert lead.status_code == 200
        eid = lead.json()["id"]
        assert (await client.get(f"/api/v1/enquiries/{eid}", headers=headers)).status_code == 200
        patched = await client.patch(
            f"/api/v1/enquiries/{eid}",
            headers=proof(token),
            json={
                "expected_version": 1,
                "message": "SP05 mise à jour",
                "status": "closed",
                "initial_budget": "500000",
                "campaign_source": "unknown",
                "rating": "cold",
            },
        )
        assert patched.status_code == 200
        for extra in (
            {"source": "email"},
            {"contact_id": str(uuid4())},
            {"assigned_agent_id": str(uid)},
            {"created_by_user_id": str(uid)},
        ):
            denied = await client.patch(
                f"/api/v1/enquiries/{eid}",
                headers=proof(token),
                json={
                    "expected_version": 2,
                    "message": "SP05",
                    "status": "closed",
                    "initial_budget": "500000",
                    "campaign_source": "unknown",
                    "rating": "cold",
                    **extra,
                },
            )
            assert denied.status_code == 422
        available = await client.post(
            "/api/v1/contacts/resolve-phone", headers=headers, json={"phone": "+33600000002"}
        )
        assert available.json() == {"available": True}
        assert (
            await client.get(
                "/api/v1/contacts/assignment-options?page_size=10", headers=proof(manager)
            )
        ).json()["total"] == 1
        assert (
            await client.get(
                "/api/v1/contacts/assignment-options?sort=name", headers=proof(manager)
            )
        ).status_code == 422
        assert (await client.get("/api/v1/contacts?status=new", headers=headers)).status_code == 422
        assert (
            await client.post(
                "/api/v1/enquiries",
                headers={**headers, "Idempotency-Key": "bad"},
                json=new_lead().model_dump(mode="json"),
            )
        ).status_code == 422


@pytest.mark.anyio
async def test_unicode_maximum_message_and_body_limit(
    settings: Settings, database: Database
) -> None:
    _, token = actor(settings, database)
    headers = {
        **authority(settings),
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
        "Idempotency-Key": str(uuid4()),
    }
    async with client_for(create_app(settings)) as client:
        response = await client.post(
            "/api/v1/enquiries",
            headers=headers,
            json=new_lead(message="界" * 4000).model_dump(mode="json"),
        )
        assert response.status_code == 200
        oversized = await client.post("/api/v1/enquiries", headers=headers, content=b" " * 32769)
        assert (
            oversized.status_code == 413 and oversized.json()["error"]["code"] == "VALIDATION_ERROR"
        )
