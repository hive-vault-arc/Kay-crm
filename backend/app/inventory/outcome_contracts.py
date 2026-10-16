"""Manager external results name reviewed stock, never a KAY amount or commission."""

from datetime import date
from uuid import UUID

from pydantic import Field

from app.inventory.contracts import StrictBody, Version


class ExternalOutcome(StrictBody):
    expected_version: Version
    offering_id: UUID
    expected_offering_version: Version
    expected_development_version: Version | None = None
    expected_stock_fingerprint: str = Field(pattern=r"^[0-9a-f]{64}$")
    completed_on: date
    explanation: str = Field(min_length=1, max_length=1000)
