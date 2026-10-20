"""Private environment-separated UUID keys; original filenames never form paths."""

import hashlib
import logging
import os
from pathlib import Path
from typing import Any
from uuid import UUID

import boto3  # type: ignore[import-untyped]
from botocore.config import Config  # type: ignore[import-untyped]
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]

from app.identity.security import IdentityError
from app.runtime import BACKEND_ROOT
from app.settings import Settings

logger = logging.getLogger(__name__)
SAFE_PROVIDER_CODES = frozenset(
    {
        "AccessDenied",
        "InvalidAccessKeyId",
        "NoSuchBucket",
        "NoSuchKey",
        "RequestTimeout",
        "SignatureDoesNotMatch",
    }
)


def log_storage_failure(operation: str, error: Exception) -> None:
    code = error.response.get("Error", {}).get("Code") if isinstance(error, ClientError) else None
    logger.warning(
        "Private object %s failed: %s",
        operation,
        code if isinstance(code, str) and code in SAFE_PROVIDER_CODES else type(error).__name__,
    )


class PrivateStorage:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
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
        if self.settings.storage_backend == "spaces":
            source = self.path(key, partial=True)
            try:
                with source.open("rb") as handle:
                    self._client().put_object(
                        Bucket=self.settings.spaces_bucket,
                        Key=self._object_key(key),
                        Body=handle,
                        ContentLength=source.stat().st_size,
                        ContentType="application/octet-stream",
                    )
                source.unlink()
            except (BotoCoreError, ClientError, OSError) as error:
                log_storage_failure("write", error)
                raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503) from None
            return
        source, target = self.path(key, partial=True), self.path(key)
        os.link(source, target)  # Atomic no-clobber publication, still private quarantine.
        source.unlink()

    def read(self, key: UUID, expected_size: int, expected_hash: bytes | None) -> bytes:
        if self.settings.storage_backend == "spaces":
            try:
                response = self._client().get_object(
                    Bucket=self.settings.spaces_bucket, Key=self._object_key(key)
                )
                body = response["Body"]
                try:
                    data = bytes(body.read(expected_size + 1))
                finally:
                    body.close()
            except (BotoCoreError, ClientError, OSError) as error:
                log_storage_failure("read", error)
                raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503) from None
            if len(data) != expected_size or hashlib.sha256(data).digest() != expected_hash:
                raise IdentityError("FILE_INTEGRITY_ERROR", 503)
            return data
        try:
            with self.path(key).open("rb") as handle:
                data = handle.read(expected_size + 1)
        except OSError:
            raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503) from None
        if len(data) != expected_size or hashlib.sha256(data).digest() != expected_hash:
            raise IdentityError("FILE_INTEGRITY_ERROR", 503)
        return data

    def _object_key(self, key: UUID) -> str:
        return f"{self.settings.app_environment}/{key.hex}.blob"

    def _client(self) -> Any:
        key = self.settings.spaces_key
        secret = self.settings.spaces_secret
        if (
            not self.settings.spaces_endpoint
            or not self.settings.spaces_bucket
            or not key
            or not secret
        ):
            raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503)
        return boto3.client(
            "s3",
            endpoint_url=self.settings.spaces_endpoint,
            region_name=self.settings.spaces_region,
            aws_access_key_id=key.get_secret_value(),
            aws_secret_access_key=secret.get_secret_value(),
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"},
                connect_timeout=5,
                read_timeout=30,
                retries={"max_attempts": 2},
            ),
        )
