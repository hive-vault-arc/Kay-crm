"""Read-only comparison of the frozen selected blank models and bundled originals.

Run with the project's .venv interpreter. This imports no application, database,
configuration or service module, and never writes or regenerates a PDF.
"""

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

from pypdf import PdfReader

REPOSITORY = Path(__file__).resolve().parents[2]


def literal(value: str) -> str:
    """Ignore case/line wrapping and blank writing rules, retaining punctuation."""
    value = unicodedata.normalize("NFC", value).casefold()
    return re.sub(r"\s+", "", re.sub(r"\.{3,}|_{3,}", "", value))


def body_characters(value: str) -> str:
    """A second whole-body check; literal chunk checks separately retain punctuation."""
    return re.sub(r"[\W_]+", "", unicodedata.normalize("NFC", value).casefold())


def compare_text(
    original: list[list[str]], selected: list[list[str]], blocks: list[dict[str, Any]]
) -> dict[str, Any]:
    if (
        not original
        or not selected
        or any(
            len(page) < 6 or not page[0].startswith("KAY  /  DOCUMENTS IMMOBILIERS")
            for page in original
        )
    ):
        raise ValueError("UNEXPECTED_ORIGINAL_PAGE_FURNITURE")
    if len(selected[0]) < 5 or selected[0][1] != "Modèle de document":
        raise ValueError("UNEXPECTED_SELECTED_PAGE_FURNITURE")
    notice = original[0][3]
    raw_original = "\n".join(line for page in original for line in page)
    raw_selected = "\n".join(line for page in selected for line in page)
    a = body_characters("\n".join(line for page in original for line in page[6:]))
    b = body_characters(
        "\n".join(selected[0][4:] + [line for page in selected[1:] for line in page])
    )
    a, b = a.replace(body_characters(notice), ""), b.replace(body_characters(notice), "")
    chunks: list[str] = []
    table_headers: list[dict[str, Any]] = []
    for block in blocks:
        kind = block["type"]
        if kind in {"paragraph", "heading"}:
            chunks.append(block["text"])
        elif kind == "fields":
            chunks.extend(block["labels"])
        elif kind == "table":
            chunks.extend(block["columns"])
            chunks.extend(cell for row in block["rows"] for cell in row if cell.strip())
            header = body_characters(" ".join(block["columns"]))
            table_headers.append({"original": a.count(header), "selected": b.count(header)})
            a, b = a.replace(header, ""), b.replace(header, "")
        elif kind != "writing":
            raise ValueError("UNKNOWN_CONTENT_BLOCK")
    return {
        "literalParts": len(chunks),
        "literalPartsPresentInBoth": all(
            literal(chunk) in literal(raw_original) and literal(chunk) in literal(raw_selected)
            for chunk in chunks
        ),
        "bodyEquivalentAfterExplicitLayoutNormalization": a == b,
        "bodyCharacters": len(a),
        "normalizedBodySha256": hashlib.sha256(a.encode()).hexdigest(),
        "originalFirstNoticeRetained": literal(notice) in literal(raw_selected),
        "tableHeaderOccurrences": table_headers,
    }


def run(prototype: Path) -> dict[str, Any]:
    content_path = prototype / "src/document-model-content.json"
    content = json.loads(content_path.read_text(encoding="utf-8"))
    if sorted(content) != [f"{number:02}" for number in range(1, 13)]:
        raise ValueError("MODEL_SET_MISMATCH")
    rows = []
    for code, model in sorted(content.items()):
        source = model["source"]
        if Path(source).name != source or not source.startswith(f"{code}_"):
            raise ValueError("MODEL_SOURCE_MISMATCH")
        original_path = REPOSITORY / "docs/reference/real-estate-document-templates" / source
        original = original_path.read_bytes()
        bundled = (REPOSITORY / "backend/app/generated/templates" / source).read_bytes()
        prototype_original = (prototype / "public/assets/document-models" / source).read_bytes()
        selected_path = prototype / "public/assets/document-models-kay" / source
        selected = selected_path.read_bytes()
        original_pdf, selected_pdf = PdfReader(original_path), PdfReader(selected_path)
        original_lines = [(page.extract_text() or "").splitlines() for page in original_pdf.pages]
        selected_lines = [(page.extract_text() or "").splitlines() for page in selected_pdf.pages]
        comparison = compare_text(original_lines, selected_lines, model["blocks"])
        rows.append(
            {
                "code": code,
                "source": source,
                "title": model["title"],
                "originalSha256": hashlib.sha256(original).hexdigest(),
                "selectedSha256": hashlib.sha256(selected).hexdigest(),
                "allThreeOriginalCopiesEqual": original == bundled == prototype_original,
                "originalPages": len(original_pdf.pages),
                "selectedPages": len(selected_pdf.pages),
                **comparison,
            }
        )
    passed = all(
        row["allThreeOriginalCopiesEqual"]
        and row["literalPartsPresentInBoth"]
        and row["bodyEquivalentAfterExplicitLayoutNormalization"]
        and row["originalFirstNoticeRetained"]
        for row in rows
    )
    return {
        "date": "2026-10-28",
        "readOnly": True,
        "passed": passed,
        "legalEquivalenceClaimed": False,
        "runtimeChanged": False,
        "contentSha256": hashlib.sha256(content_path.read_bytes()).hexdigest(),
        "normalization": [
            "Literal chunks: NFC, case and whitespace; dotted/underscore blank writing rules.",
            "Whole body: alphanumeric stream after known page furniture and repeated first notice.",
            "Table headings removed only for comparison; "
            "each literal cell/heading is separately checked.",
            "No legal/public-source lookup or validation; "
            "extraction does not prove visual placement.",
        ],
        "rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prototype", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    output = arguments.output.resolve()
    allowed = (
        REPOSITORY / "docs/03-planning/design-migration-evidence",
        REPOSITORY / ".git",
    )
    if output.suffix != ".json" or not any(output.is_relative_to(root) for root in allowed):
        raise ValueError("REPORT_OUTPUT_PATH_REFUSED")
    result = run(arguments.prototype)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {"models": len(result["rows"]), "passed": result["passed"], "runtimeChanged": False}
        )
    )
    if not result["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
