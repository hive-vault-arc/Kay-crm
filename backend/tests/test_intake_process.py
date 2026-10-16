import os
import subprocess
import sys
import time

import pytest
from sqlalchemy import func, select, text

from app.contacts.models import Contact, Enquiry
from app.intake.models import WebsiteReceipt
from app.runtime import BACKEND_ROOT
from tests.test_intake import delivery, setup_source


@pytest.mark.usefixtures("clean_identity")
def test_intake_real_worker_killed_after_receipt_and_restarted_exactly_once(settings, database):
    _, _, key = setup_source(settings, database)
    delivery(database, key)
    worker = None
    with database.engine.connect() as blocker:
        transaction = blocker.begin()
        blocker.execute(text("SELECT id FROM agency FOR UPDATE"))
        try:
            worker = subprocess.Popen(
                [sys.executable, "-m", "app.cli.worker"],
                cwd=BACKEND_ROOT,
                env={**os.environ, "APP_ENVIRONMENT": "test"},
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )  # noqa: S603 - explicit venv/fixed module.
            deadline, blocked = time.monotonic() + 7, False
            while time.monotonic() < deadline:
                with database.engine.connect() as observer:
                    blocked = bool(
                        observer.scalar(
                            text(
                                "SELECT count(*) FROM pg_stat_activity "
                                "WHERE datname=current_database() AND wait_event_type='Lock' "
                                "AND query LIKE '%agency%'"
                            )
                        )
                    )
                if blocked:
                    break
                time.sleep(0.02)
            assert blocked and worker.poll() is None
        finally:
            if worker and worker.poll() is None:
                stopped = subprocess.run(  # noqa: S603 - exact owned process tree only.
                    ["C:/Windows/System32/taskkill.exe", "/PID", str(worker.pid), "/T", "/F"],
                    capture_output=True,
                    timeout=10,
                    check=False,
                )  # noqa: S603 - exact owned process tree only.
                assert stopped.returncode == 0
                worker.wait(timeout=10)
            transaction.rollback()
    with database.session() as session:
        assert session.scalar(select(WebsiteReceipt.state)) == "queued"
        assert session.scalar(select(func.count()).select_from(Enquiry)) == 0
    for _ in range(2):
        restarted = subprocess.run(
            [sys.executable, "-m", "app.cli.worker", "--once"],
            cwd=BACKEND_ROOT,
            env={**os.environ, "APP_ENVIRONMENT": "test"},
            capture_output=True,
            timeout=20,
            check=False,
        )  # noqa: S603 - fixed venv module, no shell.
        assert restarted.returncode == 0
    with database.session() as session:
        assert session.scalar(select(WebsiteReceipt.state)) == "processed"
        assert session.scalar(select(func.count()).select_from(Contact)) == 1
        assert session.scalar(select(func.count()).select_from(Enquiry)) == 1
