"""SP-06/AT-04/05/24: real scope changes, preserved actors and atomic merges."""

from concurrent.futures import ThreadPoolExecutor
from typing import cast
from uuid import UUID, uuid4

import pytest
from sqlalchemy import delete, event, func, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contacts.contracts import ListQuery, NewEnquiry
from app.contacts.history import read_history
from app.contacts.history_models import AssignmentEvent, TimelineEvent
from app.contacts.models import (
    Contact,
    ContactCollaborator,
    ContactPhone,
    Enquiry,
    IdempotencyRecord,
)
from app.contacts.ownership import mutate, preview
from app.contacts.ownership_contracts import (
    ChangeIntent,
    ConfirmedChange,
    EnquiryAssignment,
    NewNote,
)
from app.contacts.queries import read_detail, read_list
from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError
from app.settings import Settings
from tests.contact_support import actor, create_lead, new_lead
from tests.identity_support import observe_two_lock_waiters

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def cid(lead: dict[str, object]) -> UUID:
    return UUID(cast(dict[str, str], lead["contact"])["id"])


def intent(operation: str, version: int = 1, **fields: object) -> ChangeIntent:
    return ChangeIntent.model_validate(
        {
            "operation": operation,
            "expected_version": version,
            "reason": "Contrôle synthétique SP06",
            **fields,
        }
    )


def confirmation(
    settings: Settings, database: Database, token: str, target: UUID, body: ChangeIntent
) -> ConfirmedChange:
    result = preview(database, token, settings.facade_secret.get_secret_value(), target, body)
    return ConfirmedChange.model_validate(
        {
            **body.model_dump(mode="json", exclude_unset=True),
            "preview_token": result["preview_token"],
        }
    )


def change(
    settings: Settings, database: Database, token: str, target: UUID, body: ChangeIntent
) -> dict[str, object]:
    confirmed = confirmation(settings, database, token, target, body)
    return mutate(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        target,
        confirmed,
        body.operation,
    )


def note(
    settings: Settings,
    database: Database,
    token: str,
    target: UUID,
    kind: str = "note",
    key: UUID | None = None,
) -> dict[str, object]:
    return mutate(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        key or uuid4(),
        target,
        NewNote.model_validate({"kind": kind, "body": "Contribution synthétique"}),
        "notes",
    )


def test_collaboration_transfer_current_denial_and_exact_authors(
    settings: Settings, database: Database
) -> None:
    a, at = actor(settings, database)
    b, bt = actor(settings, database)
    manager, mt = actor(settings, database, "manager")
    lead = create_lead(settings, database, at)
    target = cid(lead)
    change(settings, database, mt, target, intent("collaborators", collaborator_ids=[str(b)]))
    key = uuid4()
    first = note(settings, database, bt, target, key=key)
    assert note(settings, database, bt, target, key=key) == first
    note(settings, database, bt, target, kind="call")
    before = read_history(database, bt, target, "timeline", 1, 100)
    transfer_intent = intent("assign", 2, primary_agent_id=str(b))
    planned = preview(
        database, mt, settings.facade_secret.get_secret_value(), target, transfer_intent
    )
    assert cast(dict[str, dict[str, str]], planned["impact"])["primary_agent_after"]["id"] == str(b)
    result = change(settings, database, mt, target, transfer_intent)
    assert result["version"] == 3
    for kind, rid in (("contacts", target), ("enquiries", UUID(str(lead["id"])))):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            read_detail(database, at, kind, rid)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_history(database, at, target, "timeline", 1, 50)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        note(settings, database, at, target)
    history = cast(
        list[dict[str, object]], read_history(database, bt, target, "timeline", 1, 100)["items"]
    )
    assert all(item in history for item in cast(list[dict[str, object]], before["items"]))
    assert {str(cast(dict[str, str], item["actor"])["id"]) for item in history} == {
        str(a),
        str(b),
        str(manager),
    }
    assignments = cast(
        list[dict[str, object]],
        read_history(database, bt, target, "assignment-events", 1, 100)["items"],
    )
    transfer = next(item for item in assignments if item["action"] == "primary")
    assert cast(dict[str, str], transfer["previous_user"])["id"] == str(a)
    assert cast(dict[str, str], transfer["new_user"])["id"] == str(b)
    with database.session() as session:
        enquiry = session.get(Enquiry, UUID(str(lead["id"])))
        assert enquiry and enquiry.assigned_agent_id is None and enquiry.version == 2
    # The manager can explicitly recover the queue assignment only to a scoped account.
    mutate(
        database,
        mt,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        UUID(str(lead["id"])),
        EnquiryAssignment(expected_version=2, assigned_agent_id=b, reason="Reprise synthétique"),
        "enquiry-assign",
    )
    assert read_detail(database, bt, "enquiries", UUID(str(lead["id"])))["id"] == lead["id"]


