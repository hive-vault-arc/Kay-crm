"""Synthetic-only subprocess probe for a committed effect without acknowledgement."""

import json
import re
import sys
from datetime import datetime

from sqlalchemy import select

from app.db.isolation import assert_isolated
from app.db.session import Database
from app.identity.models import User
from app.runtime import require_venv
from app.settings import load_settings
from app.work.worker import claim, deliver, dispatch, run_once


def main() -> int:
    require_venv()
    settings = load_settings()
    if settings.app_environment != "test":
        raise RuntimeError("SYNTHETIC_TEST_REQUIRED")
    assert_isolated(settings)
    database = Database(settings.selected_database_url())
    try:
        with database.session() as session:
            emails = session.scalars(select(User.email)).all()
            if not emails or any(
                not re.fullmatch(r"sp03-[a-f0-9]{32}@example.com", value) for value in emails
            ):
                raise RuntimeError("SYNTHETIC_ACCOUNTS_REQUIRED")
        command = json.loads(sys.stdin.buffer.read(1024))
        clock = datetime.fromisoformat(command["clock"])
        if command.get("crash_after_effect") is True:
            dispatch(database)
            work = claim(database, clock)
            if work is None or not deliver(database, *work, clock):
                raise RuntimeError("EXPECTED_DURABLE_WORK")
            return 87
        count = 0
        while count < 50 and run_once(database, clock):
            count += 1
        print(json.dumps({"processed": count}))
        return 0
    finally:
        database.close()


if __name__ == "__main__":
    sys.exit(main())
