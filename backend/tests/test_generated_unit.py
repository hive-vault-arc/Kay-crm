"""Every supplied working form produces a bounded, readable preparation PDF."""

import hashlib
import json
import tomllib
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pypdf import PdfReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.generated.catalog import TEMPLATES
from app.generated.contracts import GenerateRequest
from app.generated.render import PreparationContext, display_value, preparation_sheet, render_pdf
from app.generated.stationery import (
    BOLD,
    BOTTOM,
    CONTENT,
    HEIGHT,
    MARGIN,
    REGULAR,
    ROOT,
    WIDTH,
    Rule,
    Text,
    plain,
)


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
    assert plain(template.title).upper() in cover
    assert "Personne synthétique" in cover or not any(
        f.key == "client_name" for f in template.fields
    )
    assert "modèle de travail" in cover.lower()
    for output_page, source_page in zip(
        reader.pages[-len(original.pages) :], original.pages, strict=True
    ):
        assert output_page.get_contents().get_data() == source_page.get_contents().get_data()
        assert list(output_page.mediabox) == list(source_page.mediabox)
        assert list(output_page.cropbox) == list(source_page.cropbox)
        assert output_page.rotation == source_page.rotation


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


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda item: item.code)
def test_selected_layout_keeps_every_bounded_value_inside_the_readable_frame(template):
    values = {
        field.key: ("Texte synthétique à vérifier. " * 40)[:1000]
        if field.multiline
        else ("Référence synthétique é " * 15)[:300]
        for field in template.fields
    }
    context = PreparationContext("deal", uuid4(), "Responsable synthétique " * 6)
    sheet = preparation_sheet(template, values, "synthetic", "20/10/2026", context)
    assert len(sheet.pages) > 1
    for page in sheet.pages:
        assert page
        for command in page:
            if isinstance(command, Text):
                assert command.x >= MARGIN - 0.001
                assert command.x + command.width <= WIDTH - MARGIN + 0.001
                assert BOTTOM <= command.top - command.size < HEIGHT - 42
            elif isinstance(command, Rule):
                assert MARGIN <= command.start < command.end <= WIDTH - MARGIN
                assert command.y >= BOTTOM


def test_selected_sheet_retains_private_parent_and_true_actor_with_literal_markup():
    parent = uuid4()
    context = PreparationContext("enquiry", parent, "Agent auteur synthétique")
    values = {
        "agent_name": "Représentant édité synthétique",
        "client_name": '<a href="https://synthetic.invalid">Texte & contrôle</a>',
    }
    sheet = preparation_sheet(TEMPLATES[0], values, "synthetic", "20/10/2026", context)
    pdf = PdfReader(BytesIO(sheet.pdf(1)))
    text = " ".join(" ".join(page.extract_text() or "" for page in pdf.pages).split())
    assert " ".join(text.split()).count(str(parent)) == 1
    assert "Préparée par : Agent auteur synthétique" in text
    assert "Représentant édité synthétique" in text
    assert values["client_name"] in text
    assert all(not page.get("/Annots") for page in pdf.pages)
    assert f"1 / {len(sheet.pages) + 1}" in pdf.pages[0].extract_text()
    assert "pointillés ne sont pas remplis automatiquement" in text


def test_linebreak_heavy_bounded_field_splits_across_pages_without_losing_its_end():
    values = {"visit_observations": "Début synthétique\n" + "\n" * 930 + "Fin synthétique"}
    sheet = preparation_sheet(TEMPLATES[0], values, "synthetic", "20/10/2026")
    assert 10 < len(sheet.pages) < 30
    for page in sheet.pages:
        assert all(not isinstance(item, Text) or item.top - item.size >= BOTTOM for item in page)
    reader = PdfReader(BytesIO(render_pdf(TEMPLATES[0], values, "synthetic", "20/10/2026")))
    text = " ".join(page.extract_text() or "" for page in reader.pages[:-1])
    assert "Début synthétique" in text and "Fin synthétique" in text
    assert "aucune signature électronique" in text


@pytest.mark.parametrize(
    ("key", "value", "expected"),
    [
        ("price_mad", "1850000.25", "1 850 000,25"),
        ("commission", "9999999999999999.99", "9 999 999 999 999 999,99"),
        ("rent", "00010,50", "00 010,50"),
        ("deposit", "0", "0"),
        ("budget", "500.000 DH - 1.000.000 DH", "500.000 DH - 1.000.000 DH"),
        ("amount", "10.009", "10.009"),
        ("price_mad", "-100.00", "-100.00"),
        ("client_phone", "212600000001", "212600000001"),
    ],
)
def test_selected_monetary_grouping_preserves_exact_decimal_semantics(key, value, expected):
    assert display_value(key, value) == expected


