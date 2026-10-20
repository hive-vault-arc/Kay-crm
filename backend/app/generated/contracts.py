"""Strict, bounded input for server-rendered PDF drafts."""

import unicodedata
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    parent_kind: Literal["enquiry", "deal"]
    parent_id: UUID
    template_code: str = Field(pattern=r"^(0[1-9]|1[0-2])$")
    values: dict[str, str] = Field(max_length=30)

    @field_validator("values")
    @classmethod
    def safe_values(cls, values: dict[str, str]) -> dict[str, str]:
        for key, value in values.items():
            if (
                len(key) > 40
                or len(value) > 1000
                or any(
                    unicodedata.category(char).startswith("C") and char not in "\n\t"
                    for char in value
                )
            ):
                raise ValueError("INVALID_DOCUMENT_FIELD")
        return values