def test_retention_then_collaborator_removal_and_retry_denial(
    settings: Settings, database: Database
) -> None:
    a, at = actor(settings, database)
    b, _ = actor(settings, database)
    _, mt = actor(settings, database, "manager")
    target = cid(create_lead(settings, database, at))
    change(
        settings,
        database,
        mt,
        target,
        intent("assign", primary_agent_id=str(b), retain_previous=True),
    )
    key = uuid4()
    note(settings, database, at, target, key=key)
    change(settings, database, mt, target, intent("collaborators", 2, collaborator_ids=[]))
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        note(settings, database, at, target, key=key)
    with database.session() as session:
        grant = session.get(ContactCollaborator, (target, a))
        assert grant and grant.revoked_at


def test_archive_restore_same_links_history_and_no_expiry(
    settings: Settings, database: Database
) -> None:
    _, at = actor(settings, database)
    _, mt = actor(settings, database, "manager")
    lead = create_lead(settings, database, at)
    target = cid(lead)
    note(settings, database, at, target)
    change(settings, database, mt, target, intent("archive"))
    archived = read_detail(database, mt, "contacts", target)
    assert archived["archived_at"]
    assert read_detail(database, mt, "enquiries", UUID(str(lead["id"])))["id"] == lead["id"]
    assert read_list(database, mt, "contacts", ListQuery(archive="archived"))["total"] == 1
    for call in (
        lambda: read_detail(database, at, "contacts", target),
        lambda: read_list(database, at, "contacts", ListQuery(archive="all")),
        lambda: note(settings, database, mt, target),
    ):
        with pytest.raises(IdentityError):
            call()
    change(settings, database, mt, target, intent("restore", 2))
    assert read_detail(database, at, "contacts", target)["id"] == str(target)
    assert read_history(database, at, target, "timeline", 1, 100)["total"] == 5
    with database.session() as session:
        assert session.get(Enquiry, UUID(str(lead["id"]))).contact_id == target  # type: ignore[union-attr]


@pytest.mark.parametrize("model", [TimelineEvent, AssignmentEvent])
def test_history_immutable_update_delete_and_actor_fk(
    settings: Settings, database: Database, model: type[TimelineEvent] | type[AssignmentEvent]
) -> None:
    a, at = actor(settings, database)
    b, _ = actor(settings, database)
    _, mt = actor(settings, database, "manager")
    target = cid(create_lead(settings, database, at))
    change(settings, database, mt, target, intent("assign", primary_agent_id=str(b)))
    for statement in (update(model).values(actor_user_id=a), delete(model)):
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.execute(statement)
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(delete(User).where(User.id == a))


