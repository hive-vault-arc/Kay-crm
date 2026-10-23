"""Allowlisted deal operations cannot write reservation, outcome or owner fields."""

from datetime import date
from typing import Literal, Self
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.contacts.contracts import EditContact, NewContact
from app.contacts.qualification import CampaignSource, LeadRating, PurchaseReason, normalize_budget
from app.inventory.contracts import Amount, StrictBody, Version

Stage = Literal["new", "visit", "negotiation", "reserved", "documents", "won", "lost", "cancelled"]
OrdinaryStage = Literal["new", "visit", "negotiation", "documents"]
OfferStatus = Literal["pending", "accepted", "rejected", "withdrawn"]
STAGES = ("new", "visit", "negotiation", "reserved", "documents", "won", "lost", "cancelled")
ORDINARY_STAGES = ("new", "visit", "negotiation", "documents")


class ProjectChoice(StrictBody):
    development_id: UUID | None = None
    property_id: UUID | None = None
    external_name: str | None = Field(default=None, min_length=1, max_length=160)

    @model_validator(mode="after")
    def one_project(self) -> Self:
        if (
            sum(
                value is not None
                for value in (self.development_id, self.property_id, self.external_name)
            )
            != 1
        ):
            raise ValueError("ONE_PROJECT_REQUIRED")
        return self


class ConvertLead(StrictBody):
    expected_version: Version
    project: ProjectChoice
    initial_budget: str = Field(min_length=1, max_length=160)
    purchase_reasons: list[PurchaseReason] = Field(min_length=1, max_length=8)

    @field_validator("initial_budget")
    @classmethod
    def budget(cls, value: str) -> str:
        return normalize_budget(value)

    @field_validator("purchase_reasons")
    @classmethod
    def unique_reasons(cls, values: list[PurchaseReason]) -> list[PurchaseReason]:
        if len(set(values)) != len(values):
            raise ValueError("DUPLICATE_PURCHASE_REASON")
        return values


class DealQualification(StrictBody):
    initial_budget: str = Field(min_length=1, max_length=160)
    purchase_reasons: list[PurchaseReason] = Field(min_length=1, max_length=8)
    projects: list[ProjectChoice] = Field(min_length=1, max_length=3)
    campaign_source: CampaignSource = "unknown"
    rating: LeadRating = "cold"
    payment_method: (
        Literal["cash", "mortgage", "installments", "mixed", "bank_finance", "developer_finance"]
        | None
    ) = None
    number_of_rooms: int | None = Field(default=None, strict=True, ge=0, le=50)
    notes: str = Field(default="", max_length=4000)

    @field_validator("initial_budget")
    @classmethod
    def budget(cls, value: str) -> str:
        return normalize_budget(value)

    @field_validator("purchase_reasons")
    @classmethod
    def unique_reasons(cls, values: list[PurchaseReason]) -> list[PurchaseReason]:
        if len(set(values)) != len(values):
            raise ValueError("DUPLICATE_PURCHASE_REASON")
        return values

    @field_validator("projects")
    @classmethod
    def unique_projects(cls, values: list[ProjectChoice]) -> list[ProjectChoice]:
        identities = [
            (
                value.development_id,
                value.property_id,
                value.external_name.casefold() if value.external_name else None,
            )
            for value in values
        ]
        if len(set(identities)) != len(values):
            raise ValueError("DUPLICATE_PROJECT")
        return values


class DealFields(DealQualification):
    requirement_id: UUID | None = None
    offering_id: UUID | None = None
    expected_offering_version: Version | None = None
    next_action: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def reviewed_offering(self) -> Self:
        if (self.offering_id is None) != (self.expected_offering_version is None):
            raise ValueError("OFFERING_VERSION_REQUIRED")
        return self


