"""Selected KAY preparation sheet plus the unchanged owner-supplied blank model."""

import re
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Literal
from uuid import UUID

from pypdf import PdfReader, PdfWriter

from app.generated.catalog import Template
from app.generated.stationery import Stationery

ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class PreparationContext:
    parent_kind: Literal["enquiry", "deal"]
    parent_id: UUID
    actor_name: str


def display_value(key: str, value: str) -> str:
    """Selected exact decimal grouping; never round or pass money through a float."""
    if re.search("price|amount|budget|commission|deposit|rent|fee", key) and re.fullmatch(
        r"[0-9]{1,16}(?:[.,][0-9]{1,2})?", value.strip()
    ):
        parts = re.split("[.,]", value.strip(), maxsplit=1)
        whole = re.sub(r"(?<=[0-9])(?=(?:[0-9]{3})+$)", " ", parts[0])
        return whole + ("," + parts[1] if len(parts) == 2 else "")
    return value


def preparation_sheet(
    template: Template,
    values: dict[str, str],
    reference: str,
    date_label: str,
    context: PreparationContext | None = None,
) -> Stationery:
    if context:
        parent = "Prospect" if context.parent_kind == "enquiry" else "Affaire"
        metadata = [
            (f"Dossier : {parent} {context.parent_id}", f"Préparée le : {date_label}"),
            (f"Préparée par : {context.actor_name}", f"Modèle : {template.code}"),
        ]
    else:
        # Existing four-argument internal callers remain supported without inventing an actor.
        metadata = [
            (f"Dossier : {reference}", f"Préparée le : {date_label}"),
            ("", f"Modèle : {template.code}"),
        ]
    sheet = Stationery(template.title, metadata)
    sheet.paragraph(template.warning)
    for index, group in enumerate(dict.fromkeys(field.group for field in template.fields), 1):
        sheet.heading(f"{index}. {group}")
        pending: list[tuple[str, str, bool]] = []
        for field in template.fields:
            if field.group != group:
                continue
            value = display_value(field.key, values.get(field.key, ""))
            entry = (field.label, value, field.multiline)
            if field.multiline or len(value) > 90:
                if pending:
                    sheet.fields(pending)
                    pending = []
                sheet.fields([entry])
            else:
                pending.append(entry)
                if len(pending) == 2:
                    sheet.fields(pending)
                    pending = []
        if pending:
            sheet.fields(pending)
    sheet.paragraph(
        "Le modèle de travail vierge original en annexe reste à compléter et à valider avant "
        "toute signature. Ses pointillés ne sont pas remplis automatiquement ; aucune signature "
        "électronique n’est créée.",
        after=0,
        together=True,
    )
    return sheet


def render_pdf(
    template: Template,
    values: dict[str, str],
    reference: str,
    date_label: str,
    context: PreparationContext | None = None,
) -> bytes:
    """Draw literal user strings; original clauses, blanks and warnings remain in the appendix."""
    sheet = preparation_sheet(template, values, reference, date_label, context)
    original = PdfReader(ROOT / "templates" / template.source)
    combined = BytesIO()
    writer = PdfWriter()
    for page in PdfReader(BytesIO(sheet.pdf(len(original.pages)))).pages:
        writer.add_page(page)
    for page in original.pages:
        writer.add_page(page)
    writer.add_metadata(
        {
            "/Title": f"KAY - {template.title}",
            "/Author": "KAY",
            "/Subject": "Préparation et modèle original KAY à compléter",
        }
    )
    writer.write(combined)
    return combined.getvalue()
