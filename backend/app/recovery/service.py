"""Coherent local points; only the independently resolved recovery target can be replaced."""

import hashlib
import json
import os
import re
import shutil
import tempfile
import time
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Connection, text

from app.db.isolation import assert_isolated, resolve_identity
from app.db.session import Database
from app.files.storage import PrivateStorage
from app.recovery import postgres
from app.recovery.maintenance import pause, ready_path
from app.recovery.private import RecoveryError, guard, protect_directory, seal, unseal
from app.recovery.snapshot import (
    authority,
    code_paths,
    compatibility,
    head_revision,
    inventory,
    tables,
)
from app.recovery.store import Store
from app.runtime import BACKEND_ROOT
from app.settings import Settings


def staging() -> Path:
    root = BACKEND_ROOT / ".local-data" / "recovery" / "staging"
    protect_directory(root)
    return Path(tempfile.mkdtemp(prefix="operation-", dir=root))


def clear_staging(path: Path) -> None:
    root = BACKEND_ROOT / ".local-data" / "recovery" / "staging"
    guard(path, root)
    if path.parent != root or not path.name.startswith("operation-"):
        raise RecoveryError("RECOVERY_PATH_REFUSED")
    for child in path.iterdir():
        guard(child, path)
        if not child.is_file():
            raise RecoveryError("RECOVERY_PATH_REFUSED")
        child.unlink()
    path.rmdir()


def freeze(connection: Connection) -> None:
    if int(connection.exec_driver_sql("SHOW server_version_num").scalar_one()) // 10000 != 18:
        raise RecoveryError("POSTGRES18_REQUIRED")
    names = tables(connection)
    if not names:
        raise RecoveryError("BACKUP_SCHEMA_REQUIRED")
    connection.exec_driver_sql("SET LOCAL statement_timeout='30s'")
    connection.exec_driver_sql(
        "LOCK TABLE " + ",".join('"' + n + '"' for n in names) + " IN SHARE MODE"
    )
    connection.exec_driver_sql("SET LOCAL statement_timeout='240s'")


def create(settings: Settings) -> dict[str, object]:
    if settings.app_environment not in {"development", "test"}:
        raise RecoveryError("BACKUP_SOURCE_REFUSED")
    if settings.app_environment != "development":
        assert_isolated(settings)
    store, identifier, work = Store(settings), uuid4(), staging()
    point = store.point(identifier)
    try:
        with pause(settings) as connection:
            point.mkdir(mode=0o700)
            freeze(connection)
            revision = connection.scalar(text("SELECT version_num FROM alembic_version"))
            if revision != head_revision():
                raise RecoveryError("BACKUP_SCHEMA_REFUSED")
            identity = resolve_identity(connection.engine)
            instant = datetime.now(UTC)
            manifest: dict[str, Any] = {
                "format": 1,
                "point_id": str(identifier),
                "source_environment": settings.app_environment,
                "source_identity": {
                    "cluster": identity.cluster,
                    "oid": identity.oid,
                    "name": identity.name,
                },
                "snapshot_at": instant.isoformat(),
                "revision": revision,
                "lsn": connection.scalar(text("SELECT pg_current_wal_lsn()::text")),
                "compatibility": compatibility(),
                "tables": inventory(connection),
                "authority": authority(connection),
                "payloads": {},
            }
            postgres.run(settings, work, restore=False)
            with zipfile.ZipFile(
                work / "application.zip", "w", compression=zipfile.ZIP_DEFLATED
            ) as archive:
                for code in code_paths():
                    archive.write(code, code.relative_to(BACKEND_ROOT.parent).as_posix())
            manifest["payloads"]["application.zip"] = seal(
                work / "application.zip",
                point / "application.zip.sealed",
                str(identifier).encode() + b"application.zip",
            )
            manifest["payloads"]["database.dump"] = seal(
                work / "database.dump",
                point / "database.dump.sealed",
                str(identifier).encode() + b"database.dump",
            )
            storage = PrivateStorage(settings)
            for source in storage.root.iterdir():
                storage.guard(source)
                if (
                    not re.fullmatch(r"[a-f0-9]{32}\.(blob|part)", source.name)
                    or not source.is_file()
                ):
                    raise RecoveryError("BACKUP_OBJECT_REFUSED")
                manifest["payloads"][source.name] = seal(
                    source,
                    point / (source.name + ".sealed"),
                    str(identifier).encode() + source.name.encode(),
                )
            validate_objects(connection, storage.root)
            manifest["completed_at"] = datetime.now(UTC).isoformat()
            store.publish(identifier, manifest)
        return {
            "point_id": str(identifier),
            "snapshot_at": manifest["snapshot_at"],
            "completed_at": manifest["completed_at"],
            "objects": sum(name.endswith((".blob", ".part")) for name in manifest["payloads"]),
        }
    finally:
        clear_staging(work)


