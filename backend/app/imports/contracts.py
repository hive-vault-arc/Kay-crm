from uuid import UUID

from pydantic import Field, field_validator

from app.contacts.contracts import StrictBody

MAX_BYTES = 20 * 1024 * 1024
MAX_ROWS = 50_000
HEADERS = (
    "name",
    "primary_phone",
    "other_phones",
    "primary_email",
    "other_emails",
    "roles",
    "agent_email",
    "notes",
)


class NewBatch(StrictBody):
    filename: str = Field(min_length=5, max_length=180)
    size_bytes: int = Field(strict=True, ge=1, le=MAX_BYTES)

    @field_validator("filename")
    @classmethod
    def csv_name(cls, value: str) -> str:
        if not value.lower().endswith(".csv") or any(c in value for c in "/\\\x00\r\n"):
            raise ValueError("CSV_FILENAME_REQUIRED")
        return value


class RowAgent(StrictBody):
    row_number: int = Field(strict=True, ge=2, le=MAX_ROWS + 1)
    agent_id: UUID | None


class Preview(StrictBody):
    fallback_agent_id: UUID | None = None
    row_agents: list[RowAgent] = Field(default_factory=list, max_length=100)


class Approve(StrictBody):
    preview_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    fallback_agent_id: UUID | None = None
