"""Bounded cleanup of expired staging/orphan objects, never committed evidence."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select

from app.db.session import Database
from app.discovery.models import ExportJob
from app.files.models import DocumentVersion, FilePermit
from app.files.storage import PrivateStorage
from app.imports.models import ImportBatch
from app.settings import Settings


def reconcile(database: Database, settings: Settings, now: datetime | None = None) -> int:
    instant = now or datetime.now(UTC)
    storage = PrivateStorage(settings)
    removed = 0
    for path in storage.root.iterdir():
        if removed >= 100:
            break
        if path.suffix not in {".part", ".blob"} or len(path.stem) != 32:
            continue
        try:
            key = UUID(hex=path.stem)
        except ValueError:
            continue
        storage.guard(path)
        if not path.is_file() or datetime.fromtimestamp(
            path.stat().st_mtime, UTC
        ) > instant - timedelta(hours=1):
            continue
        with database.session() as session, session.begin():
            export = session.scalar(
                select(ExportJob).where(ExportJob.object_key == key).with_for_update()
            )
            if export is not None:
                continue
            batch = session.scalar(
                select(ImportBatch).where(ImportBatch.object_key == key).with_for_update()
            )
            if batch and (
                batch.file_hash is not None
                or (batch.permit_expires_at and batch.permit_expires_at > instant)
            ):
                continue
            version = session.scalar(
                select(DocumentVersion).where(DocumentVersion.object_key == key).with_for_update()
            )
            if version and (
                version.state != "awaiting_upload"
                or session.scalar(
                    select(FilePermit.id)
                    .where(FilePermit.version_id == version.id, FilePermit.expires_at > instant)
                    .limit(1)
                )
            ):
                continue
            if version:
                version.scan_error = "FILE_TRANSFER_INTERRUPTED"
            # Exact UUID path in this environment only; a database failure never reaches unlink.
            path.unlink()
            removed += 1
    return removed
