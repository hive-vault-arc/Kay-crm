"""Reference-backed client qualification shared by lead and deal contracts."""

import re
from decimal import Decimal, InvalidOperation
from typing import Literal

import phonenumbers

CampaignSource = Literal[
    "broker",
    "bureau_de_vente",
    "mubawab",
    "google_my_business",
    "snapchat",
    "tiktok",
    "youtube",
    "cold_call",
    "employee_referral",
    "external_referral",
    "facebook",
    "google_advertisement",
    "instagram",
    "instagram_ads",
    "landing_campaign_form",
    "partner",
    "web_form",
    "whatsapp_kay",
    "whatsapp_web_button",
    "unknown",
]
LeadRating = Literal["cold", "warm", "hot"]
PurchaseReason = Literal[
    "investment",
    "residence",
    "vacation_home",
    "rental_income",
    "business",
    "family_expansion",
    "relocation",
    "other",
]

BUDGET_BANDS = (
    "250.000 DH - 500.000 DH",
    "500.000 DH - 1.000.000 DH",
    "1.000.000 DH - 2.000.000 DH",
    "2.000.000 DH - 4.000.000 DH",
    "4.500.000 DH - 10.000.000 DH",
)
CAMPAIGN_LABELS = {
    "broker": "Courtier",
    "bureau_de_vente": "Bureau de vente",
    "mubawab": "Mubawab",
    "google_my_business": "Google My Business",
    "snapchat": "Snapchat",
    "tiktok": "TikTok",
    "youtube": "YouTube",
    "cold_call": "Prospection téléphonique",
    "employee_referral": "Recommandation interne",
    "external_referral": "Recommandation externe",
    "facebook": "Facebook",
    "google_advertisement": "Publicité Google",
    "instagram": "Instagram",
    "instagram_ads": "Publicité Instagram",
    "landing_campaign_form": "Formulaire de campagne",
    "partner": "Partenaire",
    "web_form": "Formulaire du site",
    "whatsapp_kay": "WhatsApp KAY",
    "whatsapp_web_button": "Bouton WhatsApp du site",
    "unknown": "Non renseignée",
}
LANGUAGE_LABELS = {
    "french": "Français",
    "arabic": "Arabe",
    "darija": "Darija",
    "tamazight": "Tamazight",
    "english": "Anglais",
    "spanish": "Espagnol",
    "dutch": "Néerlandais",
    "german": "Allemand",
    "italian": "Italien",
    "russian": "Russe",
    "chinese": "Chinois",
    "japanese": "Japonais",
    "korean": "Coréen",
    "portuguese": "Portugais",
    "turkish": "Turc",
    "hindi": "Hindi",
    "urdu": "Ourdou",
    "bengali": "Bengali",
    "persian": "Persan",
    "malayalam": "Malayalam",
    "tamil": "Tamoul",
    "thai": "Thaï",
    "vietnamese": "Vietnamien",
    "swedish": "Suédois",
    "danish": "Danois",
    "norwegian": "Norvégien",
    "other": "Autre",
}
PURCHASE_REASON_LABELS = {
    "investment": "Investissement",
    "residence": "Résidence principale",
    "vacation_home": "Résidence secondaire",
    "rental_income": "Revenus locatifs",
    "business": "Usage professionnel",
    "family_expansion": "Agrandissement familial",
    "relocation": "Déménagement",
    "other": "Autre",
}


def normalize_country(value: str) -> str:
    code = value.strip().upper()
    if code and code not in phonenumbers.SUPPORTED_REGIONS:
        raise ValueError("COUNTRY_INVALID")
    return code


def normalize_languages(values: list[str]) -> list[str]:
    normalized = [value.strip().lower() for value in values]
    if any(not value or len(value) > 60 or any(ord(c) < 32 for c in value) for value in normalized):
        raise ValueError("LANGUAGE_INVALID")
    if len(normalized) != len(set(normalized)):
        raise ValueError("DUPLICATE_LANGUAGE")
    return normalized


def normalize_budget(value: str) -> str:
    """Keep reference bands verbatim; a positive exact MAD amount is also valid."""
    value = value.strip()
    if value in BUDGET_BANDS:
        return value
    amount = re.sub(r"\s*(MAD|DH)\s*$", "", value, flags=re.IGNORECASE)
    if not re.fullmatch(r"[0-9]+(?:[.,][0-9]{1,2})?", amount):
        raise ValueError("BUDGET_REQUIRED")
    try:
        parsed = Decimal(amount.replace(",", "."))
        if not parsed.is_finite() or parsed <= 0 or parsed >= Decimal("1e16"):
            raise ValueError("BUDGET_REQUIRED")
    except InvalidOperation:
        raise ValueError("BUDGET_REQUIRED") from None
    return f"{parsed:.2f} MAD"


def calling_code(number: str) -> str:
    return f"+{phonenumbers.parse(number, None).country_code}"


def qualification_catalogue() -> dict[str, object]:
    return {
        "countries": [
            {"code": region, "calling_code": f"+{phonenumbers.country_code_for_region(region)}"}
            for region in sorted(phonenumbers.SUPPORTED_REGIONS)
        ],
        "languages": [{"value": value, "label": label} for value, label in LANGUAGE_LABELS.items()],
        "campaign_sources": [
            {"value": value, "label": label} for value, label in CAMPAIGN_LABELS.items()
        ],
        "budget_bands": [{"value": value, "label": value} for value in BUDGET_BANDS],
        "purchase_reasons": [
            {"value": value, "label": label} for value, label in PURCHASE_REASON_LABELS.items()
        ],
    }