def test_same_scope_merge_provenance_links_retry_and_original_history(
    settings: Settings, database: Database
) -> None:
    a, at = actor(settings, database)
    first = create_lead(settings, database, at)
    second = create_lead(settings, database, at, new_lead("+33600000002"))
    source, survivor = cid(first), cid(second)
    note(settings, database, at, source)
    body = confirmation(
        settings,
        database,
        at,
        source,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    key = uuid4()
    secret = settings.facade_secret.get_secret_value()
    result = mutate(database, at, secret, key, source, body, "merge")
    assert mutate(database, at, secret, key, source, body, "merge") == result
    assert read_detail(database, at, "contacts", source)["id"] == str(survivor)
    assert len(cast(list[object], read_detail(database, at, "contacts", survivor)["phones"])) == 2
    enquiry = read_detail(database, at, "enquiries", UUID(str(first["id"])))
    assert enquiry["origin_contact_id"] == str(source)
    assert cast(dict[str, str], enquiry["contact"])["id"] == str(survivor)
    with database.session() as session:
        original = session.get(Contact, source)
        assert original and original.archived_at and original.merged_into_contact_id == survivor
        assert original.created_by_user_id == a
        phone = session.scalar(
            select(ContactPhone).where(
                ContactPhone.contact_id == survivor, ContactPhone.origin_contact_id == source
            )
        )
        assert phone and phone.created_by_user_id == a
        assert (
            session.scalar(
                select(func.count())
                .select_from(ContactPhone)
                .where(ContactPhone.contact_id == source)
            )
            == 1
        )
    history = cast(
        list[dict[str, object]], read_history(database, at, survivor, "timeline", 1, 100)["items"]
    )
    assert any(item["action"] == "note" and item["contact_id"] == str(source) for item in history)


def test_cross_portfolio_merge_manager_confirmation_no_grant_union(
    settings: Settings, database: Database
) -> None:
    _, at = actor(settings, database)
    b, bt = actor(settings, database)
    c, ct = actor(settings, database)
    _, mt = actor(settings, database, "manager")
    source = cid(create_lead(settings, database, at))
    survivor = cid(create_lead(settings, database, bt, new_lead("+33600000002")))
    change(settings, database, mt, source, intent("collaborators", collaborator_ids=[str(c)]))
    body = intent("merge", 2, survivor_id=str(survivor), survivor_expected_version=1)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        confirmation(settings, database, at, source, body)
    change(settings, database, mt, source, body)
    for token in (at, ct):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            read_detail(database, token, "contacts", source)
    assert read_detail(database, bt, "contacts", survivor)["collaborators"] == []
    with database.session() as session:
        assert session.get(Contact, survivor).primary_agent_id == b  # type: ignore[union-attr]


def test_stale_impact_link_and_both_versions_leave_originals(
    settings: Settings, database: Database
) -> None:
    _, at = actor(settings, database)
    source = cid(create_lead(settings, database, at))
    survivor = cid(create_lead(settings, database, at, new_lead("+33600000002")))
    body = confirmation(
        settings,
        database,
        at,
        source,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    create_lead(settings, database, at, NewEnquiry(initial_budget="500000", contact_id=source))
    with pytest.raises(IdentityError, match="IMPACT_CHANGED"):
        mutate(
            database, at, settings.facade_secret.get_secret_value(), uuid4(), source, body, "merge"
        )
    for source_version, target_version in ((2, 1), (1, 2)):
        with pytest.raises(IdentityError, match="OWNERSHIP_VERSION_CONFLICT"):
            confirmation(
                settings,
                database,
                at,
                source,
                intent(
                    "merge",
                    source_version,
                    survivor_id=str(survivor),
                    survivor_expected_version=target_version,
                ),
            )
    with database.session() as session:
        assert (
            session.scalar(
                select(func.count()).select_from(Contact).where(Contact.archived_at.is_(None))
            )
            == 2
        )


def test_merge_interruption_rolls_back_identity_links_history_receipt(
    settings: Settings, database: Database
) -> None:
    _, at = actor(settings, database)
    source = cid(create_lead(settings, database, at))
    survivor = cid(create_lead(settings, database, at, new_lead("+33600000002")))
    body = confirmation(
        settings,
        database,
        at,
        source,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )

    def interrupt(session: Session, *_: object) -> None:
        if any(
            isinstance(row, TimelineEvent) and row.action == "contacts.merge" for row in session.new
        ):
            raise RuntimeError("SYNTHETIC_MERGE_INTERRUPTION")

    event.listen(Session, "before_flush", interrupt)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_MERGE_INTERRUPTION"):
            mutate(
                database,
                at,
                settings.facade_secret.get_secret_value(),
                uuid4(),
                source,
                body,
                "merge",
            )
    finally:
        event.remove(Session, "before_flush", interrupt)
    with database.session() as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(ContactPhone)
                .where(ContactPhone.archived_at.is_(None))
            )
            == 2
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(TimelineEvent)
                .where(TimelineEvent.action == "contacts.merge")
            )
            == 0
        )
        assert session.scalar(select(func.count()).select_from(IdempotencyRecord)) == 2
    assert read_detail(database, at, "contacts", source)["version"] == 1


def test_transfer_race_separate_connections_one_effect(
    settings: Settings, database: Database
) -> None:
    _, at = actor(settings, database)
    b, _ = actor(settings, database)
    c, _ = actor(settings, database)
    _, mt = actor(settings, database, "manager")
    target = cid(create_lead(settings, database, at))
    bodies = [
        confirmation(settings, database, mt, target, intent("assign", primary_agent_id=str(uid)))
        for uid in (b, c)
    ]

    def run(body: ConfirmedChange) -> str:
        try:
            mutate(
                database,
                mt,
                settings.facade_secret.get_secret_value(),
                uuid4(),
                target,
                body,
                "assign",
            )
            return "ok"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        with database.session() as session, session.begin():
            session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            futures = [pool.submit(run, body) for body in bodies]
            observe_two_lock_waiters(database, "agency")
        assert sorted(future.result() for future in futures) == ["OWNERSHIP_VERSION_CONFLICT", "ok"]


