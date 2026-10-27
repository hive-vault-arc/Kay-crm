"""Prepared isolated PostgreSQL cases for audit attribution lookup; not unit fixtures."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.discovery.audit import read_audit, read_audit_actors
from app.discovery.contracts import AuditActorsQuery, AuditQuery
from app.identity.models import AuditEvent, User
from app.identity.security import IdentityError
from app.intake.models import WebsiteSource
from tests.contact_support import actor
from tests.identity_support import create_actor

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize("role", ["manager", "administrator"])
def test_complete_history_actors_are_distinct_paged_literal_and_include_retained_users(
    settings, database, role
):
    _, manager = actor(settings, database, role)
    first, _ = actor(settings, database)
    second, _ = actor(settings, database)
    third, _ = actor(settings, database)
    unused, _, _ = create_actor(settings, database, role="agent")
    names = {
        first: "Audit lookup A",
        second: "Audit lookup B",
        third: "Audit lookup %_\\ C",
        unused: "Audit lookup No event",
    }
    with database.session() as session, session.begin():
        for uid, name in names.items():
            user = session.get(User, uid)
            user.display_name = name
            if uid == second:
                user.state, user.deleted_at = "disabled", datetime.now(UTC)
        session.add_all(
            [AuditEvent(actor_user_id=first, action="contacts.note") for _ in range(12)]
        )
    pages = [
        read_audit_actors(
            database, manager, AuditActorsQuery(q="Audit lookup", page=p, page_size=1)
        )
        for p in (1, 2, 3)
    ]
    complete = read_audit_actors(database, manager, AuditActorsQuery(q="Audit lookup"))
    expected = [row["id"] for row in complete["items"]]
    assert set(expected) == {str(uid) for uid in (first, second, third)}
    assert [page["items"][0]["id"] for page in pages] == expected
    assert all(page["total"] == 3 for page in pages)
    assert not pages[0]["has_previous"] and pages[0]["has_next"]
    assert pages[-1]["has_previous"] and not pages[-1]["has_next"]
    literal = read_audit_actors(database, manager, AuditActorsQuery(q="%_\\"))
    assert literal["total"] == 1 and literal["items"] == [
        {"kind": "user", "id": str(third), "display_name": names[third]}
    ]
    selected = read_audit(database, manager, AuditQuery(actor_id=first, family="contacts"))
    assert selected["total"] == 12
    assert all(row["actor_id"] == str(first) for row in selected["items"])


def test_current_actor_role_and_session_are_rechecked_before_audit_options(settings, database):
    uid, token = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        read_audit_actors(database, agent, AuditActorsQuery())
    assert read_audit_actors(database, token, AuditActorsQuery())["total"] >= 1
    with database.session() as session, session.begin():
        session.get(User, uid).role = "agent"
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        read_audit_actors(database, token, AuditActorsQuery())
    with database.session() as session, session.begin():
        user = session.get(User, uid)
        user.role, user.state = "manager", "disabled"
    with pytest.raises(IdentityError):
        read_audit_actors(database, token, AuditActorsQuery())


def test_web_and_legacy_unattributed_events_keep_existing_safe_shape_without_staff_fabrication(
    settings, database
):
    uid, manager = actor(settings, database, "manager")
    source_id, unattributed_id, web_id = uuid4(), uuid4(), uuid4()
    with database.session() as session, session.begin():
        session.add(
            WebsiteSource(
                id=source_id,
                source_key="audit-options-" + source_id.hex[:16],
                name="S" * 160,
                key_digest=b"x" * 32,
                default_agent_id=uid,
                active=False,
            )
        )
        session.flush()
        session.add_all(
            [
                AuditEvent(id=unattributed_id, action="tasks.updated"),
                AuditEvent(id=web_id, website_source_id=source_id, action="enquiries.created"),
            ]
        )
    rows = read_audit(database, manager, AuditQuery())["items"]
    unattributed = next(row for row in rows if row["id"] == str(unattributed_id))
    web = next(row for row in rows if row["id"] == str(web_id))
    assert unattributed["actor_name"] == "Auteur non renseigné" and unattributed["actor_id"] is None
    assert web["actor_name"] == "Source web : " + "S" * 160 and web["actor_id"] is None
    assert (
        set(unattributed)
        == set(web)
        == {"id", "action", "actor_id", "actor_name", "created_at", "target_user_id", "targets"}
    )
    choices = read_audit_actors(database, manager, AuditActorsQuery(q="S" * 160))
    assert choices["total"] == 1 and choices["items"] == [
        {
            "kind": "website",
            "id": str(source_id),
            "display_name": web["actor_name"],
        }
    ]
    unattributed_choices = read_audit_actors(
        database, manager, AuditActorsQuery(q="Auteur non renseigné")
    )
    assert unattributed_choices["items"] == [
        {"kind": "unattributed", "id": None, "display_name": "Auteur non renseigné"}
    ]
    web_rows = read_audit(database, manager, AuditQuery(website_source_id=source_id))
    assert web_rows["total"] == 1 and web_rows["items"][0]["id"] == str(web_id)
    unattributed_rows = read_audit(database, manager, AuditQuery(unattributed_actor="true"))
    assert any(row["id"] == str(unattributed_id) for row in unattributed_rows["items"])
    assert not any(row["id"] == str(web_id) for row in unattributed_rows["items"])
    with database.session() as session:
        assert (
            session.scalar(select(WebsiteSource.name).where(WebsiteSource.id == source_id))
            == "S" * 160
        )
