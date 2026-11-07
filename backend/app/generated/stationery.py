"""Selected KAY stationery geometry, using bounded local fonts and vector assets.

The layout records page-local commands before painting so page totals are known.
No user text is parsed as markup, persisted, logged or included in diagnostics.
"""

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from threading import Lock
from typing import TypedDict, cast

from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas

ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT, MARGIN, BOTTOM = 595.28, 841.89, 48.0, 56.0
CONTENT = WIDTH - 2 * MARGIN
REGULAR, BOLD = "KAY-Document-Regular", "KAY-Document-Bold"
INK, MUTED, RULE = (
    colors.Color(0.065, 0.10, 0.15),
    colors.Color(0.34, 0.39, 0.46),
    colors.Color(0.75, 0.76, 0.78),
)
FONT_LOCK = Lock()


class Branding(TypedDict):
    viewBox: list[float]
    paths: list[list[tuple[str, list[float]]]]


@lru_cache(maxsize=1)
def _branding() -> Branding:
    return cast(Branding, json.loads((ROOT / "assets/document-branding.json").read_text("utf-8")))


def fonts() -> None:
    with FONT_LOCK:
        for name, source in ((REGULAR, "manrope-regular.ttf"), (BOLD, "manrope-bold.ttf")):
            if name not in pdfmetrics.getRegisteredFontNames():
                font = TTFont(name, str(ROOT / "fonts" / source))
                # Both selected static instances retain the variable font's internal
                # face name. ReportLab otherwise aliases Bold to the first face.
                # This changes the embedded descriptor identity, not the source bytes.
                font.face.name = name.encode("ascii")
                pdfmetrics.registerFont(font)


def plain(value: str) -> str:
    return re.sub("[\u2010-\u2015\u2212]", "-", value)


def text_width(value: str, size: float, font: str = REGULAR) -> float:
    return float(pdfmetrics.stringWidth(value, font, size))


@dataclass(frozen=True)
class Text:
    value: str
    x: float
    top: float
    size: float
    font: str = REGULAR
    color: colors.Color = INK

    @property
    def width(self) -> float:
        return text_width(self.value, self.size, self.font)


@dataclass(frozen=True)
class Rule:
    start: float
    end: float
    y: float


@dataclass(frozen=True)
class Row:
    runs: tuple[tuple[str, str], ...]
    size: float
    leading: float
    rule: tuple[float, float, float] | None = None


@dataclass(frozen=True)
class FieldPlan:
    rows: tuple[Row, ...]
    after: float

    @property
    def height(self) -> float:
        return sum(row.leading for row in self.rows) + self.after


