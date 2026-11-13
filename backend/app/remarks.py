"""Validation for optional, internal-only dossier remarks."""

from typing import Annotated

from pydantic import AfterValidator, Field

ImportantRemarks = Annotated[
    str | None, Field(max_length=1000), AfterValidator(lambda value: value or None)
]
