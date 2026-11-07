"""Prepared isolated PostgreSQL programme-phase acceptance; never a unit substitute."""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.inventory.contracts import DevelopmentQuery, InventoryQuery
from app.inventory.hierarchy_contracts import EditDevelopment
from app.inventory.hierarchy_models import Development
from app.inventory.hierarchy_queries import read_hierarchy
from app.inventory.models import InventoryEvent
from tests.contact_support import actor
from tests.test_developments import development
from tests.test_inventory import run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def read(database, token, did, *, enabled=True):
    return read_hierarchy(database, token, "detail", did, InventoryQuery(), phase_enabled=enabled)


def edit(view, **changes):
    return EditDevelopment(
        **{
            key: view[key] for key in ("reference", "name", "category", "location", "briefing_text")
        },
        developer_marketing_display=view["developer"]["marketing_display"],
        expected_version=view["version"],
        **changes,
    )


@pytest.mark.parametrize("role", ["agent", "manager"])
def test_real_phase_is_shared_editable_metadata_and_filters_the_same_count_page(
    settings, database, role
):
    _, token = actor(settings, database, role)
    _, colleague = actor(settings, database, "agent")
    unknown = development(settings, database, token)
    preparation = development(settings, database, token, phase="preparation")
    marketing = development(settings, database, token, phase="marketing")
    assert read(database, colleague, unknown)["phase"] is None
    assert read(database, colleague, unknown)["phase_supported"] is True
    assert "phase" not in read(database, colleague, unknown, enabled=False)
    for phase, target in [("preparation", preparation), ("marketing", marketing)]:
        result = read_hierarchy(
            database,
            colleague,
            "developments",
            None,
            DevelopmentQuery(phase=phase),
            phase_enabled=True,
        )
        assert result["total"] == 1 and result["phase_supported"] is True
        assert [row["id"] for row in result["items"]] == [str(target)]
    run(
        settings,
        database,
        token,
        "development-edit",
        edit(read(database, token, preparation), phase="marketing"),
        preparation,
    )
    assert read(database, colleague, preparation)["phase"] == "marketing"


def test_real_legacy_omission_replay_and_original_history_preserve_phase(settings, database):
    uid, token = actor(settings, database, "agent")
    did = development(settings, database, token, phase="marketing")
    body = edit(read(database, token, did))
    key = uuid4()
    first = run(settings, database, token, "development-edit", body, did, key)
    run(
        settings,
        database,
        token,
        "development-edit",
        edit(read(database, token, did), phase="preparation"),
        did,
    )
    assert run(settings, database, token, "development-edit", body, did, key) == first
    assert read(database, token, did)["phase"] == "preparation"
    with database.session() as session:
        original = session.scalar(
            select(InventoryEvent).where(InventoryEvent.id == UUID(first["event_id"]))
        )
        assert original.development_phase == "marketing" and original.actor_user_id == uid
    current = read(database, token, did)
    run(settings, database, token, "development-edit", edit(current, phase=None), did)
    assert read(database, token, did)["phase"] is None


def test_real_direct_phase_change_without_matching_history_cannot_commit(settings, database):
    _, token = actor(settings, database, "agent")
    did = development(settings, database, token, phase="preparation")
    with pytest.raises(IntegrityError, match="DEVELOPMENT_PHASE_HISTORY_REQUIRED"):
        with database.session() as session, session.begin():
            session.execute(
                update(Development).where(Development.id == did).values(phase="marketing")
            )
    assert read(database, token, did)["phase"] == "preparation"
