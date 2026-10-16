"""Private environment-separated UUID keys; original filenames never form paths."""

import hashlib
import os
from pathlib import Path
from uuid import UUID

from app.identity.security import IdentityError
from app.runtime import BACKEND_ROOT
from app.settings import Settings


class PrivateStorage:
    def __init__(self, settings: Settings) -> None:
        self.root = BACKEND_ROOT / ".local-data" / "files" / settings.app_environment
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.guard(self.root)

    def guard(self, path: Path) -> None:
        allowed = BACKEND_ROOT / ".local-data" / "files"
        for item in (path, *path.parents):
            if item.is_symlink() or (
                item.exists() and getattr(item.stat(), "st_file_attributes", 0) & 0x400
            ):
                raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503)
            if item == BACKEND_ROOT:
                break
        if not path.resolve().is_relative_to(allowed.resolve()):
            raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503)

    def path(self, key: UUID, *, partial: bool = False) -> Path:
        path = self.root / f"{key.hex}{'.part' if partial else '.blob'}"
        self.guard(path)
        return path

    def promote(self, key: UUID) -> None:
        source, target = self.path(key, partial=True), self.path(key)
        os.link(source, target)  # Atomic no-clobber publication, still private quarantine.
        source.unlink()

    def read(self, key: UUID, expected_size: int, expected_hash: bytes | None) -> bytes:
        try:
            with self.path(key).open("rb") as handle:
                data = handle.read(expected_size + 1)
        except OSError:
            raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503) from None
        if len(data) != expected_size or hashlib.sha256(data).digest() != expected_hash:
            raise IdentityError("FILE_INTEGRITY_ERROR", 503)
        return data
