"""Fetch and normalize the two public holiday feeds with no CRM input."""

import json
import re
import socket
import time
from dataclasses import dataclass
from datetime import date, timedelta
from http.client import HTTPSConnection
from threading import Timer
from typing import Literal
from urllib.parse import urlsplit

Provider = Literal["moroccoapi", "agenda"]
PROVIDERS: tuple[Provider, ...] = ("moroccoapi", "agenda")
OFFICIAL_HOSTS = {"habous.gov.ma", "www.habous.gov.ma", "maroc.ma", "www.maroc.ma"}
MAX_BYTES = 256 * 1024
RELIGIOUS = {
    "eid-al-fitr": "Aïd al-Fitr",
    "eid-al-adha": "Aïd al-Adha",
    "islamic-new-year": "Nouvel An hégirien",
    "mawlid": "Mawlid",
}


@dataclass(frozen=True)
class Holiday:
    code: str
    name: str
    category: str
    status: str
    start_on: date | None
    end_on: date | None
    source_url: str


class UnsupportedYear(ValueError):
    pass


def official_link(value: str) -> bool:
    if len(value) > 2048 or re.search(r"[\x00-\x20\x7f\\]", value):
        return False
    try:
        url = urlsplit(value)
        return (
            url.scheme == "https"
            and url.netloc.lower() in OFFICIAL_HOSTS
            and url.path not in {"", "/"}
        )
    except ValueError:
        return False


def civil_date(value: str, year: int) -> date:
    if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        raise ValueError("INVALID_HOLIDAY_DATE")
    result = date.fromisoformat(value)
    if result.year not in {year, year + 1}:
        raise ValueError("INVALID_HOLIDAY_YEAR")
    return result


def endpoint(provider: Provider, year: int) -> tuple[str, str]:
    if provider == "moroccoapi":
        return "moroccoapi.dev", f"/api/v2/holidays/{year}"
    return "agendamaroc.com", f"/api/agenda/feries?year={year}&lang=fr"


def fetch(provider: Provider, year: int) -> list[Holiday]:
    host, path = endpoint(provider, year)
    connection = HTTPSConnection(host, timeout=3)
    timer = None
    try:
        connection.connect()
        stream = connection.sock
        if stream is None:
            raise OSError("HOLIDAY_CONNECTION_CLOSED")

        def expire() -> None:
            try:
                stream.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass

        deadline = time.monotonic() + 6
        timer = Timer(6, expire)
        timer.daemon = True
        timer.start()
        connection.request("GET", path, headers={"Accept": "application/json"})
        response = connection.getresponse()
        if response.status not in {200, 400, 404, 422}:
            raise OSError("HOLIDAY_HTTP_FAILURE")
        body = bytearray()
        while True:
            if time.monotonic() >= deadline:
                raise TimeoutError("HOLIDAY_HTTP_TIMEOUT")
            chunk = response.read1(8192)
            if not chunk:
                break
            body.extend(chunk)
            if len(body) > MAX_BYTES:
                raise ValueError("HOLIDAY_RESPONSE_TOO_LARGE")
        if time.monotonic() >= deadline:
            raise TimeoutError("HOLIDAY_HTTP_TIMEOUT")
        payload = json.loads(body)
        if response.status != 200:
            error = payload.get("error") if isinstance(payload, dict) else None
            if isinstance(error, dict) and error.get("code") == "UNSUPPORTED_YEAR":
                raise UnsupportedYear
            if (
                provider == "agenda"
                and isinstance(error, str)
                and error.startswith(f"Year {year} not supported.")
            ):
                raise UnsupportedYear
            raise OSError("HOLIDAY_HTTP_FAILURE")
        return normalize(provider, year, payload)
    finally:
        if timer:
            timer.cancel()
        connection.close()


def forecast_code(name: str) -> str | None:
    value = name.casefold()
    if value.startswith("eid al-fitr"):
        return "eid-al-fitr"
    if value.startswith("eid al-adha"):
        return "eid-al-adha"
    if value.startswith(("islamic new year", "hijri new year")):
        return "islamic-new-year"
    if "mawlid" in value or "prophet's birthday" in value:
        return "mawlid"
    return None


def normalize(provider: Provider, year: int, payload: object) -> list[Holiday]:
    if not isinstance(payload, dict):
        raise ValueError("INVALID_HOLIDAY_FEED")
    host, path = endpoint(provider, year)
    feed_url = f"https://{host}{path}"
    official = provider == "moroccoapi"
    rows = payload.get("data" if official else "holidays")
    if official:
        meta = payload.get("meta")
        if not isinstance(meta, dict) or year not in meta.get("years", []):
            raise ValueError("INVALID_HOLIDAY_YEAR")
    elif payload.get("year") != year or payload.get("country") != "MA":
        raise ValueError("INVALID_HOLIDAY_YEAR")
    if not isinstance(rows, list) or not 1 <= len(rows) <= 100:
        raise ValueError("INVALID_HOLIDAY_FEED")
    groups: dict[str, list[tuple[int, Holiday]]] = {}
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("INVALID_HOLIDAY_ROW")
        if official:
            code = row["id"]
            category = row["type"]
            day = row["day"]
            status = row["status"]
            name = row["names"]["fr"]
            if not isinstance(code, str) or not re.fullmatch(r"[a-z0-9-]{1,64}", code):
                raise ValueError("INVALID_HOLIDAY_CODE")
            if day not in {1, 2} or category not in {"national", "religious"}:
                raise ValueError("INVALID_HOLIDAY_ROW")
            if (category == "national" and status != "fixed") or (
                category == "religious" and status not in {"pending_confirmation", "confirmed"}
            ):
                raise ValueError("INVALID_HOLIDAY_STATUS")
            sources = row["source_urls"]
            if not isinstance(sources, list) or not all(isinstance(s, str) for s in sources):
                raise ValueError("INVALID_HOLIDAY_SOURCE")
            source = next((s for s in sources if official_link(s)), None)
            if status == "confirmed" and source is None:
                status = "pending_confirmation"
            status = "pending" if status == "pending_confirmation" else status
            when = None if status == "pending" else civil_date(row["date"], year)
            if code == "amazigh-new-year":
                category = "amazigh"
        else:
            if row["variable"] is not True or row["type"] != "religieux":
                continue
            label = row["name_en"]
            forecast = forecast_code(label)
            if forecast is None:
                continue
            code, category, status, name, source = (
                forecast,
                "religious",
                "estimated",
                RELIGIOUS[forecast],
                None,
            )
            day = 2 if re.search(r"\bday\s+2\b", label, re.I) else 1
            when = civil_date(row["date"], year)
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 160:
            raise ValueError("INVALID_HOLIDAY_NAME")
        groups.setdefault(code, []).append(
            (day, Holiday(code, name.strip(), category, status, when, when, source or feed_url))
        )
    if not groups:
        raise ValueError("EMPTY_HOLIDAY_FEED")
    observed = []
    for group in groups.values():
        group.sort(key=lambda entry: entry[0])
        first_day, first = group[0]
        last_day, last = group[-1]
        if (
            first_day != 1
            or len(group) != last_day
            or (first.category, first.status) != (last.category, last.status)
            or (first.start_on and first.start_on.year != year)
            or (first.start_on and last.start_on != first.start_on + timedelta(days=last_day - 1))
        ):
            raise ValueError("INVALID_HOLIDAY_SPAN")
        observed.append(
            Holiday(
                first.code,
                first.name,
                first.category,
                first.status,
                first.start_on,
                last.start_on,
                first.source_url,
            )
        )
    return observed
