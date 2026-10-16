"""PostgreSQL18 binaries with private passfiles, no shell and redacted failures."""

import os
import subprocess
from pathlib import Path

from sqlalchemy.engine import make_url

from app.recovery.private import RecoveryError
from app.settings import Settings


def run(settings: Settings, staging: Path, *, restore: bool) -> None:
    url = make_url(settings.selected_database_url())
    binary = settings.postgres_bin / ("pg_restore.exe" if restore else "pg_dump.exe")
    version = subprocess.run(  # noqa: S603 - configured local operator binary, fixed arguments.
        [str(binary), "--version"], capture_output=True, timeout=5, check=True
    )
    if b"(PostgreSQL) 18." not in version.stdout:
        raise RecoveryError("POSTGRES18_REQUIRED")
    passfile = staging / ".pgpass"

    def escape(value: object) -> str:
        return str(value).replace("\\", "\\\\").replace(":", "\\:")

    passfile.write_text(
        ":".join(
            escape(v)
            for v in (url.host, url.port or 5432, url.database, url.username, url.password)
        )
        + "\n",
        encoding="utf8",
    )
    try:
        env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
        env.update(PGPASSFILE=str(passfile), PGOPTIONS="-c timezone=UTC", PGAPPNAME="kay-recovery")
        args = [
            str(binary),
            "--no-password",
            "--host",
            str(url.host),
            "--port",
            str(url.port or 5432),
            "--username",
            str(url.username),
            "--dbname",
            str(url.database),
            "--no-owner",
            "--no-acl",
        ]
        if restore:
            args += ["--single-transaction", "--exit-on-error", str(staging / "database.dump")]
        else:
            args += ["--format=custom", "--schema=public", "--file", str(staging / "database.dump")]
        result = subprocess.run(  # noqa: S603 - argument list, no password/URL or shell.
            args, env=env, capture_output=True, timeout=240
        )
        if result.returncode or result.stderr:
            if restore and b'schema "public" already exists' in result.stderr:
                raise RecoveryError("PG_RESTORE_SCHEMA_EXISTS")
            raise RecoveryError("PG_RESTORE_FAILED" if restore else "PG_DUMP_FAILED")
    except subprocess.TimeoutExpired:
        raise RecoveryError("POSTGRES_TOOL_TIMEOUT") from None
    finally:
        passfile.unlink(missing_ok=True)
