"""Bounded UTF-8 CSV parsing; errors contain codes/row numbers, never rejected values."""

import csv
import io
from collections import Counter
from typing import cast

from pydantic import ValidationError

from app.contacts.contracts import ContactRoleCode, Email, NewContact, Phone, normalize_phone
from app.identity.security import IdentityError
from app.imports.contracts import HEADERS, MAX_BYTES, MAX_ROWS


def parse_csv(data: bytes) -> list[dict[str, str]]:
    if len(data) > MAX_BYTES:
        raise IdentityError("IMPORT_FILE_TOO_LARGE", 413)
    try:
        decoded = data.decode("utf-8-sig", errors="strict")
        if "\x00" in decoded:
            raise ValueError("NUL")
        reader = csv.reader(io.StringIO(decoded, newline=""), strict=True)
        if tuple(next(reader, [])) != HEADERS:
            raise IdentityError("IMPORT_HEADER_INVALID", 422)
        rows: list[dict[str, str]] = []
        for cells in reader:
            if len(rows) >= MAX_ROWS:
                raise IdentityError("IMPORT_ROW_LIMIT", 413)
            if len(cells) != len(HEADERS):
                raise IdentityError("IMPORT_CSV_INVALID", 422)
            rows.append(dict(zip(HEADERS, (c.strip() for c in cells), strict=True)))
        if not rows:
            raise IdentityError("IMPORT_EMPTY", 422)
        return rows
    except UnicodeDecodeError, csv.Error, ValueError:
        raise IdentityError("IMPORT_CSV_INVALID", 422) from None


def split_values(value: str) -> list[str]:
    return [item.strip() for item in value.split("|")] if value else []


def row_contact(values: dict[str, str]) -> tuple[NewContact | None, list[str], set[str]]:
    raw = [values["primary_phone"], *split_values(values["other_phones"])]
    phones: set[str] = set()
    for phone in raw:
        try:
            phones.add(normalize_phone(phone))
        except IdentityError:
            pass
    try:
        if len(values["notes"]) > 4000 or len(values["agent_email"]) > 254:
            raise ValueError("FIELD_LENGTH")
        emails = ([values["primary_email"]] if values["primary_email"] else []) + split_values(
            values["other_emails"]
        )
        if emails and not values["primary_email"]:
            raise ValueError("PRIMARY_EMAIL_REQUIRED")
        contact = NewContact(
            name=values["name"],
            phones=[Phone(number=p, is_primary=i == 0) for i, p in enumerate(raw)],
            emails=[Email(email=e, is_primary=i == 0) for i, e in enumerate(emails)],
            roles=cast(list[ContactRoleCode], split_values(values["roles"])),
        )
        return contact, [], phones
    except IdentityError, ValidationError, ValueError:
        return None, ["INVALID_CONTACT_FIELDS"], phones


def duplicates(rows: list[set[str]]) -> set[str]:
    counts = Counter(number for numbers in rows for number in numbers)
    return {number for number, count in counts.items() if count > 1}
