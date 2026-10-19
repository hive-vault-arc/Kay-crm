"""Synthetic Lead/Deal archives preserve history and expire restoration authority."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select

from app.activities.contracts import ActivityQuery, NewActivity
from app.activities.service import append_activity, read_activities
from app.contacts.commands import command as contact_command
from app.contacts.contracts import ArchiveEnquiry, ListQuery, RestoreEnquiry
from app.contacts.history_models import TimelineEvent
from app.contacts.models import ContactCollaborator, Enquiry
from app.contacts.queries import read_detail as lead_detail
from app.contacts.queries import read_list as leads
from app.deals.commands import command as deal_command
from app.deals.contracts import ArchiveDeal, DealQuery, RestoreDeal
from app.deals.history_models import DealStageEvent
from app.deals.models import Deal
from app.deals.queries import read_detail as deal_detail
from app.deals.queries import read_list as deals
from app.discovery.contracts import SearchQuery
from app.discovery.search import search
from app.identity.security import IdentityError
from app.reports.contracts import PeriodQuery
from app.reports.queries import dashboard
from tests.contact_support import actor, create_lead
from tests.deal_support import new
from tests.test_ownership import change, cid, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_owner_archives_lead_and_deal_with_retry_and_history(settings, database):
    owner_id, owner = actor(settings, database)
    other_id, other = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    lead = create_lead(settings, database, owner)
    eid, contact_id = UUID(str(lead["id"])), cid(lead)
    did = UUID(
        deal_command(
            database, owner, settings.facade_secret.get_secret_value(), uuid4(), new(contact_id)
        )["id"]
    )
    with database.session() as session, session.begin():
        session.add(ContactCollaborator(contact_id=contact_id, user_id=other_id))
    for kind in ("enquiry", "deal"):
        assert search(database, owner, SearchQuery(q="SP05", kind=kind))["total"] == 1
    before_metrics = {
        item["key"]: item for item in dashboard(database, owner, PeriodQuery())["metrics"]
    }
    assert before_metrics["active_deals"]["total"] == 1
    assert lead_detail(database, other, "enquiries", eid)["id"] == str(eid)
    assert deal_detail(database, other, did)["id"] == str(did)
    for operation in (
        lambda: contact_command(
            database,
            other,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            "enquiries",
            ArchiveEnquiry(expected_version=1),
            eid,
        ),
        lambda: deal_command(
            database,
            other,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            ArchiveDeal(expected_version=1),
            did,
        ),
    ):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            operation()
    original_activities = {
        scope: read_activities(database, owner, scope, target, ActivityQuery())
        for scope, target in (("enquiries", eid), ("deals", did))
    }
    lead_key, deal_key = uuid4(), uuid4()
    lead_archived = contact_command(
        database,
        owner,
        settings.facade_secret.get_secret_value(),
        lead_key,
        "enquiries",
        ArchiveEnquiry(expected_version=1),
        eid,
    )
    deal_archived = deal_command(
        database,
        owner,
        settings.facade_secret.get_secret_value(),
        deal_key,
        ArchiveDeal(expected_version=1),
        did,
    )
    assert lead_archived == contact_command(
        database,
        owner,
        settings.facade_secret.get_secret_value(),
        lead_key,
        "enquiries",
        ArchiveEnquiry(expected_version=1),
        eid,
    )
    assert deal_archived == deal_command(
        database,
        owner,
        settings.facade_secret.get_secret_value(),
        deal_key,
        ArchiveDeal(expected_version=1),
        did,
    )
    assert leads(database, owner, "enquiries", ListQuery())["total"] == 0
    assert deals(database, owner, DealQuery())["total"] == 0
    for kind in ("enquiry", "deal"):
        assert search(database, owner, SearchQuery(q="SP05", kind=kind))["total"] == 0
    after_metrics = {
        item["key"]: item for item in dashboard(database, owner, PeriodQuery())["metrics"]
    }
    assert after_metrics["active_deals"]["total"] == 0
    assert leads(database, owner, "enquiries", ListQuery(record_state="archived"))["total"] == 1
    assert deals(database, owner, DealQuery(record_state="archived"))["total"] == 1
    assert lead_detail(database, owner, "enquiries", eid)["archived_at"]
    assert deal_detail(database, owner, did)["archived_at"]
    for scope, target in (("enquiries", eid), ("deals", did)):
        after = read_activities(database, owner, scope, target, ActivityQuery())
        assert after["total"] == original_activities[scope]["total"] + 1
        assert {item["id"] for item in original_activities[scope]["items"]} <= {
            item["id"] for item in after["items"]
        }
        with pytest.raises(IdentityError, match="NOT_FOUND|RECORD_ARCHIVED"):
            append_activity(
                database,
                owner,
                settings.facade_secret.get_secret_value(),
                uuid4(),
                scope,
                target,
                NewActivity(body="Note après archivage"),
            )
    with database.session() as session:
        assert session.scalar(
            select(TimelineEvent).where(
                TimelineEvent.enquiry_id == eid, TimelineEvent.action == "enquiries.archive"
            )
        )
        assert session.scalar(
            select(DealStageEvent).where(
                DealStageEvent.deal_id == did, DealStageEvent.action == "archived"
            )
        )
    contact_command(
        database,
        owner,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        "enquiries",
        RestoreEnquiry(expected_version=2),
        eid,
    )
    deal_command(
        database,
        owner,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        RestoreDeal(expected_version=2),
        did,
    )
    assert leads(database, owner, "enquiries", ListQuery())["total"] == 1
    assert deals(database, owner, DealQuery())["total"] == 1
    assert leads(database, manager, "enquiries", ListQuery())["total"] == 1
    assert owner_id != other_id


def test_archive_restoration_expires_without_erasing_history(settings, database):
    _, owner = actor(settings, database)
    lead = create_lead(settings, database, owner)
    eid, contact_id = UUID(str(lead["id"])), cid(lead)
    did = UUID(
        deal_command(
            database, owner, settings.facade_secret.get_secret_value(), uuid4(), new(contact_id)
        )["id"]
    )
    contact_command(
        database,
        owner,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        "enquiries",
        ArchiveEnquiry(expected_version=1),
        eid,
    )
    deal_command(
        database,
        owner,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        ArchiveDeal(expected_version=1),
        did,
    )
    expired = datetime.now(UTC) - timedelta(days=31)
    with database.session() as session, session.begin():
        session.get(Enquiry, eid).archived_at = expired
        session.get(Deal, did).archived_at = expired
    for operation in (
        lambda: contact_command(
            database,
            owner,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            "enquiries",
            RestoreEnquiry(expected_version=2),
            eid,
        ),
        lambda: deal_command(
            database,
            owner,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            RestoreDeal(expected_version=2),
            did,
        ),
    ):
        with pytest.raises(IdentityError, match="RESTORE_WINDOW_EXPIRED"):
            operation()
    assert lead_detail(database, owner, "enquiries", eid)["archived_at"]
    assert deal_detail(database, owner, did)["archived_at"]
    with database.session() as session:
        assert session.scalar(
            select(TimelineEvent).where(
                TimelineEvent.enquiry_id == eid, TimelineEvent.action == "enquiries.archive"
            )
        )
        assert session.scalar(
            select(DealStageEvent).where(
                DealStageEvent.deal_id == did, DealStageEvent.action == "archived"
            )
        )


def test_archive_retry_and_restore_recheck_current_owner_after_transfer(settings, database):
    _, owner = actor(settings, database)
    successor_id, successor = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    lead = create_lead(settings, database, owner)
    eid, contact_id = UUID(str(lead["id"])), cid(lead)
    did = UUID(
        deal_command(
            database, owner, settings.facade_secret.get_secret_value(), uuid4(), new(contact_id)
        )["id"]
    )
    deal_key = uuid4()
    deal_command(
        database,
        owner,
        settings.facade_secret.get_secret_value(),
        deal_key,
        ArchiveDeal(expected_version=1),
        did,
    )
    change(
        settings,
        database,
        manager,
        contact_id,
        intent("assign", primary_agent_id=str(successor_id), retain_previous=True),
    )
    assert deal_detail(database, owner, did)["id"] == str(did)
    for operation in (
        lambda: deal_command(
            database,
            owner,
            settings.facade_secret.get_secret_value(),
            deal_key,
            ArchiveDeal(expected_version=1),
            did,
        ),
        lambda: deal_command(
            database,
            owner,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            RestoreDeal(expected_version=2),
            did,
        ),
    ):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            operation()
    assert deal_detail(database, successor, did)["id"] == str(did)
    deal_command(
        database,
        successor,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        RestoreDeal(expected_version=2),
        did,
    )
    assert lead_detail(database, owner, "enquiries", eid)["id"] == str(eid)
