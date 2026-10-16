"""AT-03/04/22/39 canonical identity, projections, real rollback and races."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from typing import cast
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import event, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contacts.access import ContactConflict
from app.contacts.commands import command
from app.contacts.contracts import (
    EditContact,
    EditEnquiry,
    ListQuery,
    NewContact,
    NewEnquiry,
    normalize_phone,
)
from app.contacts.models import (
    Contact,
    ContactCollaborator,
    ContactEmail,
    ContactPhone,
    Enquiry,
    IdempotencyRecord,
)
from app.contacts.queries import assignment_options, read_detail, read_list, resolve_phone
from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, AuditEvent
from app.identity.security import IdentityError, csrf_token
from app.main import create_app
from app.settings import Settings
from tests.contact_support import actor, create_lead, new_lead
from tests.identity_support import create_actor, observe_two_lock_waiters
from tests.test_auth import authority
from tests.test_foundation import client_for

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize(
    ("raw", "canonical"),
    [
        ("+212 600-000-001", "+212600000001"),
        ("00212 600000001", "+212600000001"),
        ("+33 6 00 00 00 02", "+33600000002"),
        ("+1 (202) 555-0101", "+12025550101"),
        ("+44 20 7946 0018", "+442079460018"),
    ],
)
def test_international_metadata_normalization(raw: str, canonical: str) -> None:
    assert normalize_phone(raw) == canonical


@pytest.mark.parametrize(
    "raw",
    [
        "0600000001",
        "+999600000001",
        "+212123",
        "Tel +212600000001",
        "+212600000001 ext 2",
        "+212600000001<script>",
        "",
    ],
)
def test_invalid_phone_rejected(raw: str) -> None:
    with pytest.raises(IdentityError, match="INVALID_PHONE"):
        normalize_phone(raw)


@pytest.mark.parametrize(
    "patch",
    [
        {"name": " "},
        {"phones": []},
        {"phones": [{"number": "+212600000001", "is_primary": False}]},
        {
            "phones": [
                {"number": "+212600000001", "is_primary": True},
                {"number": "+33600000002", "is_primary": True},
            ]
        },
        {
            "phones": [
                {"number": "+212600000001", "is_primary": True},
                {"number": "00212600000001", "is_primary": False},
            ]
        },
        {"emails": [{"email": "contact@example.com", "is_primary": False}]},
        {"roles": ["administrator"]},
        {"roles": ["buyer", "buyer"]},
    ],
)
def test_required_and_collection_choices(patch: dict[str, object]) -> None:
    data = new_lead().new_contact
    assert data is not None
    with pytest.raises(ValidationError):
        NewContact.model_validate({**data.model_dump(mode="json"), **patch})


def test_contact_collections_edit_provenance_and_separate_enquiries(
    settings: Settings, database: Database
) -> None:
    uid, token = actor(settings, database)
    body = new_lead(
        new_contact={
            "name": "SP05 organisation synthétique",
            "type": "organization",
            "phones": [
                {"number": "+212600000001", "is_primary": False},
                {"number": "+33600000002", "is_primary": True},
            ],
            "emails": [
                {"email": "ONE@EXAMPLE.COM", "is_primary": False},
                {"email": "two@example.com", "is_primary": True},
            ],
            "roles": ["buyer", "seller", "owner", "tenant", "developer"],
        },
        source_submission_id=str(uuid4()),
    )
    lead = create_lead(settings, database, token, body)
    cid = UUID(cast(dict[str, str], lead["contact"])["id"])
    contact = read_detail(database, token, "contacts", cid)
    assert (
        contact["primary_phone"] == "+33600000002" and contact["primary_email"] == "two@example.com"
    )
    assert len(cast(list[object], contact["roles"])) == 5 and contact["created_by_user_id"] == str(
        uid
    )
    assert contact["source"] == "phone" and contact["source_submission_id"] == str(
        body.source_submission_id
    )
    original = contact.copy()
    edited = command(
        database,
        token,
        "synthetic-secret",
        uuid4(),
        "contacts",
        EditContact.model_validate(
            {
                "name": "SP05 identité modifiée",
                "type": "person",
                "expected_version": 1,
                "phones": [
                    {"number": "+212600000001", "is_primary": True},
                    {"number": "+33600000002", "is_primary": False},
                ],
                "emails": [],
                "roles": ["tenant"],
            }
        ),
        cid,
    )
    assert (
        edited["version"] == 2
        and edited["source"] == original["source"]
        and edited["primary_email"] is None
    )
    with database.session() as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(ContactPhone)
                .where(ContactPhone.archived_at.is_not(None))
            )
            == 2
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(ContactEmail)
                .where(ContactEmail.archived_at.is_not(None))
            )
            == 2
        )
    second = create_lead(
        settings, database, token, NewEnquiry(contact_id=cid, message="Deuxième demande")
    )
    assert lead["id"] != second["id"]
    assert read_list(database, token, "contacts", ListQuery())["total"] == 1
    assert read_list(database, token, "enquiries", ListQuery())["total"] == 2
    same_name = create_lead(settings, database, token, new_lead("+212600000009"))
    assert cast(dict[str, object], same_name["contact"])["id"] != str(cid)


def test_duplicate_warning_private_disclosure_and_scope(
    settings: Settings, database: Database
) -> None:
    a, ta = actor(settings, database)
    b, tb = actor(settings, database)
    _, tm = actor(settings, database, "manager")
    one = create_lead(settings, database, ta)
    private = create_lead(settings, database, tb, new_lead("+33600000002"))
    cid = UUID(cast(dict[str, str], private["contact"])["id"])
    with pytest.raises(ContactConflict) as duplicate:
        create_lead(settings, database, ta)
    assert duplicate.value.code == "DUPLICATE_CONFIRMATION_REQUIRED"
    assert duplicate.value.details == {
        "contacts": [
            {
                "id": cast(dict[str, object], one["contact"])["id"],
                "name": "SP05 contact synthétique",
            }
        ]
    }
    for operation in (
        lambda: create_lead(settings, database, ta, new_lead("+33600000002")),
        lambda: resolve_phone(database, ta, "+33600000002"),
    ):
        with pytest.raises(ContactConflict) as denied:
            operation()
        assert denied.value.code == "PHONE_OWNED_ELSEWHERE"
        assert denied.value.details == {
            "responsible_agent": {"display_name": "Compte synthétique de contrôle"}
        }
    for kind, target in (("contacts", cid), ("enquiries", UUID(str(private["id"])))):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            read_detail(database, ta, kind, target)
    for query in (
        ListQuery(),
        ListQuery(q="+33600000002"),
        ListQuery(q="SP05", assigned_agent_id=b),
        ListQuery(page=90),
    ):
        listed = read_list(database, ta, "enquiries", query)
        assert str(private["id"]) not in str(listed) and str(cid) not in str(listed)
    assert read_list(database, ta, "contacts", ListQuery(q="+33600000002"))["total"] == 0
    assert read_list(database, tm, "enquiries", ListQuery())["total"] == 2
    with database.session() as session, session.begin():
        session.add(
            ContactCollaborator(
                contact_id=cid,
                user_id=a,
            )
        )
    assert read_detail(database, ta, "contacts", cid)["id"] == str(cid)


@pytest.mark.parametrize("role", ["manager", "administrator"])
def test_owner_assignment_options_and_unassigned_queue(
    settings: Settings, database: Database, role: str
) -> None:
    uid, ta = actor(settings, database)
    other, _ = actor(settings, database)
    _, tm = actor(settings, database, role)
    create_actor(settings, database, role="agent", restricted=True)
    options = assignment_options(database, tm, ListQuery())
    assert len(cast(list[object], options["items"])) == 2
    lead = create_lead(
        settings,
        database,
        tm,
        new_lead(
            new_contact={
                "name": "SP05 assigné",
                "phones": [{"number": "+212600000001", "is_primary": True}],
                "primary_agent_id": str(uid),
            },
            assigned_agent_id=str(uid),
        ),
    )
    assert cast(dict[str, str], lead["assigned_agent"])["id"] == str(uid)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        create_lead(settings, database, ta, new_lead("+212600000005", assigned_agent_id=str(other)))
    with pytest.raises(IdentityError, match="INVALID_ASSIGNEE"):
        create_lead(settings, database, tm, new_lead("+212600000006"))
    with pytest.raises(IdentityError, match="INVALID_ASSIGNEE"):
        create_lead(
            settings,
            database,
            tm,
            NewEnquiry(
                contact_id=UUID(cast(dict[str, str], lead["contact"])["id"]),
                assigned_agent_id=other,
            ),
        )
    queue = create_lead(
        settings,
        database,
        tm,
        NewEnquiry(contact_id=UUID(cast(dict[str, str], lead["contact"])["id"])),
    )
    assert queue["assigned_agent"] is None
    assert read_list(database, ta, "enquiries", ListQuery())["total"] == 1
    assert read_list(database, tm, "enquiries", ListQuery())["total"] == 2


def test_versions_retry_source_uniqueness_and_current_scope(
    settings: Settings, database: Database
) -> None:
    uid, token = actor(settings, database)
    other, _ = actor(settings, database)
    key, submission = uuid4(), uuid4()
    body = new_lead(source_submission_id=str(submission))
    lead = create_lead(settings, database, token, body, key)
    assert create_lead(settings, database, token, body, key) == lead
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        create_lead(settings, database, token, new_lead(message="Autre intention"), key)
    with pytest.raises(IdentityError, match="SOURCE_SUBMISSION_CONFLICT"):
        create_lead(settings, database, token, body)
    target = UUID(str(lead["id"]))
    patch = EditEnquiry(expected_version=1, message="Mise à jour", status="in_progress")
    edited = command(database, token, "synthetic-secret", uuid4(), "enquiries", patch, target)
    assert edited["version"] == 2 and edited["source_submission_id"] == str(submission)
    with pytest.raises(ContactConflict) as stale:
        command(database, token, "synthetic-secret", uuid4(), "enquiries", patch, target)
    assert cast(dict[str, object], stale.value.details["current"])["version"] == 2
    cid = UUID(cast(dict[str, str], lead["contact"])["id"])
    with database.session() as session, session.begin():
        session.execute(update(Contact).where(Contact.id == cid).values(primary_agent_id=other))
        session.execute(
            update(Enquiry).where(Enquiry.contact_id == cid).values(assigned_agent_id=None)
        )
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        create_lead(settings, database, token, body, key)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Enquiry)) == 1
        assert (
            session.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.actor_user_id == uid, AuditEvent.action.like("enquiries.%"))
            )
            == 2
        )


def test_atomic_interruption_after_insert_and_retry(settings: Settings, database: Database) -> None:
    _, token = actor(settings, database)
    key = uuid4()

    def interrupt(session: Session, context: object) -> None:
        if any(
            isinstance(value, AuditEvent) and value.action == "enquiries.created"
            for value in session.new
        ):
            raise RuntimeError("SYNTHETIC_INTERRUPTION")

    event.listen(database.sessions, "after_flush", interrupt)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_INTERRUPTION"):
            create_lead(settings, database, token, key=key)
    finally:
        event.remove(database.sessions, "after_flush", interrupt)
    with database.session() as session:
        for model in (Contact, ContactPhone, Enquiry, IdempotencyRecord):
            assert session.scalar(select(func.count()).select_from(model)) == 0
    lead = create_lead(settings, database, token, key=key)
    assert create_lead(settings, database, token, key=key) == lead


@pytest.mark.parametrize("same_key", [False, True])
def test_actual_concurrent_phone_claim_and_retry(
    settings: Settings, database: Database, same_key: bool
) -> None:
    _, token = actor(settings, database)
    key = uuid4()

    def submit() -> str:
        try:
            return str(
                create_lead(settings, database, token, key=key if same_key else uuid4())["id"]
            )
        except ContactConflict as conflict:
            return conflict.code

    with database.session() as blocker, blocker.begin():
        blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        with ThreadPoolExecutor(2) as executor:
            futures = [executor.submit(submit) for _ in range(2)]
            observe_two_lock_waiters(database, "agency")
            blocker.commit()
            results = [future.result() for future in futures]
    assert (
        results[0] == results[1]
        if same_key
        else results.count("DUPLICATE_CONFIRMATION_REQUIRED") == 1
    )
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Contact)) == 1
        assert session.scalar(select(func.count()).select_from(Enquiry)) == 1


def test_database_checks_independent_of_http(settings: Settings, database: Database) -> None:
    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    cid = UUID(cast(dict[str, str], lead["contact"])["id"])
    other, _ = actor(settings, database)
    for mutate in (
        lambda session: session.execute(
            update(ContactPhone).where(ContactPhone.contact_id == cid).values(is_primary=False)
        ),
        lambda session: session.execute(update(Enquiry).values(assigned_agent_id=other)),
    ):
        with pytest.raises(IntegrityError):
            with database.session() as session, session.begin():
                mutate(session)
    assert read_detail(database, token, "contacts", cid)["primary_phone"] == "+212600000001"


def test_scoped_filters_stable_pages_dates_and_literal_search(
    settings: Settings, database: Database
) -> None:
    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    cid = UUID(cast(dict[str, str], lead["contact"])["id"])
    for _ in range(5):
        create_lead(settings, database, token, NewEnquiry(contact_id=cid, source="email"))
    first = read_list(database, token, "enquiries", ListQuery(page_size=2, sort="name"))
    second = read_list(database, token, "enquiries", ListQuery(page=2, page_size=2, sort="name"))
    assert first == read_list(database, token, "enquiries", ListQuery(page_size=2, sort="name"))
    assert first["total"] == 6 and first["has_next"] and second["has_previous"]
    assert {row["id"] for row in cast(list[dict[str, str]], first["items"])}.isdisjoint(
        row["id"] for row in cast(list[dict[str, str]], second["items"])
    )
    assert read_list(database, token, "enquiries", ListQuery(source="email"))["total"] == 5
    assert read_list(database, token, "enquiries", ListQuery(q="6000000"))["total"] == 6
    assert read_list(database, token, "enquiries", ListQuery(q="%"))["total"] == 0
    assert read_list(database, token, "enquiries", ListQuery(page=999))["total"] == 6
    tomorrow = (datetime.now(UTC) + timedelta(days=2)).date()
    assert read_list(database, token, "enquiries", ListQuery(received_from=tomorrow))["total"] == 0
    with database.session() as session, session.begin():
        session.execute(
            update(IdempotencyRecord).values(created_at=datetime.now(UTC) - timedelta(days=2))
        )
    create_lead(settings, database, token, NewEnquiry(contact_id=cid))
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(IdempotencyRecord)) == 1


@pytest.mark.anyio
async def test_http_strictness_transport_private_errors_and_current_role(
    settings: Settings, database: Database, caplog: pytest.LogCaptureFixture
) -> None:
    _, token = actor(settings, database)
    _, private_token = actor(settings, database)
    private = create_lead(settings, database, private_token, new_lead("+33600000002"))
    headers = {
        **authority(settings),
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
        "Idempotency-Key": str(uuid4()),
    }
    async with client_for(create_app(settings)) as client:
        for path in ("contacts", "enquiries", "contacts/assignment-options"):
            assert (await client.get(f"/api/v1/{path}")).status_code == 403
        for bad in ({**headers, "Origin": "null"}, {**headers, "X-CSRF-Token": "bad"}):
            assert (
                await client.post(
                    "/api/v1/enquiries", headers=bad, json=new_lead().model_dump(mode="json")
                )
            ).status_code == 403
        for data in (
            {},
            {
                "contact_id": str(uuid4()),
                "new_contact": new_lead().model_dump(mode="json")["new_contact"],
            },
            {**new_lead().model_dump(mode="json"), "primary_agent_id": str(uuid4())},
            {**new_lead().model_dump(mode="json"), "source": "kay_website"},
        ):
            assert (
                await client.post("/api/v1/enquiries", headers=headers, json=data)
            ).status_code == 422
        result = await client.post(
            "/api/v1/enquiries",
            headers=headers,
            json=new_lead("+33600000002").model_dump(mode="json"),
        )
        assert result.status_code == 409 and set(result.json()) == {"error", "responsible_agent"}
        assert set(result.json()["responsible_agent"]) == {"display_name"}
        assert str(private["id"]) not in result.text and "+33600000002" not in result.text
        assert (
            await client.get("/api/v1/enquiries?page=1&page=2", headers=headers)
        ).status_code == 422
        assert (await client.get("/api/v1/enquiries?unknown=x", headers=headers)).status_code == 422
        assert (
            await client.get("/api/v1/contacts/assignment-options", headers=headers)
        ).status_code == 403
        good = await client.post(
            "/api/v1/enquiries", headers=headers, json=new_lead().model_dump(mode="json")
        )
        assert good.status_code == 200 and good.headers["cache-control"] == "no-store"
        missing = await client.get(f"/api/v1/enquiries/{private['id']}", headers=headers)
        assert missing.status_code == 404 and set(missing.json()) == {"error"}
    assert "+212600000001" not in caplog.text and "+33600000002" not in caplog.text
