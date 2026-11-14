"""Streaming I/O for the existing private object store."""

import os
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import BinaryIO, cast
from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]

from app.files.storage import PrivateStorage, log_storage_failure
from app.identity.security import IdentityError


class VideoStorage(PrivateStorage):
    def write(self, key: UUID, source: BinaryIO, size: int) -> None:
        temporary: Path | None = None
        try:
            if self.settings.storage_backend == "spaces":
                self._client().put_object(
                    Bucket=self.settings.spaces_bucket,
                    Key=self._object_key(key),
                    Body=source,
                    ContentLength=size,
                    ContentType="application/octet-stream",
                )
                return
            temporary = self.path(uuid4(), partial=True)
            with temporary.open("xb") as handle:
                while data := source.read(65536):
                    handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self.path(key))
        except (BotoCoreError, ClientError, OSError) as error:
            log_storage_failure("video write", error)
            raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503) from None
        finally:
            if temporary:
                temporary.unlink(missing_ok=True)

    def delete_blob(self, key: UUID) -> None:
        try:
            if self.settings.storage_backend == "spaces":
                self._client().delete_object(
                    Bucket=self.settings.spaces_bucket, Key=self._object_key(key)
                )
            else:
                self.path(key).unlink(missing_ok=True)
        except (BotoCoreError, ClientError, OSError) as error:
            log_storage_failure("video cleanup", error)
            raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503) from None

    @contextmanager
    def open_range(self, key: UUID, start: int, end: int) -> Iterator[BinaryIO]:
        try:
            if self.settings.storage_backend == "spaces":
                response = self._client().get_object(
                    Bucket=self.settings.spaces_bucket,
                    Key=self._object_key(key),
                    Range=f"bytes={start}-{end}",
                )
                with cast(BinaryIO, response["Body"]) as stream:
                    yield stream
            else:
                with self.path(key).open("rb") as stream:
                    stream.seek(start)
                    yield stream
        except (BotoCoreError, ClientError, OSError) as error:
            log_storage_failure("video read", error)
            raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503) from None
