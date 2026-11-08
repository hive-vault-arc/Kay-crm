"""Owner-selected blank appendices with explicit, checked original provenance."""

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.generated.catalog import BY_CODE, Template

ROOT = Path(__file__).resolve().parent
Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Positive = Annotated[int, Field(gt=0, le=20 * 1024 * 1024)]
Pages = Annotated[int, Field(gt=0, le=100)]


class AppendixUnavailable(Exception):
    """A bundled model cannot be proved to match its recorded derivation."""


class AppendixRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)
    code: str
    source: str
    original_sha256: Digest
    selected_sha256: Digest
    original_bytes: Positive
    selected_bytes: Positive
    original_pages: Pages
    selected_pages: Pages
    normalized_body_sha256: Digest
    literal_parts: Annotated[int, Field(gt=0, le=1000)]


class AppendixManifest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)
    schema_version: Literal[1]
    revision: Literal["kay-selected-2026-10-25"]
    source_date: Literal["2026-10-16"]
    approved_on: Literal["2026-10-28"]
    content_file: Literal["appendix-content.json"]
    content_sha256: Digest
    models: Annotated[list[AppendixRecord], Field(min_length=12, max_length=12)]

    @model_validator(mode="after")
    def complete_catalogue(self) -> AppendixManifest:
        if {item.code for item in self.models} != set(BY_CODE) or any(
            item.source != BY_CODE[item.code].source for item in self.models
        ):
            raise ValueError("APPENDIX_CATALOGUE_MISMATCH")
        return self


@dataclass(frozen=True)
class SelectedAppendix:
    data: bytes
    record: AppendixRecord
    revision: str
    source_date: str


def selected_appendix(template: Template) -> SelectedAppendix:
    """Fixed local resources only; never substitute an unverified or older layout."""
    try:
        manifest = AppendixManifest.model_validate_json(
            (ROOT / "assets/appendix-provenance.json").read_bytes()
        )
        record = next(item for item in manifest.models if item.code == template.code)
        if record.source != template.source:
            raise ValueError("APPENDIX_SOURCE_MISMATCH")
        original = (ROOT / "templates" / record.source).read_bytes()
        selected = (ROOT / "styled_templates" / record.source).read_bytes()
        content = (ROOT / "assets" / manifest.content_file).read_bytes()
        if (
            len(original) != record.original_bytes
            or len(selected) != record.selected_bytes
            or hashlib.sha256(original).hexdigest() != record.original_sha256
            or hashlib.sha256(selected).hexdigest() != record.selected_sha256
            or hashlib.sha256(content).hexdigest() != manifest.content_sha256
        ):
            raise ValueError("APPENDIX_DIGEST_MISMATCH")
        return SelectedAppendix(selected, record, manifest.revision, manifest.source_date)
    except OSError, ValueError, StopIteration, KeyError:
        raise AppendixUnavailable("APPENDIX_UNAVAILABLE") from None
