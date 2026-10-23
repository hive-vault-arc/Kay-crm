"""Real separate worker restarts plus additive populated SP-14 schema preservation."""

import json
import os
import subprocess
import sys
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text

from app.files.models import Notification, OutboxEvent
from app.runtime import BACKEND_ROOT
from tests.deal_support import setup
from tests.test_isolation_migrations import migrate
from tests.test_work import CLOCK, new, run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def process(clock, crash=False):
    return subprocess.run(
        [sys.executable, "-m", "tests.reminder_process"],
        cwd=BACKEND_ROOT,
        env={**os.environ, "APP_ENVIRONMENT": "test"},
        input=json.dumps({"clock": clock.isoformat(), "crash_after_effect": crash}),
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )


def test_actual_worker_process_stop_restart_after_effect_has_one_notification(settings, database):
    uid, token, contact, _ = setup(settings, database)
    run(settings, database, token, new(uid, contact))
    assert json.loads(process(CLOCK - timedelta(days=1, seconds=1)).stdout) == {"processed": 0}
    assert json.loads(process(CLOCK - timedelta(days=1)).stdout) == {"processed": 1}
    assert json.loads(process(CLOCK - timedelta(hours=1)).stdout) == {"processed": 1}
    assert json.loads(process(CLOCK - timedelta(seconds=1)).stdout) == {"processed": 0}
    assert process(CLOCK, crash=True).returncode == 87
    assert json.loads(process(CLOCK).stdout) == {"processed": 0}
    restarted = process(CLOCK + timedelta(seconds=91))
    assert restarted.returncode == 0 and json.loads(restarted.stdout) == {"processed": 1}
    assert json.loads(process(CLOCK + timedelta(minutes=2)).stdout) == {"processed": 0}
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Notification)) == 3


def test_actual_cli_worker_once_delivers_due_task(settings, database):
    uid, token, contact, _ = setup(settings, database)
    run(settings, database, token, new(uid, contact, due_at="2000-01-01T00:00:00Z"))
    for _ in range(3):
        result = subprocess.run(
            [sys.executable, "-m", "app.cli.worker", "--once"],
            cwd=BACKEND_ROOT,
            env={**os.environ, "APP_ENVIRONMENT": "test"},
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        assert result.returncode == 0
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Notification)) == 1
    status = subprocess.run(
        [sys.executable, "-m", "app.cli.worker", "--status"],
        cwd=BACKEND_ROOT,
        env={**os.environ, "APP_ENVIRONMENT": "test"},
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert status.returncode == 0
    assert json.loads(status.stdout) == {
        "jobs": [
            {"kind": "task.due", "state": "done", "count": 1},
            {"kind": "task.reminder.day", "state": "invalidated", "count": 1},
            {"kind": "task.reminder.hour", "state": "invalidated", "count": 1},
        ],
        "undispatched": 0,
    }


def test_populated_0016_migration_preserves_visit_actor_history_and_backfills_outbox(
    settings, database
):
    from tests.contact_support import actor
    from tests.legacy_support import contact as legacy_contact
    from tests.legacy_support import enquiry as legacy_enquiry

    uid, token = actor(settings, database)
    assert migrate("downgrade", "0016_visit_calendar").returncode == 0
    vid = uuid4()
    try:
        contact = legacy_contact(database, uid)
        legacy_enquiry(database, uid, contact)
        with database.engine.begin() as connection:
            connection.execute(text("SET LOCAL kay.visit_action='created'"))
            connection.execute(
                text("""INSERT INTO visit(id,contact_id,origin_contact_id,organizer_user_id,
                  title,type,status,start_at,end_at,location,version,policy_version,updated_by_user_id)
                  VALUES(:id,:cid,:cid,:uid,'SP15 visite existante','office','scheduled',
                  :start,:end,'Lieu synthétique',1,1,:uid)"""),
                dict(id=vid, cid=contact, uid=uid, start=CLOCK, end=CLOCK + timedelta(hours=1)),
            )
            connection.execute(
                text("INSERT INTO visit_participant(visit_id,user_id) VALUES(:id,:uid)"),
                dict(id=vid, uid=uid),
            )
            snapshot = dict(
                status="scheduled",
                title="SP15 visite existante",
                contact_id=str(contact),
                start_at=CLOCK.isoformat(),
                end_at=(CLOCK + timedelta(hours=1)).isoformat(),
                participant_ids=[str(uid)],
            )
            connection.execute(
                text("""INSERT INTO visit_event(id,visit_id,actor_user_id,actor_name,
                  action,version,snapshot,reason) VALUES(:event,:id,:uid,
                  'SP15 auteur conservé','created',1,CAST(:snapshot AS jsonb),'')"""),
                dict(event=uuid4(), id=vid, uid=uid, snapshot=json.dumps(snapshot)),
            )
            old_visit = connection.execute(
                text("SELECT to_jsonb(v) FROM visit v WHERE id=:id"), dict(id=vid)
            ).scalar_one()
            old_event = connection.execute(
                text("SELECT to_jsonb(e) FROM visit_event e WHERE visit_id=:id"), dict(id=vid)
            ).scalar_one()
        assert migrate("upgrade", "head").returncode == 0
        with database.engine.connect() as connection:
            current = connection.execute(
                text("SELECT to_jsonb(v) FROM visit v WHERE id=:id"), dict(id=vid)
            ).scalar_one()
            assert current.pop("schedule_version") == 1
            assert current.pop("enquiry_id") is None and current == old_visit
            assert (
                connection.execute(
                    text("SELECT to_jsonb(e) FROM visit_event e WHERE visit_id=:id"), dict(id=vid)
                ).scalar_one()
                == old_event
            )
        with database.session() as session:
            assert session.scalar(select(func.count()).select_from(OutboxEvent)) == 3
        assert migrate("downgrade", "0016_visit_calendar").returncode != 0
        run(settings, database, token, new(uid, contact))
    finally:
        assert migrate("upgrade", "head").returncode == 0
