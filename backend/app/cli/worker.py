"""Run bounded PostgreSQL file and internal-reminder work from the pinned venv."""

import argparse
import json
import logging
import time
from datetime import UTC, datetime
from threading import Event, Thread

from app.runtime import require_operator_runtime


def main() -> None:
    require_operator_runtime()
    from app.db.isolation import assert_runtime_target
    from app.db.session import Database
    from app.discovery.export_worker import run_once as export_once
    from app.files.worker import run_once
    from app.intake.worker import run_once as intake_once
    from app.realtime.events import install
    from app.realtime.push import run_once as push_once
    from app.recovery.maintenance import Admission
    from app.settings import load_settings
    from app.work.birthdays import deliver_birthdays
    from app.work.holiday_sync import sync_loop
    from app.work.holidays import deliver_holidays
    from app.work.status import queue_status
    from app.work.worker import run_once as remind_once

    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--once", action="store_true")
    mode.add_argument("--status", action="store_true")
    args = parser.parse_args()
    settings = load_settings()
    assert_runtime_target(settings)
    database = Database(settings.selected_database_url())
    stop_publisher = None
    if settings.realtime_enabled:
        stop_publisher = install(database)
    admission = Admission(settings)
    birthday_poll = holiday_poll = 0.0
    sync_stop = Event()
    sync_thread = None
    try:
        if args.status:
            print(json.dumps(queue_status(database)))
            return
        if settings.holidays_enabled and not args.once and settings.app_environment != "test":
            sync_thread = Thread(
                target=sync_loop,
                args=(database, admission, sync_stop),
                name="kay-holiday-sync",
                daemon=True,
            )
            sync_thread.start()
        while True:
            if not admission.enter():
                if args.once:
                    return
                time.sleep(0.5)
                continue
            try:
                worked = run_once(database, settings)
                reminded = remind_once(database)
                exported = export_once(database, settings)
                received = intake_once(database)
                pushed = push_once(database, settings)
                birthdays = 0
                if time.monotonic() >= birthday_poll:
                    try:
                        birthdays = deliver_birthdays(database, datetime.now(UTC))
                    except Exception:
                        logging.getLogger("kay.worker").warning(
                            "BIRTHDAY_REMINDER_DELIVERY_UNAVAILABLE"
                        )
                    if not birthdays:
                        birthday_poll = time.monotonic() + 30
                holidays = 0
                if settings.holidays_enabled and time.monotonic() >= holiday_poll:
                    try:
                        holidays = deliver_holidays(database, datetime.now(UTC))
                    except Exception:
                        logging.getLogger("kay.worker").warning(
                            "HOLIDAY_REMINDER_DELIVERY_UNAVAILABLE"
                        )
                    if not holidays:
                        holiday_poll = time.monotonic() + 30
            finally:
                admission.leave()
            if args.once:
                return
            if (
                not worked
                and not reminded
                and not exported
                and not received
                and not pushed
                and not birthdays
                and not holidays
            ):
                time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        sync_stop.set()
        if sync_thread:
            sync_thread.join(timeout=12)
        if stop_publisher:
            stop_publisher()
        database.close()


if __name__ == "__main__":
    main()