def validate_objects(connection: Connection, root: Path) -> None:
    references = connection.execute(
        text("""
        SELECT object_key,size_bytes,sha256 FROM document_version WHERE sha256 IS NOT NULL
        UNION ALL SELECT object_key,size_bytes,file_hash FROM import_batch
        WHERE file_hash IS NOT NULL
        UNION ALL SELECT object_key,size_bytes,file_hash FROM export_job WHERE state='ready'
    """)
    )
    for key, size, digest in references:
        path = root / (UUID(str(key)).hex + ".blob")
        guard(path, root)
        if not path.is_file() or path.stat().st_size != size:
            raise RecoveryError("BACKUP_REFERENCED_OBJECT_MISSING")
        with path.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").digest() != digest:
                raise RecoveryError("BACKUP_REFERENCED_OBJECT_CORRUPT")


def recovery_settings(source: Settings) -> Settings:
    target = source.model_copy(update={"app_environment": "recovery"})
    identity = assert_isolated(target)
    # A configuration alias to either test/benchmark is refused too, not just development.
    for env in ("development", "test", "benchmark"):
        db = Database(source.model_copy(update={"app_environment": env}).selected_database_url())
        try:
            other = resolve_identity(db.engine)
            if (identity.cluster, identity.oid) == (other.cluster, other.oid):
                raise RecoveryError("RECOVERY_TARGET_REFUSED")
        finally:
            db.close()
    return target


def revoke_and_reconcile(connection: Connection) -> dict[str, int]:
    revoked = connection.exec_driver_sql(
        "UPDATE session SET revoked_at=COALESCE(revoked_at,now())"
    ).rowcount
    connection.exec_driver_sql("UPDATE file_permit SET consumed_at=COALESCE(consumed_at,now())")
    # Committed imports are wholly immutable; revoked issuing sessions already deny their permits.
    connection.exec_driver_sql("""UPDATE import_batch SET permit_hash=NULL,binding_hash=NULL,
        permit_session_id=NULL,permit_expires_at=NULL,permit_consumed_at=NULL,
        state=CASE WHEN state='uploading' THEN 'awaiting_upload' ELSE state END
        WHERE state<>'committed'""")
    connection.exec_driver_sql("""UPDATE export_job SET permit_hash=NULL,binding_hash=NULL,
        permit_session_id=NULL,permit_expires_at=NULL,permit_consumed_at=NULL""")
    reset = connection.exec_driver_sql("""UPDATE job SET
        state=CASE WHEN attempts<5 THEN 'retry' ELSE 'failed' END,
        lease_token=NULL,lease_until=NULL,available_at=now(),error_code='WORKER_INTERRUPTED'
        WHERE state='running'""").rowcount
    connection.exec_driver_sql("UPDATE website_source SET active=false")
    # Finance/import originals and completed effects are never replayed.
    return {"sessions_revoked": revoked, "running_jobs_fenced": reset}


