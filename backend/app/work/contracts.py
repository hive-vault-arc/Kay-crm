"""Strict task commands and bounded, numbered work/notification queries."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, StringConstraints, field_validator

from app.schedule.contracts import Period, Reason, Strict, Version


class TaskFields(Strict):
    title: Annotated[str, StringConstraints(min_length=1, max_length=160)]
    notes: Reason = ""
    owner_user_id: UUID
    due_at: AwareDatetime
    deal_id: UUID | None = None
    enquiry_id: UUID | None = None
    property_id: UUID | None = None

    @field_validator("due_at")
    @classmethod
    def instant(cls, value: datetime) -> datetime:
        return Period.instant(value)


class NewTask(TaskFields):
    contact_id: UUID


class EditTask(TaskFields):
    expected_version: Version


class TaskAction(Strict):
    expected_version: Version
    reason: Reason = ""


class PageQuery(Strict):
    page: Annotated[int, Field(ge=1, le=1_000_000)] = 1
    page_size: Annotated[int, Field(ge=1, le=100)] = 50


class TaskQuery(PageQuery):
    contact_id: UUID | None = None
    deal_id: UUID | None = None
    owner_user_id: UUID | None = None
    bucket: Literal["all", "today", "overdue", "upcoming", "completed", "cancelled"] = "all"


class NotificationQuery(PageQuery):
    state: Literal["all", "unread", "read"] = "all"
