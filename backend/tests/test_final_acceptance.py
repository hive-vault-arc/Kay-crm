"""Cumulative merge keeps every introduced module on one reviewed current-scope path."""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import event, select, text
from sqlalchemy.orm import Session

from app.contacts.merge import verify_link_policies
from app.contacts.models import Contact, ContactCollaborator, Enquiry
from app.contacts.ownership import mutate
from app.db.session import Base
from app.deals.models import Deal
from app.files.models import Document
from app.identity.security import IdentityError
from app.identity.service import login
from app.inventory.models import PropertyOwner
from app.requirements.contracts import NewRequirement
from app.requirements.models import Requirement
from app.schedule.models import Visit
from app.work.models import Task
from tests.contact_support import actor, create_lead, new_lead
from tests.recovery_support import build
from tests.test_ownership import change, cid, confirmation, intent
from tests.test_requirements import run as requirement_command
from tests.test_work import new as new_task
from tests.test_work import run as task_command

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def author(row):
    return row.organizer_user_id if isinstance(row, Visit) else row.created_by_user_id


def test_cumulative_merge_all_current_links_origins_actors_rollback_retry_and_denial(
    settings, database
):
    data = build(settings, database)
    secret = settings.facade_secret.get_secret_value()
    admin, _ = login(database, secret, data["admin"]["email"], data["admin"]["password"])
    old, _ = login(database, secret, data["agent"]["email"], data["agent"]["password"])
    current, _ = login(database, secret, data["other"]["email"], data["other"]["password"])
    source = UUID(data["contact_id"])
    survivor = cid(create_lead(settings, database, current, new_lead("+212699999998")))
    collaborator, _ = actor(settings, database)
    change(
        settings, database, admin, source, intent("collaborators", collaborator_ids=[collaborator])
    )
    requirement_command(
        settings,
        database,
        old,
        NewRequirement(contact_id=source, title="Recherche SP22", intent="sale"),
    )
    task_command(settings, database, old, new_task(UUID(data["agent"]["id"]), source))
    with database.session() as session:
        verify_link_policies(session)
        version = session.get(Contact, source).version
        originals = [
            (model, row.id, row.origin_contact_id, author(row))
            for model in (Enquiry, Deal, Document, Requirement, Visit, Task)
            for row in session.scalars(select(model).where(model.contact_id == source))
        ]
        assert {model for model, _, _, _ in originals} == {
            Enquiry,
            Deal,
            Document,
            Requirement,
            Visit,
            Task,
        }
        history = {
            name: [
                dict(row) for row in session.execute(select(Base.metadata.tables[name])).mappings()
            ]
            for name in (
                "assignment_event",
                "timeline_event",
                "inventory_event",
                "document_version",
                "deal_stage_event",
                "task_event",
                "visit_event",
                "visit_participant",
                "receipt",
                "commission",
                "import_row",
            )
        }
    request = intent("merge", version=version, survivor_id=survivor, survivor_expected_version=1)
    confirmed = confirmation(settings, database, admin, source, request)
    key = uuid4()

    def interrupted(session):
        raise RuntimeError("SP22_BEFORE_COMMIT")

    event.listen(Session, "before_commit", interrupted, once=True)
    try:
        with pytest.raises(RuntimeError, match="SP22_BEFORE_COMMIT"):
            mutate(database, admin, secret, key, source, confirmed, "merge")
    finally:
        if event.contains(Session, "before_commit", interrupted):
            event.remove(Session, "before_commit", interrupted)
    with database.session() as session:
        assert session.get(Contact, source).merged_into_contact_id is None
        assert all(session.get(model, uid).contact_id == source for model, uid, _, _ in originals)
    saved = mutate(database, admin, secret, key, source, confirmed, "merge")
    assert mutate(database, admin, secret, key, source, confirmed, "merge") == saved
    with database.session() as session:
        for model, uid, origin, creator in originals:
            row = session.get(model, uid)
            assert row.contact_id == survivor and row.origin_contact_id == origin
            assert author(row) == creator
        for name, previous in history.items():
            current_rows = [
                dict(row) for row in session.execute(select(Base.metadata.tables[name])).mappings()
            ]
            assert all(row in current_rows for row in previous)
        owner = session.scalar(
            select(PropertyOwner).where(PropertyOwner.property_id == UUID(data["property_id"]))
        )
        assert owner.contact_id == survivor and owner.origin_contact_id == source
        assert session.get(ContactCollaborator, (survivor, collaborator)) is None
        assert session.scalar(text("SELECT count(*) FROM receipt")) == 1
        assert (
            session.scalar(text("SELECT count(*) FROM import_batch WHERE state='committed'")) == 1
        )
    from app.contacts.queries import read_detail

    assert read_detail(database, current, "contacts", source)["id"] == str(survivor)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_detail(database, old, "contacts", source)
