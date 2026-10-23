"""Catalogue-backed Lead/Deal relationships on isolated PostgreSQL only."""

from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

from app.activities.contracts import ActivityQuery
from app.activities.service import read_activities
from app.identity.security import IdentityError
from app.inventory.hierarchy_models import Development
from app.project_links.contracts import LinkQuery, NewLink
from app.project_links.models import ProjectLink
from app.project_links.service import mutate_link, read_links
from tests.contact_support import actor, create_lead
from tests.deal_support import run
from tests.test_developments import development
from tests.test_inventory import property_draft
from tests.test_lead_conversion import conversion

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def change(settings, database, token, scope, target, body=None, link_id=None, key=None):
    return mutate_link(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        key or uuid4(),
        scope,
        target,
        body,
        link_id,
    )


def list_for(database, token, scope, target, kind="discussed", page=1):
    return read_links(database, token, scope, target, LinkQuery(kind=kind, page=page))


def test_independent_kinds_scoped_history_idempotency_and_removal(settings, database):
    uid, token = actor(settings, database)
    _, unrelated = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])
    project = development(settings, database, token)
    body = NewLink(kind="discussed", development_id=project)
    key = uuid4()
    first = change(settings, database, token, "enquiries", eid, body, key=key)
    assert change(settings, database, token, "enquiries", eid, body, key=key) == first
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        change(
            settings,
            database,
            token,
            "enquiries",
            eid,
            NewLink(kind="visited", development_id=project),
            key=key,
        )
    with pytest.raises(IdentityError, match="PROJECT_LINK_EXISTS"):
        change(settings, database, token, "enquiries", eid, body)
    visited = change(
        settings, database, token, "enquiries", eid, NewLink(kind="visited", development_id=project)
    )
    assert list_for(database, token, "enquiries", eid)["total"] == 1
    assert list_for(database, token, "enquiries", eid, "visited")["items"][0]["id"] == visited["id"]
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        list_for(database, unrelated, "enquiries", eid)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        change(settings, database, unrelated, "enquiries", eid, body)
    removal_key = uuid4()
    assert (
        change(
            settings, database, token, "enquiries", eid, link_id=UUID(first["id"]), key=removal_key
        )
        == first
    )
    assert (
        change(
            settings, database, token, "enquiries", eid, link_id=UUID(first["id"]), key=removal_key
        )
        == first
    )
    assert list_for(database, token, "enquiries", eid)["total"] == 0
    assert list_for(database, token, "enquiries", eid, "visited")["total"] == 1
    again = change(settings, database, token, "enquiries", eid, body)
    assert again["id"] != first["id"]
    history = read_activities(database, token, "enquiries", eid, ActivityQuery(page_size=25))
    actions = [item["action"] for item in history["items"]]
    assert actions.count("enquiries.project_link.added") == 3
    assert actions.count("enquiries.project_link.removed") == 1
    with database.session() as session:
        removed = session.get(ProjectLink, UUID(first["id"]))
        assert removed and removed.removed_by_user_id == uid and removed.removed_at


def test_lead_and_deal_are_independent_and_catalogue_validated(settings, database):
    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid = UUID(lead["id"])
    project = development(settings, database, token)
    change(
        settings,
        database,
        token,
        "enquiries",
        eid,
        NewLink(kind="discussed", development_id=project),
    )
    did = UUID(run(settings, database, token, conversion(), eid)["id"])
    assert list_for(database, token, "deals", did)["total"] == 0
    change(settings, database, token, "deals", did, NewLink(kind="visited", development_id=project))
    assert list_for(database, token, "deals", did, "visited")["total"] == 1
    assert list_for(database, token, "enquiries", eid)["total"] == 1
    property_id = property_draft(settings, database, token)
    property_link = change(
        settings, database, token, "deals", did,
        NewLink(kind="discussed", property_id=property_id),
    )
    assert list_for(database, token, "deals", did)["items"][0]["id"] == property_link["id"]
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        change(
            settings,
            database,
            token,
            "deals",
            did,
            NewLink(kind="discussed", development_id=uuid4()),
        )
    with pytest.raises(ValidationError):
        NewLink(kind="discussed", development_id=project, property_id=uuid4())
    with pytest.raises(ValidationError):
        NewLink(kind="visited")


def test_more_than_one_thousand_links_are_numbered_not_truncated(settings, database):
    uid, token = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])
    with database.session() as session, session.begin():
        projects = [
            Development(
                id=uuid4(),
                reference=f"SYNTH-{index:04d}",
                name=f"Programme synthétique {index:04d}",
                created_by_user_id=uid,
            )
            for index in range(1001)
        ]
        session.add_all(projects)
        session.flush()
        session.add_all(
            [
                ProjectLink(
                    id=uuid4(),
                    enquiry_id=eid,
                    development_id=project.id,
                    kind="discussed",
                    name=project.name,
                    created_by_user_id=uid,
                )
                for project in projects
            ]
        )
    first = list_for(database, token, "enquiries", eid)
    last = list_for(database, token, "enquiries", eid, page=41)
    assert first["total"] == last["total"] == 1001
    assert len(first["items"]) == 25 and len(last["items"]) == 1
    assert first["has_next"] and not last["has_next"] and last["has_previous"]
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(ProjectLink)) == 1001
