"""Run the reviewed database-independent selection without workstation configuration."""

import os
import secrets

import psycopg
import pytest
from sqlalchemy import Engine


def main() -> int:
    for variable in (
        "TEST_DATABASE_URL",
        "BENCHMARK_DATABASE_URL",
        "RECOVERY_DATABASE_URL",
        "PRODUCTION_DATABASE_HOST",
    ):
        os.environ.pop(variable, None)
    os.environ.update(
        APP_ENVIRONMENT="development",
        DATABASE_URL="postgresql+psycopg://synthetic@127.0.0.1:1/kay_unit_unavailable",
        FACADE_SECRET=secrets.token_hex(32),
        FRONTEND_ORIGIN="https://localhost:3000",
    )
    from app.settings import Settings

    Settings.model_config["env_file"] = None

    def refused(*args: object, **kwargs: object) -> None:
        raise AssertionError("DATABASE_CONNECTION_FORBIDDEN_IN_UNIT_MODE")

    with pytest.MonkeyPatch.context() as shield:
        shield.setattr(Engine, "connect", refused)
        shield.setattr(psycopg, "connect", refused)
        shield.setattr(psycopg.Connection, "connect", refused)
        return int(pytest.main(["--unit-only", "-q", "--tb=short", "--maxfail=1"]))


if __name__ == "__main__":
    raise SystemExit(main())
