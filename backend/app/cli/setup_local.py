"""Privately configure the authorized Windows PostgreSQL and local HTTPS setup."""

import json
import re
import secrets
import sys
import winreg
from pathlib import Path

import psycopg
import trustme
from dotenv import dotenv_values
from psycopg import sql
from sqlalchemy.engine import URL

from app.runtime import BACKEND_ROOT

ROOT = BACKEND_ROOT.parent
CERTIFICATES = BACKEND_ROOT / ".local-data" / "certificates"
TARGETS = [
    "kayrealestate",
    "kayrealestate_test",
    "kayrealestate_benchmark",
    "kayrealestate_recovery",
]


def installation() -> tuple[Path, Path, str, int]:
    """Use verified installer metadata and postgresql.conf, not guessed credentials."""
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\PostgreSQL\Installations") as key:
        child = winreg.EnumKey(key, 0)
        with winreg.OpenKey(key, child) as item:
            base = Path(winreg.QueryValueEx(item, "Base Directory")[0])
            data = Path(winreg.QueryValueEx(item, "Data Directory")[0])
            role = str(winreg.QueryValueEx(item, "Super User")[0])
    config = (data / "postgresql.conf").read_text(encoding="utf-8")
    port = re.search(r"(?m)^\s*port\s*=\s*(\d+)", config)
    if not port:
        raise RuntimeError("POSTGRES_PORT_NOT_VERIFIED")
    return base / "bin", data, role, int(port.group(1))


def supplied_password() -> str:
    """Read the single supplied inline password privately, never print its source."""
    note = ROOT / "docs/03-planning/local-database-credentials.md"
    values: list[str] = [
        value
        for line in note.read_text(encoding="utf-8").splitlines()
        if re.search(r"password|mot de passe", line, re.IGNORECASE)
        for value in re.findall(r"`([^`]+)`", line)
    ]
    if len(values) != 1:
        raise RuntimeError("PRIVATE_NOTE_FORMAT_REQUIRES_REVIEW")
    return values[0]


def write_environment(path: Path, updates: dict[str, str]) -> None:
    """Generate ignored runtime output without discarding unrelated existing keys."""
    values = {key: value for key, value in dotenv_values(path).items() if value is not None}
    values.update(updates)
    path.write_text(
        "# Private local runtime configuration. Never commit.\n"
        + "\n".join(f"{key}={json.dumps(value)}" for key, value in values.items())
        + "\n",
        encoding="utf-8",
    )


def configure_databases() -> None:
    """Provision only missing named isolated targets; never reset existing contents."""
    binary, _, role, port = installation()
    password = supplied_password()
    host = "localhost"
    with psycopg.connect(
        dbname="kayrealestate",
        host=host,
        port=port,
        user=role,
        password=password,
        connect_timeout=3,
        autocommit=True,
    ) as connection:
        verified = connection.execute(
            "SELECT current_database(), current_user, inet_server_port(), version()"
        ).fetchone()
        if not verified or verified[0] != "kayrealestate" or verified[2] != port:
            raise RuntimeError("DATABASE_IDENTITY_NOT_VERIFIED")
        for name in TARGETS[1:]:
            exists = connection.execute("SELECT 1 FROM pg_database WHERE datname=%s", (name,))
            if not exists.fetchone():
                connection.execute(
                    sql.SQL("CREATE DATABASE {} TEMPLATE template0").format(sql.Identifier(name))
                )
    updates = {
        key: URL.create(
            "postgresql+psycopg",
            username=role,
            password=password,
            host=host,
            port=port,
            database=name,
        ).render_as_string(hide_password=False)
        for key, name in zip(
            [
                "DATABASE_URL",
                "TEST_DATABASE_URL",
                "BENCHMARK_DATABASE_URL",
                "RECOVERY_DATABASE_URL",
            ],
            TARGETS,
            strict=True,
        )
    }
    previous = dotenv_values(BACKEND_ROOT / ".env")
    updates.update(
        {
            "FACADE_SECRET": previous.get("FACADE_SECRET") or secrets.token_urlsafe(48),
            "FRONTEND_ORIGIN": "https://localhost:3000",
            "POSTGRES_BIN": str(binary),
        }
    )
    write_environment(BACKEND_ROOT / ".env", updates)
    write_environment(
        ROOT / "frontend/.env.local",
        {
            "API_BASE_URL": "https://localhost:8000",
            "FACADE_SECRET": updates["FACADE_SECRET"],
            "API_CA_FILE": str(CERTIFICATES / "ca.pem"),
        },
    )
    print("Local PostgreSQL verified; ignored configuration and isolated targets prepared.")


def configure_https() -> None:
    """Generate once; no OS trust-store changes and no global TLS bypass."""
    CERTIFICATES.mkdir(parents=True, exist_ok=True)
    paths = [CERTIFICATES / name for name in ("ca.pem", "localhost.pem", "localhost-key.pem")]
    if any(path.exists() for path in paths):
        if not all(path.exists() for path in paths):
            raise RuntimeError("PARTIAL_CERTIFICATE_SET_REFUSED")
        return
    authority = trustme.CA()
    certificate = authority.issue_cert("localhost", "127.0.0.1", "::1")
    authority.cert_pem.write_to_path(paths[0])
    certificate.cert_chain_pems[0].write_to_path(paths[1])
    certificate.private_key_pem.write_to_path(paths[2])
    print("Ignored localhost certificates generated; no personal/system trust modified.")


def main() -> None:
    """Bootstrap only local foundation resources approved by SP-02."""
    try:
        configure_databases()
        configure_https()
    except Exception:
        print("LOCAL_SETUP_FAILED: verify the private note, installer and local privileges.")
        sys.exit(1)


if __name__ == "__main__":
    main()
