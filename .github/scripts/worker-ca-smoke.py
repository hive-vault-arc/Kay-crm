"""Exercise managed worker configuration, with all database connections forbidden."""

import contextlib
import io
import os
import secrets
import sys
from pathlib import Path
from unittest.mock import patch


def main() -> None:
    os.environ["APP_ENVIRONMENT"] = "production"
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
    from app.cli.check_postgres_ca import checked_ca_path

    certificate = checked_ca_path()
    if "app.settings" in sys.modules:
        raise RuntimeError("CA_PREFLIGHT_MUST_PRECEDE_SETTINGS")
    from sqlalchemy import Engine

    from app.cli import worker
    from app.db.session import Database
    from app.settings import Settings

    settings = Settings(
        _env_file=None,
        app_environment="production",
        production_database_host="kay-postgres.synthetic.invalid",
        database_url=(
            "postgresql://synthetic:synthetic-probe@kay-postgres.synthetic.invalid:25060/"
            f"kay_runtime_probe?sslmode=verify-full&sslrootcert={certificate}"
        ),
        test_database_url=None,
        benchmark_database_url=None,
        recovery_database_url=None,
        facade_secret=secrets.token_hex(32),
        frontend_origin="https://kay.synthetic.invalid",
    )
    observed: list[Database] = []

    def configured(database: Database) -> dict[str, bool]:
        if dict(database.engine.url.query) != {
            "sslmode": "verify-full",
            "sslrootcert": str(certificate),
        }:
            raise RuntimeError("WORKER_CA_CONFIGURATION_INVALID")
        observed.append(database)
        return {"configuration_only": True}

    def refused(*args: object, **kwargs: object) -> None:
        raise RuntimeError("DATABASE_CONNECTION_FORBIDDEN_IN_CA_PROBE")

    with (
        patch.object(Engine, "connect", refused),
        patch("app.settings.load_settings", return_value=settings),
        patch("app.work.status.queue_status", configured),
        patch.object(sys, "argv", ["worker", "--status"]),
        contextlib.redirect_stdout(io.StringIO()),
    ):
        worker.main()
    if len(observed) != 1 or not observed[0].closed:
        raise RuntimeError("WORKER_CA_LIFECYCLE_INVALID")
    print(f"WORKER_CA_CONFIGURATION_OK: sslrootcert={certificate}; database connection forbidden.")


if __name__ == "__main__":
    main()
