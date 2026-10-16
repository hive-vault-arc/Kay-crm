"""Configure only an empty, disposable GitHub-hosted Windows checkout."""

import os
import secrets
from pathlib import Path

import psycopg
from psycopg import sql
from sqlalchemy.engine import URL

from app.cli.setup_local import TARGETS, configure_https, write_environment
from app.runtime import BACKEND_ROOT, require_venv


def main() -> None:
    require_venv()
    root = BACKEND_ROOT.parent
    if (
        os.environ.get("GITHUB_ACTIONS") != "true"
        or os.environ.get("CI") != "true"
        or os.name != "nt"
        or Path(os.environ.get("GITHUB_WORKSPACE", "")).resolve() != root
        or (BACKEND_ROOT / ".env").exists()
        or (root / "frontend/.env.local").exists()
        or (BACKEND_ROOT / ".local-data/certificates").exists()
    ):
        raise RuntimeError("FRESH_GITHUB_CHECKOUT_REQUIRED")
    password = os.environ["CI_POSTGRES_PASSWORD"]
    port = 5433
    with psycopg.connect(
        host="127.0.0.1",
        port=port,
        user="postgres",
        password=password,
        dbname="postgres",
        autocommit=True,
    ) as connection:
        if connection.info.server_version // 10000 != 18:
            raise RuntimeError("POSTGRES18_REQUIRED")
        if connection.execute(
            "SELECT datname FROM pg_database WHERE datname = ANY(%s)", (TARGETS,)
        ).fetchall():
            raise RuntimeError("EXISTING_CI_DATABASE_REFUSED")
        for name in TARGETS:
            connection.execute(
                sql.SQL("CREATE DATABASE {} TEMPLATE template0").format(sql.Identifier(name))
            )
    secret = secrets.token_urlsafe(48)
    print(f"::add-mask::{secret}")
    updates = {
        key: URL.create(
            "postgresql+psycopg",
            username="postgres",
            password=password,
            host="127.0.0.1",
            port=port,
            database=name,
        ).render_as_string(hide_password=False)
        for key, name in zip(
            (
                "DATABASE_URL",
                "TEST_DATABASE_URL",
                "BENCHMARK_DATABASE_URL",
                "RECOVERY_DATABASE_URL",
            ),
            TARGETS,
            strict=True,
        )
    }
    updates.update(
        FACADE_SECRET=secret,
        FRONTEND_ORIGIN="https://localhost:3000",
        POSTGRES_BIN=os.environ["CI_POSTGRES_BIN"],
    )
    write_environment(BACKEND_ROOT / ".env", updates)
    configure_https()
    write_environment(
        root / "frontend/.env.local",
        {
            "API_BASE_URL": "https://localhost:8000",
            "API_CA_FILE": str(BACKEND_ROOT / ".local-data/certificates/ca.pem"),
            "FACADE_SECRET": secret,
        },
    )
    print("Disposable PostgreSQL targets and ignored HTTPS configuration prepared.")


if __name__ == "__main__":
    main()
