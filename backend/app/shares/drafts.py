"""Prepare editable public copy and the latest clean photo for each inventory image."""

import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.files.models import Document, DocumentVersion
from app.inventory.hierarchy_models import Development
from app.shares.contracts import TargetKind
from app.shares.inventory import Record

CATEGORY_LABELS = {
    "apartment": "Appartement",
    "villa": "Villa",
    "house": "Maison",
    "land": "Terrain",
    "commercial": "Local commercial",
    "riad": "Riad",
    "room": "Chambre",
    "office": "Bureau",
    "farm": "Ferme",
}
ADDRESS_MARKER = re.compile(
    r"\b(?:rue|avenue|boulevard|bd|route|impasse|immeuble|résidence|appartement|étage)\b",
    re.IGNORECASE,
)


def locality(value: object) -> str:
    if not isinstance(value, str):
        return ""
    value = " ".join(value.split())
    # The older location field can hold a full address or map link.
    if len(value) > 100 or ADDRESS_MARKER.search(value):
        return ""
    if not all(char.isalpha() or char in " ,-'’" for char in value):
        return ""
    return value if any(char.isalpha() for char in value) else ""


def draft_copy(record: Record) -> dict[str, str]:
    if isinstance(record, Development):
        neighbourhood = locality(record.location)
        programme_description = "Programme immobilier" + (
            f" à {neighbourhood}." if neighbourhood else "."
        )
        return {
            "title": record.name,
            "description": programme_description,
            "neighbourhood": neighbourhood,
        }

    details = record.listing_details
    district = locality(details.get("neighborhood")) or locality(details.get("district"))
    city = locality(details.get("city"))
    place = ", ".join(dict.fromkeys(value for value in (district, city) if value))
    neighbourhood = (place if len(place) <= 100 else city or district) or locality(record.location)
    category = CATEGORY_LABELS.get(record.category, "Bien immobilier")
    title = record.marketing_name or (
        f"{category} · {neighbourhood}" if neighbourhood else category
    )
    description = details.get("description")
    if not isinstance(description, str) or not description.strip():
        facts = [category + (f" à {neighbourhood}" if neighbourhood else "")]
        if record.area_sqm is not None:
            area = format(record.area_sqm.normalize(), "f").replace(".", ",")
            facts.append(f"{area} m²")
        if record.rooms:
            facts.append(f"{record.rooms} pièce{'s' if record.rooms > 1 else ''}")
        description = " · ".join(facts) + "."
    return {
        "title": title,
        "description": description.strip()[:5000],
        "neighbourhood": neighbourhood,
    }


def build_draft(session: Session, kind: TargetKind, record: Record) -> dict[str, object]:
    parent = Document.property_id if kind == "property" else Document.development_id
    ranked = (
        select(
            Document.id.label("id"),
            Document.version.label("version"),
            Document.filename.label("filename"),
            Document.created_at.label("created_at"),
            DocumentVersion.id.label("version_id"),
            func.row_number()
            .over(
                partition_by=Document.id,
                order_by=(DocumentVersion.created_at.desc(), DocumentVersion.id.desc()),
            )
            .label("rank"),
        )
        .join(DocumentVersion, DocumentVersion.document_id == Document.id)
        .where(
            parent == record.id,
            Document.archived_at.is_(None),
            Document.purpose == "photo",
            Document.mime_type == "image/webp",
            DocumentVersion.state == "clean",
            DocumentVersion.sha256.is_not(None),
        )
        .subquery()
    )
    photos = session.execute(
        select(ranked.c.id, ranked.c.version, ranked.c.filename, ranked.c.version_id)
        .where(ranked.c.rank == 1)
        .order_by(ranked.c.created_at.desc(), ranked.c.id)
    )
    return {
        **draft_copy(record),
        "photos": [
            {"id": identifier, "version": version, "filename": filename, "version_id": version_id}
            for identifier, version, filename, version_id in photos
        ],
    }
