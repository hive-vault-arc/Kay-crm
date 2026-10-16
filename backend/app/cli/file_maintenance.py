"""Reconcile only old, uncommitted local file objects without purging evidence."""

from app.runtime import require_venv


def main() -> None:
    require_venv()
    from app.db.isolation import assert_isolated
    from app.db.session import Database
    from app.files.reconcile import reconcile
    from app.recovery.maintenance import Admission
    from app.settings import load_settings

    settings = load_settings()
    if settings.app_environment != "development":
        assert_isolated(settings)
    database = Database(settings.selected_database_url())
    admission = Admission(settings)
    try:
        if not admission.enter():
            raise RuntimeError("MAINTENANCE_ACTIVE")
        print(f"FILE_RECONCILIATION_REMOVED={reconcile(database, settings)}")
    finally:
        if admission.users:
            admission.leave()
        database.close()


if __name__ == "__main__":
    main()