def test_unknown_future_contact_link_fails_closed(settings: Settings, database: Database) -> None:
    _, at = actor(settings, database)
    source = cid(create_lead(settings, database, at))
    survivor = cid(create_lead(settings, database, at, new_lead("+33600000002")))
    with database.session() as session, session.begin():
        session.execute(
            text(
                "CREATE TABLE sp06_link_probe "
                "(contact_id uuid REFERENCES contact(id) ON DELETE RESTRICT)"
            )
        )
    try:
        with pytest.raises(IdentityError, match="MERGE_LINKS_UNSUPPORTED"):
            confirmation(
                settings,
                database,
                at,
                source,
                intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
            )
    finally:
        with database.session() as session, session.begin():
            session.execute(text("DROP TABLE sp06_link_probe"))
    assert read_detail(database, at, "contacts", source)["version"] == 1


def test_merge_identity_limit_does_not_archive_or_move_links(
    settings: Settings, database: Database
) -> None:
    _, at = actor(settings, database)
    source = cid(
        create_lead(
            settings,
            database,
            at,
            new_lead(
                new_contact={
                    "name": "SP06 dix coordonnées synthétiques",
                    "phones": [
                        {"number": f"+2126000001{index:02d}", "is_primary": index == 0}
                        for index in range(10)
                    ],
                }
            ),
        )
    )
    survivor = cid(create_lead(settings, database, at, new_lead("+33600000002")))
    with pytest.raises(IdentityError, match="MERGE_IDENTITY_LIMIT"):
        confirmation(
            settings,
            database,
            at,
            source,
            intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
        )
    with database.session() as session:
        assert (
            session.scalar(
                select(func.count()).select_from(Contact).where(Contact.archived_at.is_(None))
            )
            == 2
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(ContactPhone)
                .where(ContactPhone.archived_at.is_(None))
            )
            == 11
        )
        assert (
            session.scalar(
                select(func.count()).select_from(Enquiry).where(Enquiry.contact_id == source)
            )
            == 1
        )


def test_collaborative_merge_preserves_email_primary_and_original_actors(
    settings: Settings, database: Database
) -> None:
    a, at = actor(settings, database)
    _, bt = actor(settings, database)
    _, mt = actor(settings, database, "manager")
    source = cid(
        create_lead(
            settings,
            database,
            at,
            new_lead(
                new_contact={
                    "name": "SP06 source avec e-mails",
                    "phones": [{"number": "+212600000001", "is_primary": True}],
                    "emails": [
                        {"email": "a@example.com", "is_primary": False},
                        {"email": "z@example.com", "is_primary": True},
                    ],
                }
            ),
        )
    )
    survivor = cid(create_lead(settings, database, bt, new_lead("+33600000002")))
    change(settings, database, mt, survivor, intent("collaborators", collaborator_ids=[str(a)]))
    change(
        settings,
        database,
        at,
        source,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=2),
    )
    merged = read_detail(database, at, "contacts", survivor)
    assert merged["primary_email"] == "z@example.com"
    assert merged["collaborators"]
    assert read_detail(database, at, "contacts", source)["id"] == str(survivor)


def test_restore_repairs_assignment_when_account_was_disabled_while_archived(
    settings: Settings, database: Database
) -> None:
    a, at = actor(settings, database)
    _, mt = actor(settings, database, "manager")
    lead = create_lead(settings, database, at)
    target = cid(lead)
    change(settings, database, mt, target, intent("archive"))
    with database.session() as session, session.begin():
        session.execute(update(User).where(User.id == a).values(state="disabled"))
        session.execute(
            update(Contact)
            .where(Contact.id == target)
            .values(name="SP06 identité synthétique conservée")
        )
    impact = preview(
        database, mt, settings.facade_secret.get_secret_value(), target, intent("restore", 2)
    )
    assert cast(dict[str, object], impact["impact"])["unassigned_enquiries"] == 1
    change(settings, database, mt, target, intent("restore", 2))
    with database.session() as session:
        enquiry = session.get(Enquiry, UUID(str(lead["id"])))
        assert enquiry and enquiry.contact_id == target and enquiry.assigned_agent_id is None
