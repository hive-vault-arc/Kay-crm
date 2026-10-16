"""Deterministic SQL evidence and exact runtime compatibility, without record output."""

import hashlib
import json
import re
from pathlib import Path

from alembic.script import ScriptDirectory
from sqlalchemy import Connection, text

from app.recovery.private import RecoveryError, guard
from app.runtime import BACKEND_ROOT


def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def code_paths() -> list[Path]:
    root = BACKEND_ROOT.parent
    paths: list[Path] = []
    for directory in ("backend/app", "backend/alembic", "frontend/src"):
        paths.extend(
            p
            for p in (root / directory).rglob("*")
            if p.suffix in {".py", ".ts", ".tsx", ".css"} and "__pycache__" not in p.parts
        )
    paths.extend(
        root / name
        for name in (
            "backend/pyproject.toml",
            "backend/requirements.txt",
            "backend/requirements.lock",
            "backend/requirements-dev.lock",
            "frontend/package.json",
            "frontend/package-lock.json",
        )
    )
    paths.extend(
        root / name
        for name in (
            "backend/alembic.ini",
            "frontend/next.config.ts",
            "frontend/postcss.config.mjs",
            "frontend/scripts/start.mjs",
            "frontend/scripts/dev.mjs",
        )
    )
    paths.extend(p for p in (root / "frontend/public").rglob("*") if p.is_file())
    for path in paths:
        guard(path, root)
        if path.name.startswith(".env") or path.suffix.lower() in {".key", ".pem", ".pfx", ".p12"}:
            raise RecoveryError("BACKUP_CODE_SECRET_REFUSED")
    return sorted(paths)


def compatibility() -> str:
    root = BACKEND_ROOT.parent
    digest = hashlib.sha256()
    for path in code_paths():
        digest.update(path.relative_to(root).as_posix().encode() + b"\0" + path.read_bytes())
    return digest.hexdigest()


def head_revision() -> str | None:
    return ScriptDirectory(str(BACKEND_ROOT / "alembic")).get_current_head()


def tables(connection: Connection) -> list[str]:
    names = list(
        connection.scalars(
            text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
        )
    )
    if not all(re.fullmatch(r"[a-z_]+", name) for name in names):
        raise RuntimeError("SNAPSHOT_SCHEMA_REFUSED")
    return names


def rows_digest(
    connection: Connection, query: str, params: dict[str, object] | None = None
) -> dict[str, object]:
    digest, count = hashlib.sha256(), 0
    rows = connection.execution_options(stream_results=True).execute(
        # Queries are assembled only from the fixed schema allowlist below.
        text("SELECT body FROM (" + query + ') q ORDER BY body COLLATE "C"'),  # noqa: S608
        params or {},
    )
    for row in rows:
        digest.update(row[0].encode() + b"\n")
        count += 1
    rows.close()
    connection.execution_options(stream_results=False)
    return {"rows": count, "sha256": digest.hexdigest()}


def inventory(connection: Connection) -> dict[str, dict[str, object]]:
    return {
        name: rows_digest(connection, f'SELECT to_jsonb(t)::text AS body FROM "{name}" t')  # noqa: S608
        for name in tables(connection)
    }


ACCESS = {
    "agency": ("id", "id,bootstrap_completed_at"),
    "user": ("id", "id,role,state,version"),
    "credential": (
        "user_id",
        "user_id,password_hash,must_change_password,temporary_expires_at,version",
    ),
    "contact": ("id", "id,primary_agent_id,archived_at,merged_into_contact_id"),
    "contact_phone": ("id", "id,contact_id,normalized,archived_at"),
    "document": ("id", "id,contact_id,development_id,property_id,deal_id,archived_at"),
    "property": ("id", "id,archived_at"),
    "development": ("id", "id,archived_at"),
    "visit_schedule_policy": ("agency_id", "*"),
    "visit_working_window": ("id", "*"),
    "visit_break_window": ("id", "*"),
}


def authority(
    connection: Connection, scope: dict[str, list[str]] | None = None
) -> dict[str, object]:
    keys = (
        scope
        if scope is not None
        else {
            table: [
                str(value)
                for value in connection.scalars(text(f'SELECT "{key}" FROM "{table}"'))  # noqa: S608
            ]
            for table, (key, _) in ACCESS.items()
        }
    )
    result: dict[str, object] = {"scope": keys}
    for table, (key, columns) in ACCESS.items():
        query = (  # noqa: S608 - fixed ACCESS identifiers, UUID values separately bound.
            f'SELECT to_jsonb(t)::text AS body FROM (SELECT {columns} FROM "{table}" '  # noqa: S608
            f'WHERE "{key}"=ANY(CAST(:keys AS uuid[]))) t'
        )
        result[table] = rows_digest(connection, query, {"keys": keys[table]})
    result["collaborators"] = rows_digest(
        connection,
        "SELECT to_jsonb(t)::text AS body FROM contact_collaborator t "
        "WHERE contact_id=ANY(CAST(:keys AS uuid[]))",
        {"keys": keys["contact"]},
    )
    return result
