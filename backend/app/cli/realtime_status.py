import json

from app.runtime import require_operator_runtime


def main() -> None:
    require_operator_runtime()
    from app.db.isolation import assert_runtime_target
    from app.db.session import Database
    from app.realtime.status import status
    from app.settings import load_settings

    settings = load_settings()
    assert_runtime_target(settings)
    database = Database(settings.selected_database_url())
    try:
        print(json.dumps(status(database)))
    finally:
        database.close()


if __name__ == "__main__":
    main()
