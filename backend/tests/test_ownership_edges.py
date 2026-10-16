"""SP-06 strict HTTP, current authority, independent merge/phone race and retry edges."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from time import monotonic
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select, text, update

from app.contacts.commands import command
from app.contacts.contracts import NewContact
from app.contacts.history_models import TimelineEvent
from app.contacts.models import Contact
from app.contacts.ownership import mutate
from app.contacts.ownership_contracts import ChangeIntent, ConfirmedChange
from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, StaffSession, User
from app.identity.security import IdentityError, csrf_token
from app.main import create_app
from app.settings import Settings
from tests.contact_support import actor, create_lead, new_lead
from tests.identity_support import observe_two_lock_waiters
from tests.test_auth import authority
from tests.test_foundation import client_for
from tests.test_ownership import cid, confirmation, intent, note

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize(
    "fields",
    [
        {"operation": "merge"},
        {"operation": "assign"},
        {"operation": "archive", "primary_agent_id": str(uuid4())},
        {"operation": "collaborators", "collaborator_ids": [str(AGENCY_ID), str(AGENCY_ID)]},
        {"operation": "archive", "expected_version": True},
        {"operation": "archive", "reason": " "},
    ],
)
def test_intent_rejects_ambiguous_or_unknown_fields(fields: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        ChangeIntent.model_validate(
            {"operation": "archive", "expected_version": 1, "reason": "Motif synthétique", **fields}
        )


@pytest.mark.anyio
async def test_history_http_csrf_strict_fields_denied_private_and_put(
    settings: Settings, database: Database
) -> None:
    a, at = actor(settings, database)
    b, bt = actor(settings, database)
    _, mt = actor(settings, database, "manager")
    target = cid(create_lead(settings, database, at))
    base = f"/api/v1/contacts/{target}"

    def read_headers(token: str) -> dict[str, str]:
        return {**authority(settings), "X-Kay-Session": token}

    def headers(token: str) -> dict[str, str]:
        return {
            **read_headers(token),
            "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
            "Origin": settings.frontend_origin,
            "Idempotency-Key": str(uuid4()),
        }

    async with client_for(create_app(settings)) as client:
        assert (await client.get(base + "/timeline", headers=read_headers(bt))).status_code == 404
        assert (
            await client.get(base + "/timeline?page=1&page=2", headers=read_headers(at))
        ).status_code == 422
        assert (
            await client.get(base + "/timeline?q=private", headers=read_headers(at))
        ).status_code == 422
        assert (
            await client.post(base + "/notes", headers=read_headers(at), json={"body": "synthetic"})
        ).status_code == 403
        assert (
            await client.post(
                base + "/notes",
                headers=headers(at),
                json={"body": "synthetic", "actor_user_id": str(b)},
            )
        ).status_code == 422
        assert (
            await client.post(base + "/notes", headers=headers(at), json={"body": "synthetic"})
        ).status_code == 200
        draft = intent("collaborators", collaborator_ids=[str(b)])
        assert (
            await client.post(
                base + "/preview",
                headers=headers(at),
                json=draft.model_dump(mode="json", exclude_unset=True),
            )
        ).status_code == 403
        body = confirmation(settings, database, mt, target, draft)
        wrong = await client.post(
            base + "/archive",
            headers=headers(mt),
            json=body.model_dump(mode="json", exclude_unset=True),
        )
        assert wrong.status_code == 422
        response = await client.put(
            base + "/collaborators",
            headers=headers(mt),
            json=body.model_dump(mode="json", exclude_unset=True),
        )
        assert response.status_code == 200
        history = await client.get(base + "/timeline", headers=read_headers(bt))
        assert history.status_code == 200 and history.headers["cache-control"] == "no-store"
        assert str(a) in {item["actor"]["id"] for item in history.json()["items"]}


def test_retry_changed_body_role_denial_and_note_single_effect(
    settings: Settings, database: Database
) -> None:
    _, at = actor(settings, database)
    manager, mt = actor(settings, database, "manager")
    target = cid(create_lead(settings, database, at))
    key = uuid4()
    note(settings, database, at, target, key=key)
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        note(settings, database, at, target, kind="call", key=key)
    body = confirmation(settings, database, mt, target, intent("archive"))
    retry = uuid4()
    secret = settings.facade_secret.get_secret_value()
    mutate(database, mt, secret, retry, target, body, "archive")
    with database.session() as session, session.begin():
        session.execute(update(User).where(User.id == manager).values(role="agent"))
    with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
        mutate(database, mt, secret, retry, target, body, "archive")
    with database.session() as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(TimelineEvent)
                .where(TimelineEvent.action == "note")
            )
            == 1
        )


def test_waiting_transfer_rechecks_revoked_session(settings: Settings, database: Database) -> None:
    _, at = actor(settings, database)
    b, _ = actor(settings, database)
    manager, mt = actor(settings, database, "manager")
    target = cid(create_lead(settings, database, at))
    body = confirmation(settings, database, mt, target, intent("assign", primary_agent_id=str(b)))

    def waiting() -> str:
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
            return "UNEXPECTED_SUCCESS"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=1) as pool:
        with database.session() as session, session.begin():
            session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            future = pool.submit(waiting)
            # One waiter, observed directly; no sleeps standing in for a reached lock.
            deadline = monotonic() + 2
            while monotonic() < deadline:
                with database.session() as probe:
                    if probe.scalar(
                        text(
                            "SELECT count(*) FROM pg_stat_activity "
                            "WHERE datname=current_database() AND wait_event_type='Lock' "
                            "AND query LIKE '%agency%FOR UPDATE%'"
                        )
                    ):
                        break
            else:
                raise AssertionError("REAL_LOCK_WAITER_REQUIRED")
            session.execute(
                update(StaffSession)
                .where(StaffSession.user_id == manager)
                .values(revoked_at=datetime.now(UTC))
            )
        assert future.result() == "UNAUTHENTICATED"


def test_merge_race_and_phone_claim_leave_no_partial_original(
    settings: Settings, database: Database
) -> None:
    _, at = actor(settings, database)
    source = cid(create_lead(settings, database, at))
    destinations = [
        cid(create_lead(settings, database, at, new_lead(phone)))
        for phone in ("+33600000002", "+12025550101")
    ]
    bodies = [
        confirmation(
            settings,
            database,
            at,
            source,
            intent("merge", survivor_id=str(target), survivor_expected_version=1),
        )
        for target in destinations
    ]
    secret = settings.facade_secret.get_secret_value()

    def merge(body: ConfirmedChange) -> str:
        try:
            mutate(database, at, secret, uuid4(), source, body, "merge")
            return "ok"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        with database.session() as session, session.begin():
            session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            futures = [pool.submit(merge, body) for body in bodies]
            observe_two_lock_waiters(database, "agency")
        assert sorted(future.result() for future in futures) == ["CONTACT_MERGED", "ok"]
    # Source's active phone has moved under the same global uniqueness boundary.
    body = NewContact.model_validate(
        {
            "name": "SP06 tentative synthétique",
            "phones": [{"number": "+212600000001", "is_primary": True}],
        }
    )
    with pytest.raises(IdentityError, match="DUPLICATE_CONFIRMATION_REQUIRED"):
        command(database, at, secret, uuid4(), "contacts", body)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Contact)) == 3
