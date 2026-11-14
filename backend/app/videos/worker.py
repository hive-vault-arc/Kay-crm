"""Durable processing isolated from reminders and ordinary file scans."""

import hashlib
import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import UUID, uuid4

from sqlalchemy import delete, or_, select, text

from app.db.session import Database
from app.files.scanner import scan_stream
from app.identity.security import IdentityError
from app.inventory.hierarchy_models import Development
from app.inventory.models import Property
from app.settings import Settings
from app.videos.encoding import encode
from app.videos.models import InventoryVideo, PlaybackGrant, VideoPart
from app.videos.service import parent, part_count, part_key
from app.videos.storage import VideoStorage

logger = logging.getLogger(__name__)
ENCODE_LOCK = 268357293
MAX_ATTEMPTS = 3


def claim(database: Database) -> tuple[UUID, UUID, UUID] | None:
    now = datetime.now(UTC)
    with database.session() as session, session.begin():
        row = session.scalar(
            select(InventoryVideo)
            .where(
                InventoryVideo.state.in_(["queued", "processing"]),
                InventoryVideo.archived_at.is_(None),
                or_(InventoryVideo.lease_until.is_(None), InventoryVideo.lease_until <= now),
            )
            .order_by(InventoryVideo.created_at, InventoryVideo.id)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if row is None:
            return None
        if row.attempts >= MAX_ATTEMPTS:
            row.state = "failed"
            row.error_code = "VIDEO_PROCESSING_FAILED"
            return None
        row.state = "processing"
        row.attempts += 1
        fence = uuid4()
        output = row.output_key or uuid4()
        row.fence = fence
        row.output_key = output
        row.lease_until = now + timedelta(minutes=20)
        return row.id, fence, output


def assembled(database: Database, storage: VideoStorage, vid: UUID, path: Path) -> None:
    with database.session() as session:
        row = session.get(InventoryVideo, vid)
        parts = session.scalars(
            select(VideoPart).where(VideoPart.video_id == vid).order_by(VideoPart.number)
        ).all()
        if (
            row is None
            or len(parts) != part_count(row.input_size)
            or sum(part.size_bytes for part in parts) != row.input_size
        ):
            raise IdentityError("FILE_INTEGRITY_ERROR", 503)
    with path.open("xb") as source:
        for part in parts:
            source.write(storage.read(part.object_key, part.size_bytes, part.sha256))


def publish(
    database: Database,
    storage: VideoStorage,
    vid: UUID,
    fence: UUID,
    key: UUID,
    path: Path,
    seconds: int,
) -> None:
    size = path.stat().st_size
    with path.open("rb") as stream:
        checksum = hashlib.file_digest(stream, "sha256").digest()
        stream.seek(0)
        with database.session() as session, session.begin():
            row = session.get(InventoryVideo, vid, with_for_update=True)
            if row is None or row.archived_at or row.fence != fence or row.state != "processing":
                return
            kind, target = parent(row)
            record = (
                session.get(Property, target)
                if kind == "property"
                else session.get(Development, target)
            )
            if record is None or record.archived_at:
                row.archived_at = datetime.now(UTC)
                return
            storage.write(key, stream, size)
            row.state = "ready"
            row.duration_seconds = seconds
            row.output_size = size
            row.output_hash = checksum
            row.error_code = None
            row.lease_until = None
            row.fence = None
            row.upload_hash = None
            row.upload_session_id = None


def failed(database: Database, vid: UUID, fence: UUID, problem: IdentityError) -> None:
    with database.session() as session, session.begin():
        row = session.get(InventoryVideo, vid, with_for_update=True)
        if row is None or row.fence != fence or row.state != "processing":
            return
        retry = problem.status >= 500 and row.attempts < MAX_ATTEMPTS
        row.state = "queued" if retry else "failed"
        row.lease_until = (
            datetime.now(UTC) + timedelta(seconds=15 * row.attempts) if retry else None
        )
        row.fence = None
        row.error_code = None if retry else problem.code
        logger.warning(
            "Inventory video processing %s: %s", "retry" if retry else "failed", problem.code
        )


def cleanup(database: Database, storage: VideoStorage) -> None:
    now = datetime.now(UTC)
    with database.session() as session, session.begin():
        session.execute(delete(PlaybackGrant).where(PlaybackGrant.expires_at <= now))
        rows = session.scalars(
            select(InventoryVideo)
            .where(
                or_(
                    InventoryVideo.state == "ready",
                    InventoryVideo.archived_at.is_not(None),
                    InventoryVideo.state == "failed",
                    (InventoryVideo.state == "uploading") & (InventoryVideo.expires_at <= now),
                ),
                InventoryVideo.next_part >= 0,
            )
            .order_by(InventoryVideo.created_at)
            .limit(4)
            .with_for_update(skip_locked=True)
        ).all()
        for row in rows:
            expired = row.state == "uploading" and row.expires_at <= now
            # Keep the published object, and clear every possible staged key,
            # including a part written just before an interrupted DB commit.
            for number in range(min(row.next_part + 1, part_count(row.input_size))):
                storage.delete_blob(part_key(row.id, number))
            session.execute(delete(VideoPart).where(VideoPart.video_id == row.id))
            if row.output_key and row.state != "ready":
                storage.delete_blob(row.output_key)
                row.output_key = None
            if expired:
                row.archived_at = now
            row.next_part = -1
            row.upload_hash = None
            row.upload_session_id = None


def run_once(database: Database, settings: Settings) -> bool:
    with database.engine.connect() as connection:
        if not connection.scalar(text("SELECT pg_try_advisory_lock(:id)"), {"id": ENCODE_LOCK}):
            return False
        connection.commit()
        try:
            storage = VideoStorage(settings)
            work = claim(database)
            if work is not None:
                vid, fence, key = work
                try:
                    with TemporaryDirectory(prefix="kay-inventory-video-") as directory:
                        source = Path(directory) / "original.mov"
                        target = Path(directory) / "encoded.mp4"
                        assembled(database, storage, vid, source)
                        with source.open("rb") as stream:
                            state, _ = scan_stream(settings, stream)
                        if state != "clean":
                            raise IdentityError("VIDEO_SCAN_REJECTED", 422)
                        seconds = encode(source, target)
                        publish(database, storage, vid, fence, key, target, seconds)
                except IdentityError as error:
                    failed(database, vid, fence, error)
                except OSError:
                    failed(database, vid, fence, IdentityError("FILE_STORAGE_UNAVAILABLE", 503))
            cleanup(database, storage)
            return work is not None
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(:id)"), {"id": ENCODE_LOCK})
