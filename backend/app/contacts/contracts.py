"""Strict writable fields, independent of staff roles and source provenance."""

import re
from datetime import date
from typing import Literal, Self
from uuid import UUID

import phonenumbers
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.identity.security import IdentityError, normalize_email

ContactRoleCode = Literal["buyer", "seller", "owner", "tenant", "developer"]
ManualSource = Literal["manual", "phone", "email", "in_person", "referral"]
EnquiryStatus = Literal["new", "in_progress", "closed"]


def normalize_phone(value: str) -> str:
    value = value.strip()
    if value.startswith("00"):
        value = "+" + value[2:]
    if not re.fullmatch(r"\+[0-9 ()\.\-]{6,40}", value):
        raise IdentityError("INVALID_PHONE", 422)
    try:
        number = phonenumbers.parse(value, None)
        if number.extension or not phonenumbers.is_valid_number(number):
            raise IdentityError("INVALID_PHONE", 422)
        return str(phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.E164))
    except phonenumbers.NumberParseException:
        raise IdentityError("INVALID_PHONE", 422) from None


class StrictBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Phone(StrictBody):
    number: str = Field(min_length=1, max_length=48)
    label: str = Field(default="", max_length=40)
    is_primary: bool = Field(strict=True)

    @field_validator("number")
    @classmethod
    def canonical(cls, value: str) -> str:
        return normalize_phone(value)


class Email(StrictBody):
    email: str = Field(min_length=1, max_length=254)
    label: str = Field(default="", max_length=40)
    is_primary: bool = Field(strict=True)

    @field_validator("email")
    @classmethod
    def canonical(cls, value: str) -> str:
        return normalize_email(value)


class ContactFields(StrictBody):
    name: str = Field(min_length=1, max_length=160)
    type: Literal["person", "organization"] = "person"
    phones: list[Phone] = Field(min_length=1, max_length=10)
    emails: list[Email] = Field(default_factory=list, max_length=10)
    roles: list[ContactRoleCode] = Field(default_factory=list, max_length=5)

    @model_validator(mode="after")
    def collections(self) -> Self:
        if sum(phone.is_primary for phone in self.phones) != 1:
            raise ValueError("ONE_PRIMARY_PHONE_REQUIRED")
        if self.emails and sum(email.is_primary for email in self.emails) != 1:
            raise ValueError("ONE_PRIMARY_EMAIL_REQUIRED")
        if len({p.number for p in self.phones}) != len(self.phones):
            raise ValueError("DUPLICATE_PHONE_IN_CONTACT")
        if len({e.email for e in self.emails}) != len(self.emails):
            raise ValueError("DUPLICATE_EMAIL_IN_CONTACT")
        if len(set(self.roles)) != len(self.roles):
            raise ValueError("DUPLICATE_ROLE")
        return self


class NewContact(ContactFields):
    primary_agent_id: UUID | None = None


class EditContact(ContactFields):
    expected_version: int = Field(strict=True, ge=1)


class NewEnquiry(StrictBody):
    contact_id: UUID | None = None
    new_contact: NewContact | None = None
    message: str = Field(default="", max_length=4000)
    source: ManualSource = "manual"
    source_submission_id: UUID | None = None
    assigned_agent_id: UUID | None = None

    @model_validator(mode="after")
    def identity_mode(self) -> Self:
        if (self.contact_id is None) == (self.new_contact is None):
            raise ValueError("CONTACT_ID_XOR_NEW_CONTACT_REQUIRED")
        return self


class EditEnquiry(StrictBody):
    expected_version: int = Field(strict=True, ge=1)
    message: str = Field(max_length=4000)
    status: EnquiryStatus


class ResolvePhone(StrictBody):
    phone: str = Field(min_length=1, max_length=48)

    @field_validator("phone")
    @classmethod
    def canonical(cls, value: str) -> str:
        return normalize_phone(value)


class ListQuery(StrictBody):
    page: int = Field(default=1, ge=1, le=1000000)
    page_size: int = Field(default=50, ge=1, le=100)
    sort: Literal["-updated_at", "-received_at", "name"] = "-updated_at"
    q: str = Field(default="", max_length=160)
    status: EnquiryStatus | None = None
    source: ManualSource | Literal["website"] | None = None
    assigned_agent_id: UUID | None = None
    received_from: date | None = None
    received_to: date | None = None
    contact_id: UUID | None = None
    archive: Literal["active", "archived", "all"] = "active"

    @model_validator(mode="after")
    def date_range(self) -> Self:
        if self.received_from and self.received_to and self.received_from > self.received_to:
            raise ValueError("INVALID_DATE_RANGE")
        return self
