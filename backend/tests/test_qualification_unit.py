"""Qualification uses the reference vocabulary without accepting empty client facts."""

import json
import re
from pathlib import Path
from typing import get_args
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.contacts.contracts import ContactFields, NewEnquiry
from app.contacts.qualification import (
    BUDGET_BANDS,
    CAMPAIGN_LABELS,
    PURCHASE_REASON_LABELS,
    CampaignSource,
    PurchaseReason,
    calling_code,
    normalize_budget,
    normalize_country,
    normalize_languages,
    qualification_catalogue,
)
from app.deals.contracts import ConvertLead, EditDeal, NewDeal


def test_active_qualification_request_examples_match_runtime_models():
    document = (Path(__file__).resolve().parents[2] / "docs/04-design/api-contracts.md").read_text(
        encoding="utf-8"
    )
    examples = re.findall(
        r"<!-- qualification-example:(\w+) -->\s*```json\s*(.*?)\s*```", document, re.DOTALL
    )
    models = {"NewEnquiry": NewEnquiry, "ConvertLead": ConvertLead, "NewDeal": NewDeal}
    assert len(examples) == len(models) and {name for name, _ in examples} == set(models)
    for name, body in examples:
        models[name].model_validate(json.loads(body))


def test_catalogue_matches_contract_vocabularies():
    catalogue = qualification_catalogue()
    assert set(get_args(CampaignSource)) == set(CAMPAIGN_LABELS)
    assert set(get_args(PurchaseReason)) == set(PURCHASE_REASON_LABELS)
    assert len(CAMPAIGN_LABELS) == 20
    assert len(BUDGET_BANDS) == 5
    assert {"code": "MA", "calling_code": "+212"} in catalogue["countries"]
    assert {"code": "FR", "calling_code": "+33"} in catalogue["countries"]


@pytest.mark.parametrize(
    "value",
    ["", " ", "unknown", "0", "-1", "NaN", "1e10", "1.001", "1/2"],
    ids=[
        "empty",
        "whitespace",
        "unknown",
        "zero",
        "negative",
        "nan",
        "exponent",
        "precision",
        "fraction",
    ],
)
def test_missing_or_invalid_budget_is_rejected(value):
    with pytest.raises(ValueError, match="BUDGET_REQUIRED"):
        normalize_budget(value)


@pytest.mark.parametrize("value", BUDGET_BANDS)
def test_reference_budget_band_is_retained(value):
    assert normalize_budget(value) == value


def test_positive_mad_budget_is_exact_and_normalized():
    assert normalize_budget(" 1250000,50 DH ") == "1250000.50 MAD"
    assert normalize_budget("500000") == "500000.00 MAD"


def test_country_and_international_calling_codes():
    assert normalize_country(" ma ") == "MA"
    assert normalize_country("") == ""
    assert calling_code("+212600000001") == "+212"
    assert calling_code("+33600000002") == "+33"
    with pytest.raises(ValueError, match="COUNTRY_INVALID"):
        normalize_country("not a country")


def test_multiple_languages_preserve_custom_languages_without_duplicates():
    assert normalize_languages([" French ", "Darija", "Português"]) == [
        "french",
        "darija",
        "português",
    ]
    for values in (["french", "FRENCH"], [""], ["French\nArabic"], ["x" * 61]):
        with pytest.raises(ValueError):
            normalize_languages(values)


def test_contact_profile_canonicalizes_country_and_languages():
    contact = ContactFields(
        name="Synthétique",
        phones=[
            {
                "number": "+33600000002",
                "is_primary": True,
            }
        ],
        country="fr",
        nationality="ma",
        languages=["French", "Darija"],
    )
    assert contact.country == "FR" and contact.nationality == "MA"
    assert contact.languages == ["french", "darija"]


@pytest.mark.parametrize("missing", ["project", "initial_budget", "purchase_reasons"])
def test_conversion_requires_project_budget_and_buying_intent(missing):
    payload = {
        "expected_version": 1,
        "project": {"external_name": "Projet synthétique"},
        "initial_budget": "500000",
        "purchase_reasons": ["residence"],
    }
    del payload[missing]
    with pytest.raises(ValidationError):
        ConvertLead.model_validate(payload)


@pytest.mark.parametrize(
    "patch",
    [
        {"title": "No free deal name"},
        {"purchase_reasons": []},
        {"purchase_reasons": ["residence", "residence"]},
        {"initial_budget": "0"},
        {"project": {}},
        {"project": {"external_name": " "}},
        {"project": {"development_id": str(uuid4()), "external_name": "Both"}},
    ],
)
def test_conversion_rejects_arbitrary_names_and_incomplete_qualification(patch):
    with pytest.raises(ValidationError):
        ConvertLead.model_validate(
            {
                "expected_version": 1,
                "project": {"external_name": "Projet synthétique"},
                "initial_budget": "500000",
                "purchase_reasons": ["residence"],
                **patch,
            }
        )


def test_new_lead_requires_budget_and_languages_without_spoofing_provenance():
    payload = {
        "new_contact": {
            "name": "Synthétique",
            "languages": ["french"],
            "phones": [{"number": "+212600000001", "is_primary": True}],
        },
        "initial_budget": "500000",
        "campaign_source": "instagram_ads",
    }
    assert NewEnquiry.model_validate(payload).initial_budget == "500000.00 MAD"
    for patch in (
        {"initial_budget": ""},
        {"source": "website"},
        {"new_contact": {**payload["new_contact"], "languages": []}},
        {"campaign_source": "fabricated"},
    ):
        with pytest.raises(ValidationError):
            NewEnquiry.model_validate({**payload, **patch})


@pytest.mark.parametrize(
    "patch",
    [
        {"title": "Titre libre refusé"},
        {"enquiry_id": str(uuid4())},
        {"projects": []},
        {"projects": [{"external_name": "Projet"}, {"external_name": "PROJET"}]},
        {"projects": [{"external_name": str(index)} for index in range(4)]},
        {"purchase_reasons": []},
        {"purchase_reasons": ["residence", "residence"]},
        {"initial_budget": "0"},
        {"payment_method": "invented"},
        {"number_of_rooms": -1},
        {"number_of_rooms": True},
    ],
)
def test_manual_deal_and_edit_reject_unqualified_or_legacy_fields(patch):
    payload = {
        "initial_budget": "1000000",
        "projects": [{"external_name": "Projet"}],
        "purchase_reasons": ["residence"],
        **patch,
    }
    for model, context in (
        (NewDeal, {"contact_id": str(uuid4())}),
        (EditDeal, {"expected_version": 1}),
    ):
        with pytest.raises(ValidationError):
            model.model_validate({**context, **payload})


def test_manual_deal_requires_one_canonical_contact_mode_and_new_contact_languages():
    payload = {
        "initial_budget": "1000000",
        "projects": [{"external_name": "Projet"}],
        "purchase_reasons": ["residence"],
    }
    client = {
        "name": "Client synthétique",
        "phones": [{"number": "+33600000002", "is_primary": True}],
        "languages": ["french"],
    }
    assert NewDeal.model_validate({**payload, "new_contact": client}).new_contact.languages == [
        "french"
    ]
    for context in (
        {},
        {"contact_id": str(uuid4()), "new_contact": client},
        {"new_contact": {**client, "languages": []}},
    ):
        with pytest.raises(ValidationError):
            NewDeal.model_validate({**payload, **context})
