"""Scoped inventory access, resumable uploads and revocable playback."""

import hashlib
import math
import secrets
from datetime import UTC, datetime, timedelta
from io import BytesIO
from pathlib import PurePath
from typing import Literal
from uuid import UUID, uuid5

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import Database
from app.files.service import authorize, locked_identity
from app.identity.security import IdentityError
from app.identity.sessions import current_identity, identity_for_session, require_role
from app.inventory.hierarchy_models import Development
from app.inventory.models import Property
from app.settings import Settings
from app.videos.models import InventoryVideo, PlaybackGrant, VideoPart
from app.videos.storage import VideoStorage

ParentKind = Literal["property", "development"]
MAX_VIDEO = 300_000_000
MAX_OUTPUT = 48_000_000
MAX_DURATION = 180
PART_SIZE = 8 * 1024 * 1024
MAX_VIDEOS = 5
PENDING_LIFETIME = timedelta(hours=24)
PLAYBACK_LIFETIME = timedelta(minutes=10)


class NewVideo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    parent_kind: ParentKind
    parent_id: UUID
    filename: str = Field(min_length=5, max_length=160)
    size_bytes: int = Field(strict=True, gt=0, le=MAX_VIDEO)
    source_fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")

    @field_validator("filename")
    @classmethod
    def file_label(cls, name: str) -> str:
        name = name.strip()
        if (
            not name
            or any(character in "/\\" or not character.isprintable() for character in name)
            or PurePath(name).suffix.lower() not in {".mov", ".mp4"}
        ):
            raise ValueError("VIDEO_FORMAT_UNSUPPORTED")
        return name


def enabled(settings: Settings) -> bool:
    return settings.inventory_video_enabled and (
        settings.app_environment != "production" or settings.storage_backend == "spaces"
    )


def digest(value: str) -> bytes:
    return hashlib.sha256(value.encode("ascii")).digest()


def parent(video: InventoryVideo) -> tuple[ParentKind, UUID]:
    if video.property_id:
        return "property", video.property_id
    if video.development_id is None:
        raise IdentityError("FILE_INTEGRITY_ERROR", 503)
    return "development", video.development_id


def part_count(size: int) -> int:
    return math.ceil(size / PART_SIZE)


def part_key(video_id: UUID, number: int) -> UUID:
    return uuid5(video_id, f"inventory-video-part:{number}")


def part_size(size: int, number: int) -> int:
    if not 0 <= number < part_count(size):
        raise IdentityError("VALIDATION_ERROR", 422)
    return min(PART_SIZE, size - number * PART_SIZE)


def view(video: InventoryVideo, user_id: UUID, manager: bool) -> dict[str, object]:
    return {
        "id": str(video.id),
        "filename": video.filename,
        "state": video.state,
        "duration_seconds": video.duration_seconds,
        "size_bytes": video.output_size,
        "error_code": video.error_code,
        "can_archive": manager,
        "can_resume": video.state == "uploading" and video.creator_id == user_id,
    }


def listing(database: Database, token: str, kind: ParentKind, target: UUID) -> dict[str, object]:
    with database.session() as session:
        identity = current_identity(session, token)
        authorize(session, identity, kind, target)
        column = InventoryVideo.property_id if kind == "property" else InventoryVideo.development_id
        records = session.scalars(
            select(InventoryVideo)
            .where(
                column == target,
                InventoryVideo.archived_at.is_(None),
                (InventoryVideo.state != "uploading")
                | (InventoryVideo.expires_at > datetime.now(UTC)),
                (InventoryVideo.state != "uploading")
                | (InventoryVideo.creator_id == identity.user.id)
                | (identity.user.role != "agent"),
            )
            .order_by(
                InventoryVideo.state == "failed",
                InventoryVideo.created_at.desc(),
                InventoryVideo.id,
            )
            .limit(25)
        )
        return {
            "enabled": True,
            "items": [
                view(video, identity.user.id, identity.user.role != "agent") for video in records
            ],
        }


