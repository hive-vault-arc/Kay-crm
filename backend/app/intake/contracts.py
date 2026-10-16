import re
from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.contacts.contracts import StrictBody, normalize_phone
from app.identity.security import normalize_email


class Submission(StrictBody):
    submission_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,100}$")
    submitted_at: datetime
    name: str = Field(min_length=1, max_length=160)
    phone: str = Field(min_length=1, max_length=48)
    email: str | None = Field(default=None, max_length=254)
    message: str = Field(default="", max_length=4000)
    property_reference: str | None = Field(default=None, max_length=100)
    source: str | None = Field(default=None, pattern=r"^[a-z0-9_-]{1,40}$")

    @field_validator("phone")
    @classmethod
    def canonical_phone(cls, value: str) -> str:
        return normalize_phone(value)

    @field_validator("email")
    @classmethod
    def canonical_email(cls, value: str | None) -> str | None:
        return normalize_email(value) if value else None

    @model_validator(mode="after")
    def bounded(self) -> Self:
        if self.submitted_at.tzinfo is None or not 2000 <= self.submitted_at.year <= 2100:
            raise ValueError("AWARE_SUBMISSION_TIME_REQUIRED")
        if len(self.enquiry_message()) > 4000 or re.search(
            r"[\x00-\x08\x0b\x0c\x0e-\x1f]", self.name + self.message
        ):
            raise ValueError("INVALID_SUBMISSION_TEXT")
        return self

    def enquiry_message(self) -> str:
        return self.message + (
            "\nRéférence du bien : " + self.property_reference if self.property_reference else ""
        )


class ReceiptQuery(StrictBody):
    receipt_id: UUID
