"""Strict metadata contracts: resource type is never inferred from an arbitrary ID."""

import unicodedata
from pathlib import PurePosixPath
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_FILE_BYTES = 20 * 1024 * 1024
FORMATS = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid")


class NewDocument(Contract):
    parent_kind: Literal["contact", "development", "property", "deal"]
    parent_id: UUID
    filename: str = Field(min_length=1, max_length=180)
    mime_type: str = Field(min_length=1, max_length=120)
    size_bytes: int = Field(strict=True, gt=0, le=MAX_FILE_BYTES)

    @field_validator("filename")
    @classmethod
    def filename_safe(cls, value: str) -> str:
        if (
            value != value.strip()
            or any(c in value for c in '/\\:"<>|?*')
            or any(unicodedata.category(c).startswith("C") for c in value)
        ):
            raise ValueError("UNSUPPORTED_MEDIA_TYPE")
        if PurePosixPath(value).suffix.lower() not in FORMATS:
            raise ValueError("UNSUPPORTED_MEDIA_TYPE")
        return value


class PermitRequest(Contract):
    action: Literal["upload", "download"]
    document_id: UUID
    expected_version: int = Field(strict=True, gt=0)
    version_id: UUID | None = None


class ArchiveDocument(Contract):
    expected_version: int = Field(strict=True, gt=0)
