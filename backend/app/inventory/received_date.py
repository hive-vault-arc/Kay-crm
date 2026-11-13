"""Optional civil date when a property or programme was received."""

import re
from datetime import date, datetime
from typing import Annotated
from zoneinfo import ZoneInfo

from pydantic import BeforeValidator

CASABLANCA = ZoneInfo("Africa/Casablanca")


def parse_received_date(value: object) -> date | None:
    if value is None:
        return None
    if isinstance(value, str) and re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        value = date.fromisoformat(value)
    if type(value) is not date or value > datetime.now(CASABLANCA).date():
        raise ValueError("INVALID_LISTING_RECEIVED_DATE")
    return value


ReceivedDate = Annotated[date | None, BeforeValidator(parse_received_date)]


def received_date_change(previous: date | None, current: date | None) -> str:
    if previous == current:
        return ""
    old = previous.strftime("%d/%m/%Y") if previous else "non renseignée"
    new = current.strftime("%d/%m/%Y") if current else "non renseignée"
    return f"Date de réception : {old} → {new}."
