"""Every supplied working form produces a bounded, readable preparation PDF."""

from io import BytesIO
from pathlib import Path

import pytest
from pypdf import PdfReader

from app.generated.catalog import TEMPLATES
from app.generated.contracts import GenerateRequest
from app.generated.render import render_pdf


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda item: item.code)
def test_all_twelve_templates_keep_the_original_as_appendix(template):
    content = render_pdf(
        template,
        {"client_name": "Personne synthétique", "conditions": "Une ligne\nUne autre"},
        "deadbeef",
        "20/10/2026",
    )
    assert content.startswith(b"%PDF-")
    assert len(content) < 20 * 1024 * 1024
    reader = PdfReader(BytesIO(content))
    assert len(reader.pages) >= 2
    original = PdfReader(Path("app/generated/templates") / template.source)
    assert len(reader.pages) > len(original.pages)
    for output_page, source_page in zip(
        reader.pages[-len(original.pages) :], original.pages, strict=True
    ):
        assert output_page.extract_text() == source_page.extract_text()
    cover = " ".join((page.extract_text() or "") for page in reader.pages[: -len(original.pages)])
    assert template.title in cover
    assert "Personne synthétique" in cover or not any(
        f.key == "client_name" for f in template.fields
    )
    assert "modèle de travail" in cover.lower()


def test_editable_text_is_not_interpreted_as_reportlab_markup():
    payload = render_pdf(
        TEMPLATES[0], {"client_name": "<b>Test & contrôle</b>"}, "a1b2c3d4", "20/10/2026"
    )
    cover = PdfReader(BytesIO(payload)).pages[0].extract_text()
    assert "<b>Test & contrôle</b>" in cover


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda item: item.code)
def test_long_bounded_fields_remain_renderable(template):
    values = {
        field.key: ("Observation synthétique. " * 45)[:1000]
        if field.multiline
        else ("Référence synthétique " * 15)[:300]
        for field in template.fields
    }
    payload = render_pdf(template, values, "a1b2c3d4", "20/10/2026")
    assert PdfReader(BytesIO(payload)).pages


def test_short_visit_uses_one_preparation_page_without_orphan_note():
    payload = render_pdf(TEMPLATES[0], {}, "a1b2c3d4", "20/10/2026")
    assert len(PdfReader(BytesIO(payload)).pages) == 2


def test_unknown_and_control_values_are_rejected():
    with pytest.raises(ValueError):
        GenerateRequest(
            parent_kind="enquiry",
            parent_id="00000000-0000-4000-8000-000000000000",
            template_code="01",
            values={"client_name": "\x00"},
        )