def reserve(database: Database, token: str, body: NewVideo) -> dict[str, object]:
    now = datetime.now(UTC)
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        model = Property if body.parent_kind == "property" else Development
        session.scalar(select(model.id).where(model.id == body.parent_id).with_for_update())
        authorize(
            session, identity, body.parent_kind, body.parent_id, write=True, photo_upload=True
        )
        video = session.get(InventoryVideo, body.id, with_for_update=True)
        if video:
            if (
                video.creator_id != identity.user.id
                or parent(video) != (body.parent_kind, body.parent_id)
                or video.source_fingerprint != bytes.fromhex(body.source_fingerprint)
                or video.input_size != body.size_bytes
                or video.filename != body.filename
                or video.archived_at
            ):
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            if video.state != "uploading":
                return {
                    "id": str(video.id),
                    "next_part": part_count(video.input_size),
                    "permit": None,
                }
            if video.expires_at <= now:
                raise IdentityError("VIDEO_UPLOAD_EXPIRED", 409)
        else:
            column = (
                InventoryVideo.property_id
                if body.parent_kind == "property"
                else InventoryVideo.development_id
            )
            count = session.scalar(
                select(func.count())
                .select_from(InventoryVideo)
                .where(
                    column == body.parent_id,
                    InventoryVideo.archived_at.is_(None),
                    (InventoryVideo.state != "uploading") | (InventoryVideo.expires_at > now),
                    InventoryVideo.state != "failed",
                )
            )
            if (count or 0) >= MAX_VIDEOS:
                raise IdentityError("VIDEO_LIMIT", 409)
            recent = session.scalar(
                select(func.count())
                .select_from(InventoryVideo)
                .where(
                    InventoryVideo.creator_id == identity.user.id,
                    InventoryVideo.created_at > now - timedelta(hours=1),
                )
            )
            if (recent or 0) >= 10:
                raise IdentityError("RATE_LIMITED", 429)
            video = InventoryVideo(
                id=body.id,
                creator_id=identity.user.id,
                filename=body.filename,
                input_size=body.size_bytes,
                source_fingerprint=bytes.fromhex(body.source_fingerprint),
                state="uploading",
                created_at=now,
                expires_at=now + PENDING_LIFETIME,
                next_part=0,
                attempts=0,
                **{f"{body.parent_kind}_id": body.parent_id},
            )
            session.add(video)
        permit = secrets.token_urlsafe(32)
        video.upload_hash = digest(permit)
        video.upload_session_id = identity.session.id
        return {"id": str(video.id), "next_part": video.next_part, "permit": permit}


def permitted_part(
    session: Session, vid: UUID, permit: str, number: int, *, lock: bool
) -> InventoryVideo:
    video = session.get(InventoryVideo, vid, with_for_update=lock)
    if (
        video is None
        or video.archived_at
        or video.upload_hash is None
        or not secrets.compare_digest(video.upload_hash, digest(permit))
        or video.upload_session_id is None
        or video.expires_at <= datetime.now(UTC)
    ):
        raise IdentityError("FILE_PERMIT_INVALID", 403)
    identity = identity_for_session(session, video.upload_session_id)
    kind, target = parent(video)
    authorize(session, identity, kind, target, write=True, photo_upload=True)
    part_size(video.input_size, number)
    if number > video.next_part or (number == video.next_part and video.state != "uploading"):
        raise IdentityError("VIDEO_PART_ORDER", 409)
    return video


def accept_part(
    database: Database, settings: Settings, vid: UUID, permit: str, number: int, data: bytes
) -> dict[str, int]:
    with database.session() as session, session.begin():
        video = permitted_part(session, vid, permit, number, lock=True)
        size = part_size(video.input_size, number)
        if len(data) != size:
            raise IdentityError("FILE_SIZE_MISMATCH", 413)
        checksum = hashlib.sha256(data).digest()
        if number < video.next_part:
            part = session.get(VideoPart, (vid, number))
            if part is None or part.sha256 != checksum:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return {"next_part": video.next_part}
        key = part_key(vid, number)
        VideoStorage(settings).write(key, BytesIO(data), size)
        session.expire_all()
        video = permitted_part(session, vid, permit, number, lock=True)
        session.add(
            VideoPart(video_id=vid, number=number, object_key=key, size_bytes=size, sha256=checksum)
        )
        video.next_part += 1
        if video.next_part == part_count(video.input_size):
            video.state = "queued"
        return {"next_part": video.next_part}


def archive(database: Database, token: str, vid: UUID) -> dict[str, bool]:
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        require_role(identity, {"manager"})
        video = session.get(InventoryVideo, vid, with_for_update=True)
        if video is None:
            raise IdentityError("NOT_FOUND", 404)
        authorize(session, identity, *parent(video))
        if video.archived_at is None:
            video.archived_at = datetime.now(UTC)
        return {"archived": True}


def grant_playback(database: Database, token: str, vid: UUID) -> dict[str, str]:
    with database.session() as session, session.begin():
        identity = current_identity(session, token)
        video = session.get(InventoryVideo, vid)
        if video is None or video.archived_at or video.state != "ready":
            raise IdentityError("NOT_FOUND", 404)
        authorize(session, identity, *parent(video))
        grant = secrets.token_urlsafe(32)
        session.add(
            PlaybackGrant(
                digest=digest(grant),
                video_id=vid,
                session_id=identity.session.id,
                expires_at=datetime.now(UTC) + PLAYBACK_LIFETIME,
            )
        )
        return {"grant": grant}


def playback(database: Database, vid: UUID, grant: str) -> tuple[UUID, int]:
    with database.session() as session:
        receipt = session.get(PlaybackGrant, digest(grant))
        if receipt is None or receipt.video_id != vid or receipt.expires_at <= datetime.now(UTC):
            raise IdentityError("FILE_PERMIT_INVALID", 403)
        identity = identity_for_session(session, receipt.session_id)
        video = session.get(InventoryVideo, vid)
        if (
            video is None
            or video.archived_at
            or video.state != "ready"
            or video.output_key is None
            or video.output_size is None
        ):
            raise IdentityError("NOT_FOUND", 404)
        authorize(session, identity, *parent(video))
        return video.output_key, video.output_size