def restore(
    source: Settings, point_id: UUID, *, replace_recovery: bool = False
) -> dict[str, object]:
    incident, started = datetime.now(UTC), time.monotonic()
    if source.app_environment not in {"development", "test"}:
        raise RecoveryError("BACKUP_SOURCE_REFUSED")
    if source.app_environment == "test":
        assert_isolated(source)
    target = recovery_settings(source)
    store, work = Store(source), staging()
    try:
        manifest = store.read(point_id)
        if (
            manifest["format"] != 1
            or manifest["compatibility"] != compatibility()
            or manifest["revision"] != head_revision()
        ):
            raise RecoveryError("BACKUP_COMPATIBILITY_REFUSED")
        snapshot_at = datetime.fromisoformat(manifest["snapshot_at"])
        rpo = (incident - snapshot_at).total_seconds()
        if rpo < 0 or (incident - datetime.fromisoformat(manifest["completed_at"])).days >= 30:
            raise RecoveryError("BACKUP_EXPIRED")
        for name, fact in manifest["payloads"].items():
            unseal(
                store.point(point_id) / (name + ".sealed"),
                work / name,
                str(point_id).encode() + name.encode(),
                fact,
            )
        if not (work / "database.dump").is_file():
            raise RecoveryError("BACKUP_MANIFEST_REFUSED")
        with pause(source) as current, pause(target) as destination:
            ready_path().unlink(missing_ok=True)
            freeze(current)
            current_id = resolve_identity(current.engine)
            if (
                manifest["source_identity"]
                != {"cluster": current_id.cluster, "oid": current_id.oid, "name": current_id.name}
                or manifest["source_environment"] != source.app_environment
            ):
                raise RecoveryError("BACKUP_SOURCE_REFUSED")
            if manifest["authority"] != authority(current, manifest["authority"]["scope"]):
                raise RecoveryError("CURRENT_AUTHORITY_REVIEW_REQUIRED")
            if tables(destination) and not replace_recovery:
                raise RecoveryError("RECOVERY_TARGET_NOT_EMPTY")
            # Destruction is restricted to the re-resolved recovery identity and fixed directory.
            assert_isolated(target)
            ready_path().unlink(missing_ok=True)
            destination.exec_driver_sql("DROP SCHEMA IF EXISTS public CASCADE")
            destination.commit()
            postgres.run(target, work, restore=True)
            if inventory(destination) != manifest["tables"]:
                raise RecoveryError("RESTORED_ROWS_DIFFER")
            if (
                destination.scalar(text("SELECT version_num FROM alembic_version"))
                != manifest["revision"]
            ):
                raise RecoveryError("RESTORED_SCHEMA_DIFFERS")
            validate_objects(destination, work)
            storage = PrivateStorage(target)
            if storage.root.resolve() != (BACKEND_ROOT / ".local-data/files/recovery").resolve():
                raise RecoveryError("RECOVERY_PATH_REFUSED")
            for old in storage.root.iterdir():
                storage.guard(old)
                if not re.fullmatch(r"[a-f0-9]{32}\.(blob|part)", old.name) or not old.is_file():
                    raise RecoveryError("RECOVERY_PATH_REFUSED")
            for old in storage.root.iterdir():
                old.unlink()
            for name in manifest["payloads"]:
                if name not in {"database.dump", "application.zip"}:
                    shutil.copyfile(work / name, storage.root / name)
            validate_objects(destination, storage.root)
            changes = revoke_and_reconcile(destination)
            destination.commit()
            rto = time.monotonic() - started
            if rto > 14400:
                raise RecoveryError("RECOVERY_RTO_EXCEEDED")
            report = {
                "point_id": str(point_id),
                "verified_tables": len(manifest["tables"]),
                "objects": sum(name.endswith((".blob", ".part")) for name in manifest["payloads"]),
                "rpo_seconds": rpo,
                "rpo_objective_met": rpo <= 3600,
                "restore_seconds": rto,
                "incident_at": incident.isoformat(),
                "snapshot_at": manifest["snapshot_at"],
                "compatibility": manifest["compatibility"],
                "target_identity": {
                    "oid": assert_isolated(target).oid,
                    "cluster": assert_isolated(target).cluster,
                },
                **changes,
            }
            protect_directory(ready_path().parent)
            temporary = ready_path().with_suffix(".part")
            temporary.write_text(json.dumps(report), encoding="utf8")
            os.replace(temporary, ready_path())
            return report
    finally:
        clear_staging(work)


def tick(settings: Settings, now: datetime | None = None) -> dict[str, object]:
    instant = now or datetime.now(UTC)
    store = Store(settings)
    status = store.status(instant)
    point = None
    age = status["latest_age_seconds"]
    if age is None or (isinstance(age, (int, float)) and age >= 1800):
        point = create(settings)
    return {"created": point is not None, "expired": store.expire(instant)}


def extract_code(settings: Settings, point_id: UUID) -> dict[str, str]:
    store = Store(settings)
    manifest = store.read(point_id)
    root = BACKEND_ROOT / ".local-data" / "recovery" / "artifacts"
    protect_directory(root)
    target = root / (str(uuid4()) + ".zip")
    guard(target, root)
    unseal(
        store.point(point_id) / "application.zip.sealed",
        target,
        str(point_id).encode() + b"application.zip",
        manifest["payloads"]["application.zip"],
    )
    return {"protected_code_archive": str(target)}
