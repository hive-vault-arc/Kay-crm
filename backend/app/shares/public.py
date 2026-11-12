"""Anonymous capability reads. A capability has no CRM session privileges."""

import hmac
import re
from datetime import UTC, datetime
from io import BytesIO
from threading import BoundedSemaphore
from typing import cast

from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.files.storage import PrivateStorage
from app.identity.security import IdentityError
from app.settings import Settings
from app.shares.contracts import Snapshot
from app.shares.inventory import current_publication, photo_rows, publication_target, target
from app.shares.models import ListingLink, ListingPublication
from app.shares.service import digest, link_token

TOKEN = re.compile(r"[A-Za-z0-9_-]{43}")
image_slots = BoundedSemaphore(2)


def authorize(
    session: Session, settings: Settings, token: str
) -> tuple[ListingPublication, Snapshot]:
    if not TOKEN.fullmatch(token):
        raise IdentityError("NOT_FOUND", 404)
    link = session.scalar(select(ListingLink).where(ListingLink.token_hash == digest(token)))
    if (
        link is None
        or link.revoked_at is not None
        or link.expires_at <= datetime.now(UTC)
        or not hmac.compare_digest(
            link_token(settings.facade_secret.get_secret_value(), link), token
        )
    ):
        raise IdentityError("NOT_FOUND", 404)
    item = session.get(ListingPublication, link.publication_id)
    if item is None or item.version != link.publication_version:
        raise IdentityError("NOT_FOUND", 404)
    record, parent = target(session, *publication_target(item))
    if not current_publication(item, record, parent):
        raise IdentityError("NOT_FOUND", 404)
    return item, Snapshot.model_validate(item.snapshot)


def read_listing(session: Session, settings: Settings, token: str) -> dict[str, object]:
    item, snapshot = authorize(session, settings, token)
    available = photo_rows(session, *publication_target(item), snapshot.photos)
    return {
        **snapshot.model_dump(exclude={"photos"}),
        "photos": [
            position for position, image in enumerate(snapshot.photos) if image in available
        ],
    }


def sanitized_webp(data: bytes) -> bytes:
    """Decode a scanned static WebP and drop all original metadata from public bytes."""
    try:
        with Image.open(BytesIO(data), formats=["WEBP"]) as original:
            if (
                original.width * original.height > 40_000_000
                or getattr(original, "n_frames", 1) != 1
            ):
                raise IdentityError("NOT_FOUND", 404)
            original.thumbnail((1920, 1920))
            image = original.convert("RGBA" if "A" in original.getbands() else "RGB")
            image.info.clear()
            with BytesIO() as output:
                image.save(output, format="WEBP", quality=83, method=2)
                return output.getvalue()
    except UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError:
        raise IdentityError("NOT_FOUND", 404) from None


def read_photo(session: Session, settings: Settings, token: str, position: int) -> bytes:
    item, snapshot = authorize(session, settings, token)
    if not 0 <= position < len(snapshot.photos):
        raise IdentityError("NOT_FOUND", 404)
    selected = snapshot.photos[position]
    candidate = photo_rows(session, *publication_target(item), [selected]).get(selected)
    if candidate is None:
        raise IdentityError("NOT_FOUND", 404)
    key, size, checksum = candidate.object_key, candidate.size_bytes, candidate.sha256
    session.rollback()  # Do not hold a DB connection while Spaces and Pillow run.
    data = sanitized_webp(PrivateStorage(settings).read(key, size, cast(bytes, checksum)))
    verified, latest = authorize(session, settings, token)
    if (
        position >= len(latest.photos)
        or latest.photos[position] != selected
        or not photo_rows(session, *publication_target(verified), [selected])
    ):
        raise IdentityError("NOT_FOUND", 404)
    return data
