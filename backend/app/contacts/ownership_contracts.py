"""Explicit preview intents, confirmed commands and attributed manual entries."""

from typing import Literal, Self
from uuid import UUID

from pydantic import Field, model_validator

from app.contacts.contracts import StrictBody

Operation = Literal["assign", "collaborators", "archive", "restore", "merge"]


class ChangeIntent(StrictBody):
    operation: Operation
    expected_version: int = Field(strict=True, ge=1)
    reason: str = Field(min_length=1, max_length=1000)
    primary_agent_id: UUID | None = None
    retain_previous: bool = Field(default=False, strict=True)
    collaborator_ids: list[UUID] = Field(default_factory=list, max_length=100)
    survivor_id: UUID | None = None
    survivor_expected_version: int | None = Field(default=None, strict=True, ge=1)

    @model_validator(mode="after")
    def operation_fields(self) -> Self:
        allowed = {"operation", "expected_version", "reason", "preview_token"}
        if self.operation == "assign":
            allowed |= {"primary_agent_id", "retain_previous"}
            if self.primary_agent_id is None:
                raise ValueError("PRIMARY_AGENT_REQUIRED")
        elif self.operation == "collaborators":
            allowed |= {"collaborator_ids"}
            if len(set(self.collaborator_ids)) != len(self.collaborator_ids):
                raise ValueError("DUPLICATE_COLLABORATOR")
        elif self.operation == "merge":
            allowed |= {"survivor_id", "survivor_expected_version"}
            if self.survivor_id is None or self.survivor_expected_version is None:
                raise ValueError("EXPLICIT_SURVIVOR_REQUIRED")
        if self.model_fields_set - allowed:
            raise ValueError("UNEXPECTED_OPERATION_FIELD")
        return self


class ConfirmedChange(ChangeIntent):
    preview_token: str = Field(pattern=r"^[a-f0-9]{64}$")


class NewNote(StrictBody):
    kind: Literal["note", "call", "email", "meeting", "other"] = "note"
    body: str = Field(min_length=1, max_length=4000)


class EnquiryAssignment(StrictBody):
    expected_version: int = Field(strict=True, ge=1)
    assigned_agent_id: UUID | None
    reason: str = Field(min_length=1, max_length=1000)
