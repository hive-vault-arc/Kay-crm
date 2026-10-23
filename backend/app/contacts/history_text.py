"""French, Casablanca-time wording for immutable Lead/Deal history entries."""

import re
from datetime import datetime
from zoneinfo import ZoneInfo

BUSINESS_ZONE = ZoneInfo("Africa/Casablanca")

LEAD_STATUS_LABELS = {
    "new": "Nouveau",
    "in_progress": "Contacté",
    "follow_up": "À relancer",
    "analysis": "En analyse",
    "qualified": "Qualifié",
    "not_qualified": "Non qualifié",
    "lost": "Perdu",
    "junk_lead": "Indésirable",
    "closed": "Clôturé",
    "converted": "Converti",
}

DEAL_STAGE_LABELS = {
    "new": "Nouvelle",
    "visit": "Visite",
    "negotiation": "Négociation",
    "reserved": "Réservée",
    "documents": "Documents",
    "won": "Gagnée",
    "lost": "Perdue",
    "cancelled": "Annulée",
}


def history_date(instant: datetime) -> str:
    return instant.astimezone(BUSINESS_ZONE).strftime("%d/%m/%Y à %H:%M")


def created_note(instant: datetime) -> str:
    return f"Prospect créé le {history_date(instant)}."


def status_note(previous: str, current: str, instant: datetime) -> str:
    return (
        f"Statut du prospect modifié de « {LEAD_STATUS_LABELS[previous]} » "
        f"à « {LEAD_STATUS_LABELS[current]} » le {history_date(instant)}."
    )


def conversion_note(instant: datetime) -> str:
    return f"Prospect converti en affaire le {history_date(instant)}."


def deal_stage_note(previous: str, current: str, instant: datetime) -> str:
    return (
        f"Étape de l’affaire modifiée de « {DEAL_STAGE_LABELS[previous]} » "
        f"à « {DEAL_STAGE_LABELS[current]} » le {history_date(instant)}."
    )


def activity_body(action: str, body: str, instant: datetime, *, converted_deal: bool) -> str:
    if body:
        legacy_status = re.fullmatch(r"Statut : ([a-z_]+) → ([a-z_]+)\.", body)
        if action == "enquiries.updated" and legacy_status:
            previous, current = legacy_status.groups()
            if previous in LEAD_STATUS_LABELS and current in LEAD_STATUS_LABELS:
                return status_note(previous, current, instant)
        legacy_stage = re.fullmatch(r"Étape : ([a-z_]+) → ([a-z_]+)\.", body)
        if action.startswith("deals.") and legacy_stage:
            previous, current = legacy_stage.groups()
            if previous in DEAL_STAGE_LABELS and current in DEAL_STAGE_LABELS:
                return deal_stage_note(previous, current, instant)
        return body
    if action == "enquiries.created":
        return created_note(instant)
    if action == "enquiries.converted" or converted_deal and action == "deals.created":
        return conversion_note(instant)
    return ""