def test_bundled_document_fonts_logo_and_package_data_are_source_pinned():
    assets = json.loads((ROOT / "assets/document-branding.json").read_text("utf-8"))
    provenance = assets["provenance"]
    svg = ROOT.parents[2] / "frontend/public/images/workspace/kay-logo.svg"
    assert hashlib.sha256(svg.read_bytes()).hexdigest() == provenance["sourceSha256"]
    assert len(assets["paths"]) == 3
    assert sum(len(path) for path in assets["paths"]) == 132
    for path in assets["paths"]:
        for operation, coordinates in path:
            assert len(coordinates) == {"m": 2, "l": 2, "c": 6, "h": 0}[operation]
    for filename, digest in provenance["fonts"].items():
        assert hashlib.sha256((ROOT / "fonts" / filename).read_bytes()).hexdigest() == digest
    old_coverage = TTFont("coverage-old", str(ROOT / "fonts/manrope-variable.ttf")).face.charWidths
    selected_coverage = TTFont(
        "coverage-selected", str(ROOT / "fonts/manrope-regular.ttf")
    ).face.charWidths
    assert set(old_coverage) == set(selected_coverage)
    assert (
        hashlib.sha256((ROOT / provenance["license"]).read_bytes()).hexdigest()
        == provenance["licenseSha256"]
    )
    project = tomllib.loads((ROOT.parents[1] / "pyproject.toml").read_text("utf-8"))
    includes = project["tool"]["setuptools"]["package-data"]["app.generated"]
    assert {"assets/*.json", "fonts/*.ttf", "fonts/*-OFL.txt", "templates/*.pdf"} <= set(includes)
    assert CONTENT == WIDTH - 2 * MARGIN


def test_regular_and_bold_are_distinct_embedded_faces_despite_their_shared_source_name():
    sheet = preparation_sheet(
        TEMPLATES[0], {"client_name": "Client synthétique"}, "synthetic", "20/10/2026"
    )
    assert pdfmetrics.getFont(REGULAR).face is not pdfmetrics.getFont(BOLD).face
    assert pdfmetrics.getFont(REGULAR).face.name != pdfmetrics.getFont(BOLD).face.name
    reader = PdfReader(BytesIO(sheet.pdf(1)))
    embedded = set()
    for reference in reader.pages[0]["/Resources"]["/Font"].values():
        descriptor = reference.get_object().get("/FontDescriptor")
        if descriptor:
            content = descriptor.get_object()["/FontFile2"].get_data()
            embedded.add(hashlib.sha256(content).digest())
    assert len(embedded) == 2


def test_concurrent_renders_keep_page_commands_and_embedded_font_documents_independent():
    names = [f"Client synthétique isolé-{index}-fin" for index in range(8)]

    def render(name):
        result = render_pdf(TEMPLATES[0], {"client_name": name}, "synthetic", "20/10/2026")
        return PdfReader(BytesIO(result)).pages[0].extract_text()

    with ThreadPoolExecutor(max_workers=4) as workers:
        results = list(workers.map(render, names))
    for name, text in zip(names, results, strict=True):
        assert name in text
        assert all(other not in text for other in names if other != name)


def test_service_supplies_authorized_context_without_trusting_an_editable_representative(
    monkeypatch,
):
    from app.generated import service

    @contextmanager
    def session():
        yield SimpleNamespace()

    identity = SimpleNamespace(
        user=SimpleNamespace(role="agent", display_name="Vrai auteur synthétique")
    )
    events, captured = [], []
    monkeypatch.setattr(service, "current_identity", lambda *_: identity)
    monkeypatch.setattr(service, "authorize", lambda *_, **kwargs: events.append(kwargs))

    class RenderStopped(Exception):
        pass

    def capture(*args):
        captured.append(args)
        raise RenderStopped

    monkeypatch.setattr(service, "render_pdf", capture)
    parent = uuid4()
    body = GenerateRequest(
        parent_kind="enquiry",
        parent_id=parent,
        template_code="01",
        values={"agent_name": "Représentant choisi synthétique"},
    )
    with pytest.raises(RenderStopped):
        service.generate(
            SimpleNamespace(session=session), SimpleNamespace(), "synthetic-proof", uuid4(), body
        )
    assert events == [{"write": True}]
    assert captured[0][4] == PreparationContext("enquiry", parent, identity.user.display_name)
