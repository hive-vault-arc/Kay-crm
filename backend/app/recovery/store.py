"""Authenticated encrypted points, strict fixed paths and controlled-clock retention."""

import hashlib
import hmac
import json
import os
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import UUID

from app.recovery.private import RecoveryError, crypt, guard, protect_directory
from app.recovery.snapshot import canonical
from app.runtime import BACKEND_ROOT
from app.settings import Settings


class Store:
    def __init__(self, settings: Settings) -> None:
        self.root = BACKEND_ROOT / ".local-data" / "backups" / settings.app_environment
        protect_directory(self.root)
        key = self.root / "key.dpapi"
        guard(key, self.root)
        if not key.exists():
            try:
                with key.open("xb") as stream:
                    stream.write(crypt(os.urandom(32), b"kay-backup-key-v1", encrypt=True))
                    stream.flush()
                    os.fsync(stream.fileno())
            except FileExistsError:
                pass
        self.key = crypt(key.read_bytes(), b"kay-backup-key-v1", encrypt=False)
        if len(self.key) != 32:
            raise RecoveryError("BACKUP_KEY_REFUSED")

    def point(self, identity: UUID) -> Path:
        path = self.root / str(UUID(str(identity)))
        guard(path, self.root)
        return path

    def publish(self, identity: UUID, manifest: dict[str, Any]) -> None:
        root = self.point(identity)
        data = canonical(
            {
                "manifest": manifest,
                "signature": hmac.new(self.key, canonical(manifest), hashlib.sha256).hexdigest(),
            }
        )
        with (root / "manifest.part").open("xb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(root / "manifest.part", root / "manifest.json")

    def read(self, identity: UUID) -> dict[str, Any]:
        path = self.point(identity) / "manifest.json"
        guard(path, self.root)
        try:
            if path.stat().st_size > 4 * 1024 * 1024:
                raise ValueError
            envelope = json.loads(path.read_bytes())
            manifest, signature = envelope["manifest"], envelope["signature"]
            expected = hmac.new(self.key, canonical(manifest), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected, signature) or manifest["point_id"] != str(
                identity
            ):
                raise ValueError
            required = {
                "format",
                "source_environment",
                "source_identity",
                "snapshot_at",
                "completed_at",
                "revision",
                "lsn",
                "compatibility",
                "tables",
                "authority",
                "payloads",
            }
            if not required <= manifest.keys() or manifest["format"] != 1:
                raise ValueError
            for name in manifest["payloads"]:
                if name not in {"database.dump", "application.zip"} and not re.fullmatch(
                    r"[a-f0-9]{32}\.(blob|part)", name
                ):
                    raise ValueError
                guard(self.point(identity) / (name + ".sealed"), self.root)
            return dict(manifest)
        except OSError, ValueError, KeyError, TypeError:
            raise RecoveryError("BACKUP_MANIFEST_REFUSED") from None

    def expire(self, now: datetime) -> int:
        removed = 0
        for path in self.root.iterdir():
            try:
                identity = UUID(path.name)
            except ValueError:
                continue
            if str(identity) != path.name:
                continue
            if not (path / "manifest.json").exists():
                continue
            try:
                manifest = self.read(identity)
            except RecoveryError:
                continue  # Preserve corrupt points for operator inspection, never purge blindly.
            if datetime.fromisoformat(manifest["completed_at"]) >= now - timedelta(days=30):
                continue
            expected = {name + ".sealed" for name in manifest["payloads"]} | {"manifest.json"}
            if {p.name for p in path.iterdir()} != expected:
                raise RecoveryError("BACKUP_RETENTION_REFUSED")
            for child in path.iterdir():
                guard(child, self.root)
                child.unlink()
            path.rmdir()
            removed += 1
        return removed

    def status(self, now: datetime | None = None) -> dict[str, object]:
        points = []
        incomplete = 0
        invalid = 0
        for path in self.root.iterdir():
            if re.fullmatch(r"[a-f0-9-]{36}", path.name):
                if not (path / "manifest.json").exists():
                    incomplete += 1
                    continue
                try:
                    points.append(self.read(UUID(path.name)))
                except RecoveryError:
                    invalid += 1
        instant = now or datetime.now(UTC)
        latest = max((datetime.fromisoformat(p["snapshot_at"]) for p in points), default=None)
        age = (instant - latest).total_seconds() if latest else None
        return {
            "completed_points": len(points),
            "incomplete_points": incomplete,
            "invalid_points": invalid,
            "requires_attention": bool(incomplete or invalid),
            "latest_age_seconds": age,
            "lagging": age is None or age > 3600,
        }
