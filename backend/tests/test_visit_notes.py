"""Real PostgreSQL notes acceptance, prepared for the owner's final verification stage."""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.identity.models import User
from app.identity.security import IdentityError
from app.schedule.contracts import EditVisit
from app.schedule.models import Visit, VisitEvent
from app.schedule.queries import detail, read_visits
from app.schedule.records import snapshot
from tests.contact_support import actor
from tests.deal_support import setup
from tests.test_schedule import booking, run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_notes_persist_retry_clear_and_legacy_edits_preserve_them(settings, database):
    uid, token, cid, _ = setup(settings, database)
    body = booking(uid, cid, type="office", notes="Préparation synthétique\nDeuxième ligne")
    key = uuid4()
    created = run(settings, database, token, body, key=key)
    assert run(settings, database, token, body, key=key) == created
    vid = UUID(created["id"])
    editable = body.model_dump(exclude={"contact_id", "status", "notes"})
    run(
        settings, database, token, EditVisit.model_validate(editable | {"expected_version": 1}), vid
    )
    assert detail(database, token, vid)["notes"] == body.notes
    run(
        settings,
        database,
        token,
        EditVisit.model_validate(editable | {"expected_version": 2, "notes": ""}),
        vid,
    )
    assert detail(database, token, vid)["notes"] == ""
    events = detail(database, token, vid, history=True)["items"]
    assert [event["snapshot"]["notes"] for event in events] == ["", body.notes, body.notes]
    assert all(event["actor"]["id"] == str(uid) for event in events)
    with pytest.raises(IdentityError, match="VERSION_CONFLICT"):
        run(
            settings,
            database,
            token,
            EditVisit.model_validate(editable | {"expected_version": 2, "notes": "Obsolète"}),
            vid,
        )
    _, outsider = actor(settings, database, "agent")
    with pytest.raises(IdentityError):
        detail(database, outsider, vid, history=True)
    from app.schedule.contracts import CalendarQuery

    busy = read_visits(
        database, outsider, CalendarQuery(start_at=body.start_at, end_at=body.end_at), busy=True
    )
    assert all(set(item) == {"start_at", "end_at", "busy"} for item in busy["items"])


def test_database_rejects_notes_that_disagree_with_the_new_history_snapshot(settings, database):
    uid, token, cid, _ = setup(settings, database)
    created = run(
        settings, database, token, booking(uid, cid, type="office", notes="Original synthétique")
    )
    vid = UUID(created["id"])
    with (
        pytest.raises(IntegrityError, match="VISIT_HISTORY_REQUIRED"),
        database.session() as session,
        session.begin(),
    ):
        session.execute(text("SELECT set_config('kay.visit_action','updated',true)"))
        row = session.scalar(select(Visit).where(Visit.id == vid))
        row.notes, row.version = "Changement synthétique", row.version + 1
        session.flush()
        stored = snapshot(session, row) | {"notes": "Historique incohérent"}
        session.add(
            VisitEvent(
                visit_id=vid,
                actor_user_id=uid,
                actor_name=session.get(User, uid).display_name,
                action="updated",
                version=row.version,
                snapshot=stored,
                reason="",
            )
        )
    assert detail(database, token, vid)["notes"] == "Original synthétique"