class Stationery:
    def __init__(self, title: str, metadata: list[tuple[str, str]]) -> None:
        fonts()
        self.pages: list[list[Text | Rule]] = []
        self.y = 0.0
        self.new_page()
        title = plain(title).upper()
        size = 20.0
        while size > 16 and text_width(title, size, BOLD) > CONTENT:
            size -= 0.5
        for row in self.line_rows(title, size, CONTENT, BOLD):
            self.draw(row, MARGIN + (CONTENT - text_width(row, size, BOLD)) / 2, self.y, size, BOLD)
            self.y -= size + 5
        self.y -= 2
        subtitle = "Fiche de préparation"
        self.draw(
            subtitle, MARGIN + (CONTENT - text_width(subtitle, 8.8)) / 2, self.y, 8.8, color=MUTED
        )
        self.y -= 26.5
        column = (CONTENT - 24) / 2
        for left, right in metadata:
            rows = [self.line_rows(value, 8.8, column) for value in (left, right)]
            height = max(len(row) for row in rows) * 13
            self.ensure(height)
            for index, lines in enumerate(rows):
                for number, line in enumerate(lines):
                    self.draw(
                        line, MARGIN + index * (column + 24), self.y - number * 13, 8.8, color=MUTED
                    )
            self.y -= height
        if metadata:
            self.y -= 10

    def new_page(self) -> None:
        self.pages.append([])
        self.y = HEIGHT - 104

    def ensure(self, height: float) -> None:
        if self.y - height < BOTTOM:
            self.new_page()

    def draw(
        self,
        value: str,
        x: float,
        top: float,
        size: float = 10,
        font: str = REGULAR,
        color: colors.Color = INK,
    ) -> None:
        self.pages[-1].append(Text(plain(value) or " ", x, top, size, font, color))

    def line_rows(self, value: str, size: float, width: float, font: str = REGULAR) -> list[str]:
        rows: list[str] = []
        for paragraph in plain(value).replace("\r\n", "\n").replace("\r", "\n").split("\n"):
            current = ""
            for word in paragraph.split():
                next_row = f"{current} {word}" if current else word
                if text_width(next_row, size, font) <= width:
                    current = next_row
                    continue
                if current:
                    rows.append(current)
                    current = ""
                for char in word:
                    if current and text_width(current + char, size, font) > width:
                        rows.append(current)
                        current = ""
                    current += char
            rows.append(current)
        return rows or [""]

    def paragraph(
        self,
        value: str,
        *,
        size: float = 8.8,
        leading: float = 12.5,
        after: float = 12,
        together: bool = False,
    ) -> None:
        rows = self.line_rows(value, size, CONTENT)
        height = len(rows) * leading + after
        if together and height <= HEIGHT - 104 - BOTTOM:
            self.ensure(height)
        for row in rows:
            self.ensure(leading)
            self.draw(row, MARGIN, self.y, size)
            self.y -= leading
        self.y -= after

    def heading(self, value: str) -> None:
        rows = self.line_rows(value, 10.5, CONTENT, BOLD)
        self.ensure(len(rows) * 15 + 28)
        self.y -= 5
        for row in rows:
            self.draw(row, MARGIN, self.y, 10.5, BOLD)
            self.y -= 15
        self.y -= 3

    def rich_rows(self, label: str, value: str, width: float) -> tuple[Row, ...]:
        rows: list[Row] = []
        runs: list[tuple[str, str]] = []
        used = 0.0

        def finish() -> None:
            nonlocal used
            while runs and runs[-1][0].isspace():
                runs.pop()
            rows.append(Row(tuple(runs), 9.5, 13.6))
            runs.clear()
            used = 0

        def add(value: str, font: str) -> None:
            nonlocal used
            if runs and runs[-1][1] == font:
                runs[-1] = (runs[-1][0] + value, font)
            else:
                runs.append((value, font))
            used += text_width(value, 9.5, font)

        for text, font in ((plain(label) + " : ", BOLD), (plain(value), REGULAR)):
            for piece in re.findall(r"\n|[^\S\n]+|[^\s]+", text):
                if piece == "\n":
                    finish()
                elif piece.isspace():
                    if used and used + text_width(" ", 9.5, font) <= width:
                        add(" ", font)
                    elif used:
                        finish()
                else:
                    if used and used + text_width(piece, 9.5, font) > width:
                        finish()
                    if text_width(piece, 9.5, font) > width:
                        for char in piece:
                            if used and used + text_width(char, 9.5, font) > width:
                                finish()
                            add(char, font)
                    else:
                        add(piece, font)
        if runs:
            finish()
        return tuple(rows)

    def field_plan(self, label: str, value: str, width: float, multiline: bool) -> FieldPlan:
        if not value.strip():
            text = label if ":" in label or text_width(label + " :", 9.2) > width else label + " :"
            labels = self.line_rows(text, 9.2, width)
            last_width = text_width(labels[-1], 9.2)
            inline = len(labels) == 1 and width - last_width >= 80
            rows = [Row(((row, REGULAR),), 9.2, 13) for row in labels]
            if inline:
                rows[-1] = Row(rows[-1].runs, 9.2, 13, (last_width + 8, width, -10.2))
            else:
                rows.append(Row((), 9.2, 17, (0, width, -7)))
            return FieldPlan(tuple(rows), 9 if inline else 0)
        if multiline:
            rows = [
                Row(((row, BOLD),), 10, 13.6)
                for row in self.line_rows(label + " :", 10, width, BOLD)
            ]
            rows += [Row(((row, REGULAR),), 10, 13.6) for row in self.line_rows(value, 10, width)]
            return FieldPlan(tuple(rows), 8)
        return FieldPlan(self.rich_rows(label, value, width), 8)

    def draw_row(self, row: Row, x: float, top: float) -> None:
        left = x
        for value, font in row.runs:
            self.draw(value, left, top, row.size, font)
            left += text_width(value, row.size, font)
        if row.rule:
            start, end, offset = row.rule
            self.pages[-1].append(Rule(x + start, x + end, top + offset))

    def fields(self, entries: list[tuple[str, str, bool]]) -> None:
        column = (CONTENT - 28) / 2 if len(entries) == 2 else CONTENT
        plans = [
            self.field_plan(label, value, column, multiline) for label, value, multiline in entries
        ]
        height = max(plan.height for plan in plans)
        if height > HEIGHT - 104 - BOTTOM and len(plans) == 1:
            # A bounded field can contain hundreds of line breaks. Split its rows,
            # rather than letting an oversized block escape the page/footer.
            for row in plans[0].rows:
                self.ensure(row.leading)
                self.draw_row(row, MARGIN, self.y)
                self.y -= row.leading
            self.y -= plans[0].after
            return
        self.ensure(height)
        for index, plan in enumerate(plans):
            top = self.y
            for row in plan.rows:
                self.draw_row(row, MARGIN + index * (column + 28), top)
                top -= row.leading
        self.y -= height

    def pdf(self, appendix_pages: int) -> bytes:
        data = BytesIO()
        canvas = Canvas(data, pagesize=(WIDTH, HEIGHT), pageCompression=1)
        for number, page in enumerate(self.pages, 1):
            _wordmark(canvas)
            for item in page:
                if isinstance(item, Text):
                    canvas.setFillColor(item.color)
                    canvas.setFont(item.font, item.size)
                    canvas.drawString(item.x, item.top - item.size, item.value)
                else:
                    canvas.setStrokeColor(RULE)
                    canvas.setLineWidth(0.35)
                    canvas.line(item.start, item.y, item.end, item.y)
            canvas.setStrokeColor(RULE)
            canvas.setLineWidth(0.4)
            canvas.line(MARGIN, 37, WIDTH - MARGIN, 37)
            canvas.setFillColor(MUTED)
            canvas.setFont(REGULAR, 7)
            canvas.drawString(MARGIN, 24, "Document de travail · À compléter et à faire valider")
            canvas.drawRightString(
                WIDTH - MARGIN, 24, f"{number} / {len(self.pages) + appendix_pages}"
            )
            canvas.showPage()
        canvas.save()
        return data.getvalue()


def _wordmark(canvas: Canvas) -> None:
    logo = _branding()
    canvas.saveState()
    canvas.translate(MARGIN, HEIGHT - 42)
    scale = 48 / logo["viewBox"][2]
    canvas.scale(scale, -scale)
    canvas.setFillColor(colors.Color(0.153, 0.153, 0.153))
    for commands in logo["paths"]:
        path = canvas.beginPath()
        for command, args in commands:
            if command == "m":
                path.moveTo(*args)
            elif command == "l":
                path.lineTo(*args)
            elif command == "c":
                path.curveTo(*args)
            elif command == "h":
                path.close()
            else:
                raise ValueError("INVALID_BUNDLED_DOCUMENT_LOGO")
        canvas.drawPath(path, stroke=0, fill=1, fillMode=1)
    canvas.restoreState()
