"""Prepared isolated PostgreSQL dossier-directory coverage; not a unit gate."""

import csv
import io
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from sqlalchemy import update

from app.contacts.contracts import ListQuery
from app.contacts.models import ContactCollaborator
from app.contacts.queries import assignment_options, enquiry_assignee_options, responsible_options
from app.contacts.queries import read_list as read_enquiries
from app.deals.contracts import DealQuery
from app.deals.models import Deal
from app.deals.queries import read_list as read_deals
from app.discovery.contracts import NewExport
from app.discovery.csv_export import generate
from app.discovery.exports import request_export
from app.identity.models import User
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import new, run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def queue(settings, database, manager, owner):
    return create_lead(
        settings,
        database,
        manager,
        new_lead(
            new_contact={
                "name": "SYN prospect non attribué",
                "primary_agent_id": owner,
                "phones": [{"number": "+212600000001", "is_primary": True}],
            }
        ),
    )


def test_queue_is_manager_filtered_counted_paged_and_exported_but_remains_hidden_from_agents(
    settings, database
):
    owner, agent = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    waiting = queue(settings, database, manager, owner)
    create_lead(settings, database, agent, new_lead("+212600000002"))
    filters = ListQuery(assigned_agent_id="unassigned")
    result = read_enquiries(database, manager, "enquiries", filters)
    assert result["total"] == 1 and result["status_counts"]["new"] == 1
    assert result["items"][0]["id"] == waiting["id"]
    assert result["items"][0]["assigned_agent"] is None
    assert read_enquiries(database, agent, "enquiries", filters)["total"] == 0
    deep = read_enquiries(
        database, manager, "enquiries", filters.model_copy(update={"page": 2, "page_size": 1})
    )
    assert deep["items"] == [] and deep["total"] == 1
    body, key = NewExport(filters={"assigned_agent_id": "unassigned"}), uuid4()
    job = request_export(database, manager, key, body)
    assert request_export(database, manager, key, body) == job
    content, count = generate(database, UUID(job["id"]))
    rows = list(csv.DictReader(io.StringIO(content.decode("utf-8-sig"))))
    assert count == len(rows) == 1 and rows[0]["enquiry_id"] == waiting["id"]


def test_assignee_choices_retain_inactive_enquiry_assignees_and_revoke_with_contact_scope(
    settings, database
):
    primary, _ = actor(settings, database)
    assignee, _ = actor(settings, database)
    colleague, reader = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    waiting = queue(settings, database, manager, primary)
    cid = UUID(waiting["contact"]["id"])
    with database.session() as session, session.begin():
        session.add_all(
            [ContactCollaborator(contact_id=cid, user_id=uid) for uid in (assignee, colleague)]
        )
    assigned = create_lead(
        settings,
        database,
        manager,
        new_lead(new_contact=None, contact_id=cid, assigned_agent_id=assignee),
    )
    with database.session() as session, session.begin():
        session.execute(update(User).where(User.id == assignee).values(state="disabled"))
    options = enquiry_assignee_options(database, reader, ListQuery())
    assert [item["id"] for item in options["items"]] == [str(assignee)]
    assert [item["id"] for item in responsible_options(database, reader, ListQuery())["items"]] == [
        str(primary)
    ]
    assert str(assignee) not in {
        item["id"] for item in assignment_options(database, manager, ListQuery())["items"]
    }
    assert (
        read_enquiries(database, reader, "enquiries", ListQuery(assigned_agent_id=assignee))[
            "items"
        ][0]["id"]
        == assigned["id"]
    )
    with database.session() as session, session.begin():
        session.execute(
            update(ContactCollaborator)
            .where(ContactCollaborator.contact_id == cid, ContactCollaborator.user_id == colleague)
            .values(revoked_at=datetime.now(UTC))
        )
    assert enquiry_assignee_options(database, reader, ListQuery())["total"] == 0
    assert (
        read_enquiries(database, reader, "enquiries", ListQuery(assigned_agent_id=assignee))[
            "total"
        ]
        == 0
    )


@pytest.mark.parametrize("role", ["agent", "manager"])
def test_created_and_modified_days_intersect_before_authorized_total_and_paging(
    settings, database, role
):
    _, owner = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    contact = UUID(create_lead(settings, database, owner)["contact"]["id"])
    first, second = [UUID(run(settings, database, owner, new(contact))["id"]) for _ in range(2)]
    with database.session() as session, session.begin():
        for target, day in ((first, 1), (second, 2)):
            session.execute(
                update(Deal)
                .where(Deal.id == target)
                .values(
                    created_at=datetime(2026, 1, day, 23, 30, tzinfo=UTC),
                    updated_at=datetime(2026, 1, 3, 23, 30, tzinfo=UTC),
                )
            )
    token = owner if role == "agent" else manager
    for day, target in (("2026-01-02", first), ("2026-01-03", second)):
        filters = DealQuery(
            created_from=day,
            created_to=day,
            updated_from="2026-01-04",
            updated_to="2026-01-04",
            page_size=1,
        )
        result = read_deals(database, token, filters)
        assert result["total"] == 1 and result["stage_counts"]["new"] == 1
        assert result["items"][0]["id"] == str(target)
        deep = read_deals(database, token, filters.model_copy(update={"page": 2}))
        assert deep["items"] == [] and deep["total"] == 1
    assert read_deals(database, token, DealQuery(created_to="9999-12-31"))["total"] == 2