class NewDeal(DealFields):
    contact_id: UUID | None = None
    new_contact: NewContact | None = None
    stage: OrdinaryStage = "new"

    @model_validator(mode="after")
    def identity_mode(self) -> Self:
        if (self.contact_id is None) == (self.new_contact is None):
            raise ValueError("CONTACT_ID_XOR_NEW_CONTACT_REQUIRED")
        if self.new_contact is not None and not self.new_contact.languages:
            raise ValueError("LANGUAGES_REQUIRED")
        return self


class EditDeal(DealFields):
    expected_version: Version
    contact_fields: EditContact | None = None


class Transition(StrictBody):
    expected_version: Version
    stage: OrdinaryStage
    reason: str = Field(min_length=1, max_length=1000)


class Reserve(StrictBody):
    expected_version: Version
    offering_id: UUID
    expected_offering_version: Version
    expected_target_version: Version
    expected_development_version: Version | None = None


class ReleaseReservation(Reserve):
    reason: str = Field(min_length=1, max_length=1000)


class ReviewedStock(StrictBody):
    expected_version: Version
    offering_id: UUID | None = None
    expected_offering_version: Version | None = None
    expected_target_version: Version | None = None
    expected_development_version: Version | None = None
    expected_stock_fingerprint: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")

    @model_validator(mode="after")
    def complete_review(self) -> Self:
        facts = (
            self.expected_offering_version,
            self.expected_target_version,
            self.expected_stock_fingerprint,
        )
        if self.offering_id is not None and any(fact is None for fact in facts):
            raise ValueError("COMPLETE_STOCK_REVIEW_REQUIRED")
        if self.offering_id is None and any(
            fact is not None for fact in (*facts, self.expected_development_version)
        ):
            raise ValueError("UNEXPECTED_STOCK_REVIEW")
        return self


class CloseDeal(ReviewedStock):
    outcome: Literal["won", "lost", "cancelled"]
    agreed_amount_mad: Amount | None = None
    completed_on: date
    explanation: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def required_amount(self) -> Self:
        if self.outcome == "won" and (self.agreed_amount_mad is None or self.offering_id is None):
            raise ValueError("WIN_AMOUNT_AND_TARGET_REQUIRED")
        if self.outcome != "won" and self.agreed_amount_mad is not None:
            raise ValueError("NON_WIN_AMOUNT_REFUSED")
        return self


class ReopenDeal(ReviewedStock):
    reason: str = Field(min_length=1, max_length=1000)


class OfferFields(StrictBody):
    amount_mad: Amount
    currency: Literal["MAD"] = "MAD"
    price_period: Literal["month", "year"] | None
    conditions: str = Field(default="", max_length=4000)
    expires_on: date | None = None
    status: OfferStatus = "pending"


class NewCustomerOffer(OfferFields):
    expected_version: Version


class EditCustomerOffer(OfferFields):
    expected_version: Version
    expected_deal_version: Version


class DealQuery(StrictBody):
    contact_id: UUID | None = None
    q: str = Field(default="", max_length=160)
    stage: Stage | None = None
    assigned_agent_id: UUID | None = None
    offering_kind: Literal["sale", "rental"] | None = None
    campaign_source: CampaignSource | None = None
    rating: LeadRating | None = None
    country: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    language: str | None = Field(default=None, min_length=1, max_length=60)
    development_id: UUID | None = None
    property_id: UUID | None = None
    updated_from: date | None = None
    updated_to: date | None = None
    archive: Literal["active", "archived", "all"] = "active"
    record_archive: Literal["active", "archived", "all"] = "active"
    sort: Literal["-updated_at", "-created_at", "title", "contact_name"] = "-updated_at"
    page: int = Field(default=1, ge=1, le=1_000_000)
    page_size: int = Field(default=50, ge=1, le=100)

    @model_validator(mode="after")
    def date_range(self) -> Self:
        if self.updated_from and self.updated_to and self.updated_from > self.updated_to:
            raise ValueError("INVALID_DATE_RANGE")
        return self


class ChildQuery(StrictBody):
    page: int = Field(default=1, ge=1, le=1_000_000)
    page_size: int = Field(default=20, ge=1, le=100)
