"""Decimal text is the wire format; only the final MAD result is rounded."""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal, localcontext
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, StringConstraints, field_validator, model_validator

from app.schedule.contracts import Strict, Version
from app.schedule.contracts import Text as RequiredReason
from app.work.contracts import PageQuery

BaseText = Annotated[str, StringConstraints(pattern=r"^[0-9]{1,16}(\.[0-9]{1,8})?$")]
RateText = Annotated[str, StringConstraints(pattern=r"^[0-9]{1,4}(\.[0-9]{1,8})?$")]
MoneyText = Annotated[str, StringConstraints(pattern=r"^[0-9]{1,16}(\.[0-9]{1,2})?$")]
MAX_AMOUNT = Decimal("9999999999999999.99")


class Terms(Strict):
    kind: Literal["fixed", "percentage"]
    base_mad: BaseText
    rate_percent: RateText | None = None
    amount_mad: MoneyText | None = None
    due_on: date | None = None

    @field_validator("base_mad", "rate_percent", "amount_mad")
    @classmethod
    def positive(cls, value: str | None) -> str | None:
        if value is not None and Decimal(value) <= 0:
            raise ValueError("POSITIVE_DECIMAL_REQUIRED")
        return value

    @model_validator(mode="after")
    def calculation(self) -> Terms:
        if (
            self.kind == "fixed" and (self.amount_mad is None or self.rate_percent is not None)
        ) or (
            self.kind == "percentage" and (self.rate_percent is None or self.amount_mad is not None)
        ):
            raise ValueError("COMMISSION_CALCULATION_REQUIRED")
        if not Decimal(0) < self.calculated() <= MAX_AMOUNT:
            raise ValueError("COMMISSION_AMOUNT_OUT_OF_RANGE")
        return self

    def calculated(self) -> Decimal:
        with localcontext() as context:
            context.prec = 60
            value = (
                Decimal(self.amount_mad or "0")
                if self.kind == "fixed"
                else (Decimal(self.base_mad) * Decimal(self.rate_percent or "0") / Decimal(100))
            )
            return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class NewCommission(Terms):
    expected_deal_version: Version


class Recognize(Strict):
    expected_version: Version


class ReceiptFields(Strict):
    amount_mad: MoneyText
    received_on: date
    evidence_document_id: UUID | None = None
    reason: RequiredReason

    @field_validator("amount_mad")
    @classmethod
    def positive(cls, value: str) -> str:
        if Decimal(value) <= 0:
            raise ValueError("POSITIVE_DECIMAL_REQUIRED")
        return value


class NewReceipt(ReceiptFields):
    expected_version: Version


class CorrectCommission(Terms):
    target: Literal["commission"]
    expected_version: Version
    reason: RequiredReason


class CorrectReceipt(Strict):
    target: Literal["receipt"]
    expected_version: Version
    receipt_id: UUID
    replacement: ReceiptFields | None
    reason: RequiredReason


Correction = Annotated[CorrectCommission | CorrectReceipt, Field(discriminator="target")]
Body = NewCommission | Recognize | NewReceipt | CorrectCommission | CorrectReceipt


class FinanceQuery(PageQuery):
    pass
