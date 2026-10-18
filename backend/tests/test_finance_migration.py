"""0017 business facts survive the additive finance schema; retained facts refuse downgrade."""

import pytest
from sqlalchemy import text

from tests.contact_support import actor
from tests.legacy_support import contact as legacy_contact
from tests.legacy_support import deal as legacy_deal
from tests.test_finance import create
from tests.test_isolation_migrations import migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_populated_0017_upgrade_and_retained_finance_downgrade_refusal(settings, database):
    uid, _ = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    assert migrate("downgrade", "0017_tasks_reminders").returncode == 0
    try:
        cid = legacy_contact(database, uid)
        did = legacy_deal(database, uid, cid)
        with database.engine.connect() as connection:
            original = connection.scalar(
                text("SELECT to_jsonb(d) FROM deal d WHERE id=:id"), {"id": did}
            )
            history = (
                connection.execute(
                    text("SELECT to_jsonb(e) FROM deal_stage_event e WHERE deal_id=:id"),
                    {"id": did},
                )
                .scalars()
                .all()
            )
        assert migrate("upgrade", "head").returncode == 0
        with database.engine.connect() as connection:
            assert (
                connection.execute(text("SELECT to_jsonb(d) FROM deal d WHERE id=:id"), {"id": did})
                .scalar_one()
                .items()
                >= original.items()
            )
            assert (
                connection.execute(
                    text(
                        "SELECT to_jsonb(e)-'qualification' FROM deal_stage_event e "
                        "WHERE deal_id=:id"
                    ),
                    {"id": did},
                )
                .scalars()
                .all()
                == history
            )
        create(settings, database, manager, did)
        assert migrate("downgrade", "0017_tasks_reminders").returncode != 0
    finally:
        assert migrate("upgrade", "head").returncode == 0
