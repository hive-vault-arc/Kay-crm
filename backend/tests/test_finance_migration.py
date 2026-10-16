"""0017 business facts survive the additive finance schema; retained facts refuse downgrade."""

import pytest
from sqlalchemy import text

from tests.test_finance import create, fixture
from tests.test_isolation_migrations import migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_populated_0017_upgrade_and_retained_finance_downgrade_refusal(settings, database):
    _, _, _, manager, did = fixture(settings, database)
    with database.engine.connect() as connection:
        original = connection.execute(
            text("SELECT to_jsonb(d) FROM deal d WHERE id=:id"), {"id": did}
        ).scalar_one()
        history = (
            connection.execute(
                text("SELECT to_jsonb(e) FROM deal_stage_event e WHERE deal_id=:id"), {"id": did}
            )
            .scalars()
            .all()
        )
    assert migrate("downgrade", "0017_tasks_reminders").returncode == 0
    try:
        assert migrate("upgrade", "head").returncode == 0
        with database.engine.connect() as connection:
            assert (
                connection.execute(
                    text("SELECT to_jsonb(d) FROM deal d WHERE id=:id"), {"id": did}
                ).scalar_one()
                == original
            )
            assert (
                connection.execute(
                    text("SELECT to_jsonb(e) FROM deal_stage_event e WHERE deal_id=:id"),
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
