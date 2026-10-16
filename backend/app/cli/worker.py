"""Run bounded PostgreSQL file and internal-reminder work from the pinned venv."""

import argparse
import json
import time

from app.runtime import require_venv


def main() -> None:
    require_venv()
    from app.db.isolation import assert_isolated
    from app.db.session import Database
    from app.discovery.export_worker import run_once as export_once
    from app.files.worker import run_once
    from app.intake.worker import run_once as intake_once
    from app.recovery.maintenance import Admission
    from app.settings import load_settings
    from app.work.status import queue_status
    from app.work.worker import run_once as remind_once

    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--once", action="store_true")
    mode.add_argument("--status", action="store_true")
    args = parser.parse_args()
    settings = load_settings()
    if settings.app_environment != "development":
        assert_isolated(settings)
    database = Database(settings.selected_database_url())
    admission = Admission(settings)
    try:
        if args.status:
            print(json.dumps(queue_status(database)))
            return
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
            finally:
                admission.leave()
            if args.once:
                return
            if not worked and not reminded and not exported and not received:
                time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        database.close()


if __name__ == "__main__":
    main()
