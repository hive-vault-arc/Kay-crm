"""Availability ranges use real PostgreSQL constraints and shared inventory checks."""

from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.identity.security import IdentityError
from app.inventory.hierarchy_contracts import ArchiveDevelopment
from app.inventory.models import InventoryEvent
from app.inventory.period_contracts import CancelPeriod, SavePeriod
from app.inventory.period_models import PropertyPeriod
from app.inventory.periods import read_calendar, today
from app.inventory.queries import read_detail
from tests.contact_support import actor
from tests.deal_support import run as deal_command
from tests.test_inventory import property_draft, run
from tests.test_reservations import fixture, reviewed

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def save_body(version, start, end, kind="booking"):
    return SavePeriod(
        expected_version=version, start_on=start, end_on=end, kind=kind, note="Note interne"
    )


def test_period_overlap_boundaries_scope_and_cancellation(settings, database):
    _, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    pid = property_draft(settings, database, manager)
    other = property_draft(settings, database, manager)
    start, end = date(2040, 3, 29), date(2040, 4, 2)
    body, key = save_body(1, start, end), uuid4()
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        run(settings, database, agent, "period-create", body, pid)
    result = run(settings, database, manager, "period-create", body, pid, key)
    assert run(settings, database, manager, "period-create", body, pid, key) == result
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        run(
            settings,
            database,
            manager,
            "period-create",
            body.model_copy(update={"note": "Autre"}),
            pid,
            key,
        )
    projection = read_calendar(database, manager, pid, date(2040, 4, 1))
    row = projection["items"][0]
    rid = row["id"]
    assert row["note"] == "Note interne"
    assert read_calendar(database, agent, pid, date(2040, 3, 1))["items"][0]["note"] is None
    with pytest.raises(IdentityError, match="PROPERTY_PERIOD_OVERLAP"):
        run(settings, database, manager, "period-create", save_body(2, start, end, "closure"), pid)
    run(
        settings,
        database,
        manager,
        "period-create",
        save_body(2, end, end + timedelta(days=1), "closure"),
        pid,
    )
    run(settings, database, manager, "period-create", body, other)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, manager, f"period-edit:{rid}", save_body(2, start, end), other)
    with pytest.raises(IdentityError, match="PROPERTY_PERIOD_ACTIVE"):
        run(
            settings,
            database,
            manager,
            "property-archive",
            ArchiveDevelopment(expected_version=3, reason="Archive"),
            pid,
        )
    run(
        settings,
        database,
        manager,
        f"period-edit:{rid}",
        save_body(3, start, end - timedelta(days=1)),
        pid,
    )
    run(
        settings,
        database,
        manager,
        f"period-cancel:{rid}",
        CancelPeriod(expected_version=4, reason="Annulation"),
        pid,
    )
    run(settings, database, manager, "period-create", save_body(5, start, end, "closure"), pid)
    with database.session() as session:
        cancelled = session.get(PropertyPeriod, UUID(rid))
        assert (
            cancelled is not None
            and cancelled.cancelled_at
            and cancelled.cancellation_reason == "Annulation"
        )
        actions = session.scalars(
            select(InventoryEvent.action).where(InventoryEvent.property_id == pid)
        ).all()
        assert "properties.period.updated" in actions and "properties.period.cancelled" in actions


def test_active_legacy_rental_hold_and_calendar_block_each_other(settings, database):
    _, agent, _, manager, pid, _, did = fixture(settings, database)
    start = today() + timedelta(days=3)
    end = start + timedelta(days=2)
    deal_command(settings, database, agent, reviewed(database, agent, did), did)
    version = read_detail(database, manager, pid)["version"]
    assert read_calendar(database, agent, pid, start.replace(day=1))["undated_block"] == "hold"
    with pytest.raises(IdentityError, match="PROPERTY_PERIOD_UNDATED_BLOCK"):
        run(settings, database, manager, "period-create", save_body(version, start, end), pid)
    deal_command(settings, database, agent, reviewed(database, agent, did, "Libérer le stock"), did)
    version = read_detail(database, manager, pid)["version"]
    run(
        settings, database, manager, "period-create", save_body(version, start, end, "closure"), pid
    )
    with pytest.raises(IdentityError, match="PROPERTY_PERIOD_ACTIVE"):
        deal_command(settings, database, agent, reviewed(database, agent, did), did)


def test_database_rejects_concurrent_overlaps_even_outside_command(settings, database):
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    start, end = date(2040, 5, 1), date(2040, 5, 4)
    gate = Barrier(2)
    with database.session() as session:
        event_id = session.scalar(
            select(InventoryEvent.id).where(InventoryEvent.property_id == pid)
        )
    assert event_id is not None

    def insert(kind):
        with database.session() as session:
            gate.wait(timeout=5)
            session.add(
                PropertyPeriod(
                    property_id=pid,
                    start_on=start,
                    end_on=end,
                    kind=kind,
                    create_event_id=event_id,
                )
            )
            try:
                session.commit()
                return "committed"
            except IntegrityError as error:
                return error.orig.diag.constraint_name

    with ThreadPoolExecutor(2) as threads:
        assert sorted(threads.map(insert, ["closure", "booking"])) == [
            "committed",
            "property_period_no_overlap",
        ]
