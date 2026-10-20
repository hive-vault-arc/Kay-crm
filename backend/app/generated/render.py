"""Branded preparation sheet plus the unchanged owner-supplied blank model."""

from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.generated.catalog import Template

ROOT = Path(__file__).resolve().parent
INK = colors.HexColor("#272727")
MUTED = colors.HexColor("#635F58")
GOLD = colors.HexColor("#D8AA45")
CREAM = colors.HexColor("#FAF8F4")
LINE = colors.HexColor("#DEDAD1")


def _fonts() -> None:
    if "KAY-Manrope" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("KAY-Manrope", str(ROOT / "fonts/manrope-variable.ttf")))
        pdfmetrics.registerFont(TTFont("KAY-Fraunces", str(ROOT / "fonts/fraunces-variable.ttf")))


def _paragraph(value: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(value).replace("\n", "<br/>"), style)


def _page(canvas: object, document: object) -> None:
    from reportlab.pdfgen.canvas import Canvas

    painter = canvas
    assert isinstance(painter, Canvas)  # noqa: S101
    width, height = A4
    painter.saveState()
    painter.setFillColor(CREAM)
    painter.rect(0, height - 30, width, 30, stroke=0, fill=1)
    painter.setFillColor(GOLD)
    painter.rect(0, height - 32, width, 2, stroke=0, fill=1)
    painter.setFont("KAY-Manrope", 9)
    painter.setFillColor(INK)
    painter.drawString(42, height - 20, "KAY  /  DOCUMENTS IMMOBILIERS")
    painter.setStrokeColor(LINE)
    painter.line(42, 42, width - 42, 42)
    painter.setFont("KAY-Manrope", 8)
    painter.setFillColor(MUTED)
    painter.drawString(
        42, 28, "Préparation interne · modèle de travail · aucune signature électronique"
    )
    painter.drawRightString(width - 42, 28, f"{getattr(document, 'page', 1)}")
    painter.restoreState()


def render_pdf(
    template: Template, values: dict[str, str], reference: str, date_label: str
) -> bytes:
    """Escape every editable value; never silently transform a draft into an executable contract."""
    _fonts()
    data = BytesIO()
    doc = SimpleDocTemplate(
        data,
        pagesize=A4,
        leftMargin=42,
        rightMargin=42,
        topMargin=58,
        bottomMargin=60,
        title="KAY — document de travail",
        author="KAY Real Estate",
    )
    eyebrow = ParagraphStyle(
        "eyebrow", fontName="KAY-Manrope", fontSize=9, leading=14, textColor=MUTED
    )
    title = ParagraphStyle("title", fontName="KAY-Fraunces", fontSize=25, leading=31, textColor=INK)
    intro = ParagraphStyle(
        "intro", fontName="KAY-Manrope", fontSize=10, leading=16, textColor=MUTED
    )
    heading = ParagraphStyle(
        "heading", fontName="KAY-Fraunces", fontSize=14, leading=19, textColor=INK
    )
    label = ParagraphStyle("label", fontName="KAY-Manrope", fontSize=8, leading=13, textColor=MUTED)
    answer = ParagraphStyle(
        "answer", fontName="KAY-Manrope", fontSize=10, leading=16, textColor=INK
    )
    caution = ParagraphStyle(
        "caution", fontName="KAY-Manrope", fontSize=9, leading=15, textColor=INK, alignment=TA_LEFT
    )

    story: list[Flowable] = [
        _paragraph(f"DOSSIER {reference.upper()}  ·  {date_label}", eyebrow),
        Spacer(1, 9),
        _paragraph(template.title, title),
        Spacer(1, 8),
        _paragraph(
            "Fiche préparatoire préremplie. Les valeurs ci-dessous ne valident ni les clauses "
            "ni les justificatifs. Le modèle vierge original suit en annexe ; ses pointillés "
            "ne sont pas remplis automatiquement.",
            intro,
        ),
        Spacer(1, 18),
    ]
    warning = Table([[_paragraph(template.warning, caution)]], colWidths=[A4[0] - 84])
    warning.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F6EEDB")),
                ("BOX", (0, 0), (-1, -1), 0.6, GOLD),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.extend([warning, Spacer(1, 20)])
    groups = dict.fromkeys(field.group for field in template.fields)
    for group in groups:
        story.extend(
            [
                _paragraph(group, heading),
                Spacer(1, 6),
                HRFlowable(width="100%", thickness=0.7, color=LINE),
                Spacer(1, 7),
            ]
        )
        rows: list[list[Paragraph]] = []
        for field in template.fields:
            if field.group != group:
                continue
            value = values.get(field.key, "").strip() or "À compléter"
            rows.append([_paragraph(field.label, label), _paragraph(value, answer)])
        table = Table(rows, colWidths=[170, A4[0] - 84 - 170], hAlign="LEFT", repeatRows=0)
        table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.35, LINE),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (0, -1), 15),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.extend([table, Spacer(1, 18)])
    doc.build(story, onFirstPage=_page, onLaterPages=_page)

    combined = BytesIO()
    writer = PdfWriter()
    for page in PdfReader(BytesIO(data.getvalue())).pages:
        writer.add_page(page)
    source = ROOT / "templates" / template.source
    for page in PdfReader(source).pages:
        writer.add_page(page)
    writer.add_metadata(
        {"/Title": f"KAY — {template.title} — préparation", "/Author": "KAY Real Estate"}
    )
    writer.write(combined)
    return combined.getvalue()
