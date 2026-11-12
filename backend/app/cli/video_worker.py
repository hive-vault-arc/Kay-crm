"""Run the optional video worker in its own process and resource lane."""

import argparse
import logging
import time

from app.runtime import require_operator_runtime


def main() -> None:
    require_operator_runtime()
    from app.db.isolation import assert_runtime_target
    from app.db.session import Database
    from app.identity.security import IdentityError
    from app.recovery.maintenance import Admission
    from app.settings import load_settings
    from app.videos.service import enabled
    from app.videos.worker import run_once

    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    settings = load_settings()
    if not enabled(settings):
        raise SystemExit("INVENTORY_VIDEO_DISABLED")
    assert_runtime_target(settings)
    database = Database(settings.selected_database_url())
    admission = Admission(settings)
    try:
        while True:
            worked = False
            if admission.enter():
                try:
                    worked = run_once(database, settings)
                except IdentityError as error:
                    logging.warning("Inventory video worker dependency: %s", error.code)
                finally:
                    admission.leave()
            if args.once:
                return
            if not worked:
                time.sleep(5)
    except KeyboardInterrupt:
        pass
    finally:
        database.close()


if __name__ == "__main__":
    main()
