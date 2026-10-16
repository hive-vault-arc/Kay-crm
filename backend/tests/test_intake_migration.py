import pytest
from sqlalchemy import text

from tests.contact_support import actor, create_lead
from tests.identity_support import clear_identity
from tests.test_isolation_migrations import migrate


@pytest.mark.usefixtures("clean_identity")
def test_intake_additive_populated_upgrade_and_retained_history(settings, database):
    _, token = actor(settings, database)
    legacy = create_lead(settings, database, token)
    assert migrate("downgrade", "0021_discovery_indexes").returncode == 0
    try:
        with database.engine.connect() as connection:
            assert connection.scalar(text("SELECT id::text FROM enquiry")) == legacy["id"]
        assert migrate("upgrade", "head").returncode == 0
        assert migrate("check").returncode == 0
        with database.engine.connect() as connection:
            assert connection.scalar(text("SELECT id::text FROM enquiry")) == legacy["id"]
            assert (
                connection.scalar(
                    text(
                        "SELECT count(*) FROM enquiry WHERE created_by_user_id IS NOT NULL "
                        "AND website_source_id IS NULL"
                    )
                )
                == 1
            )
        from app.cli.website_source import configure
        from app.intake.configuration import load_key
        from tests.test_intake import delivery

        with database.engine.connect() as connection:
            uid = connection.scalar(text('SELECT id FROM "user" LIMIT 1'))
        configure(uid)
        delivery(database, load_key(settings))
        result = migrate("downgrade", "0021_discovery_indexes")
        assert result.returncode != 0 and "WEBSITE_HISTORY_DOWNGRADE_REFUSED" in result.stderr
    finally:
        assert migrate("upgrade", "head").returncode == 0
        clear_identity(settings, database)
