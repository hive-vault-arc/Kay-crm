"""Explicit security-only cleanup, never a business-history purge."""

import json
import sys

from app.runtime import require_venv


def main() -> None:
    require_venv()
    from app.db.isolation import assert_isolated
    from app.db.session import Database
    from app.discovery.audit import purge_security
    from app.settings import load_settings

    settings = load_settings()
    if settings.app_environment != "development":
        assert_isolated(settings)
    try:
        confirmed = (
            sys.stdin.isatty()
            and input("Security audit older than24 months only. Type PURGE_SECURITY_AUDIT: ")
            == "PURGE_SECURITY_AUDIT"
        )
    except EOFError, KeyboardInterrupt:
        confirmed = False
    if not confirmed:
        raise SystemExit("RETENTION_CONFIRMATION_REQUIRED")
    database = Database(settings.selected_database_url())
    try:
        print(json.dumps({"security_events_removed": purge_security(database)}))
    finally:
        database.close()


if __name__ == "__main__":
    main()
