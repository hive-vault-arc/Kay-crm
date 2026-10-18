"""Strict administrator command inputs; no generic account-state patch."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator

from app.identity.security import normalize_email

Role = Literal["administrator", "manager", "agent"]


class NamedUser(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    display_name: str = Field(min_length=1, max_length=160)
    email: str = Field(min_length=1, max_length=254)
    role: Role

    @field_validator("display_name")
    @classmethod
    def named(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("NAME_REQUIRED")
        return value.strip()

    @field_validator("email")
    @classmethod
    def email_address(cls, value: str) -> str:
        return normalize_email(value)


class Versioned(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    expected_version: int = Field(ge=1)


class EditUser(NamedUser):
    expected_version: int = Field(ge=1)


class NewUser(NamedUser):
    temporary_password: SecretStr = Field(min_length=12, max_length=1024)


class ResetUser(Versioned):
    admin_password: SecretStr = Field(min_length=1, max_length=1024)
    temporary_password: SecretStr = Field(min_length=12, max_length=1024)
