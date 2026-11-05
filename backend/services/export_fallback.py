"""Portable renderer used only when Chromium cannot launch.

Puppeteer remains the primary path. This renderer keeps local/offline exports
usable in restricted servers by drawing the same five semantic sections with
ReportLab and converting card pages with PyMuPDF.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Sequence

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas


FONT_NAME = "HYSMyeongJo-Medium"


def _font() -> str:
    try:
        pdfmetrics.getFont(FONT_NAME)
    except KeyError:
        pdfmetrics.registerFont(UnicodeCIDFont(FONT_NAME))
    return FONT_NAME


def _lines(value: Any, max_chars: int) -> List[str]:
    text = str(value or "").strip()
    if not text:
        return [""]
    output: List[str] = []
    for paragraph in text.splitlines() or [text]:
        paragraph = paragraph.strip()
        if not paragraph:
            output.append("")
            continue
        output.extend(paragraph[index : index + max_chars] for index in range(0, len(paragraph), max_chars))
    return output


def _draw_image(c: canvas.Canvas, path: str, x: float, y: float, width: float, height: float) -> None:
    try:
        c.drawImage(ImageReader(path), x, y, width, height, preserveAspectRatio=True, anchor="c", mask="auto")
    except Exception:
        c.setFillColor(HexColor("#e8eef3"))
        c.rect(x, y, width, height, stroke=0, fill=1)


def _draw_wrapped(
    c: canvas.Canvas,
    value: Any,
    x: float,
    y: float,
    max_chars: int,
    font_size: float,
    leading: float,
    max_lines: int | None = None,
) -> float:
    c.setFont(_font(), font_size)
    c.setFillColor(HexColor("#334155"))
    lines = _lines(value, max_chars)
    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = f"{lines[-1][:-1]}…" if lines[-1] else "…"
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def render_pdf_fallback(snapshot: Dict[str, Any], assets: Sequence[Any], output_path: str) -> None:
    try:
        import pymupdf as fitz
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is required for fallback PDF rendering") from exc

    width, height = A4
    file_descriptor, source_pdf = tempfile.mkstemp(
        suffix="-source.pdf",
        dir=str(Path(output_path).parent),
    )
    os.close(file_descriptor)
    c = canvas.Canvas(source_pdf, pagesize=A4, pageCompression=1)
    cover_path = assets[0].path if assets else ""

    c.setFillColor(HexColor("#f8fbfd"))
    c.rect(0, 0, width, height, stroke=0, fill=1)
    if cover_path:
        _draw_image(c, cover_path, 0, height * 0.39, width, height * 0.61)
    c.setFillColor(HexColor("#0f78b8"))
    c.setFont(_font(), 12)
    c.drawString(54, height * 0.32, "Reminiscence Note")
    c.setFillColor(HexColor("#14213d"))
    c.setFont(_font(), 28)
    title_lines = _lines(snapshot.get("title") or "제목 없는 추억", 20)[:3]
    title_y = height * 0.27
    for line in title_lines:
        c.drawString(54, title_y, line)
        title_y -= 36
    c.setFillColor(HexColor("#64748b"))
    c.setFont(_font(), 11)
    c.drawString(54, 54, f"{snapshot.get('yearEstimate') or '시기 미정'} · {snapshot.get('location') or '장소 미정'}")
    c.showPage()

    sections = [
        ("그날의 장면", snapshot.get("sceneDescription")),
        ("나의 기억", snapshot.get("remembered")),
        ("기억나지 않는 것", snapshot.get("unremembered")),
        ("지금 다시 바라보니", snapshot.get("reflection")),
    ]
    photo_index = 1
    for heading, body in sections:
        remaining_lines = _lines(body or "아직 기록하지 않은 부분입니다.", 31)
        first_page = True
        while remaining_lines:
            c.setFillColor(white)
            c.rect(0, 0, width, height, stroke=0, fill=1)
            c.setFillColor(HexColor("#0f78b8"))
            c.setFont(_font(), 12)
            c.drawString(54, height - 60, heading)
            c.setFillColor(HexColor("#14213d"))
            c.setFont(_font(), 25)
            c.drawString(54, height - 100, heading if first_page else f"{heading} (계속)")
            y = height - 150
            if first_page and assets:
                photo = assets[photo_index % len(assets)]
                _draw_image(c, photo.path, width * 0.54, height * 0.32, width * 0.38, height * 0.48)
                photo_index += 1
                max_chars = 23
                max_lines = 26
            else:
                max_chars = 38
                max_lines = 34
            page_lines, remaining_lines = remaining_lines[:max_lines], remaining_lines[max_lines:]
            c.setFont(_font(), 12.5)
            c.setFillColor(HexColor("#334155"))
            for line in page_lines:
                c.drawString(54, y, line)
                y -= 21
            c.setFillColor(HexColor("#94a3b8"))
            c.setFont(_font(), 8)
            c.drawString(54, 30, str(snapshot.get("title") or "Reminiscence Note"))
            c.showPage()
            first_page = False
    c.save()

    # ReportLab's Korean CID font is not embedded and some PDF viewers render
    # it as empty boxes. PyMuPDF can resolve that CID font reliably, so the
    # portable fallback fixes each page into a high-resolution image. The
    # primary Puppeteer path remains text-based and selectable.
    source = fitz.open(source_pdf)
    rendered = fitz.open()
    try:
        for page in source:
            target_page = rendered.new_page(width=page.rect.width, height=page.rect.height)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            target_page.insert_image(target_page.rect, stream=pixmap.tobytes("png"))
        rendered.save(output_path, deflate=True)
    finally:
        rendered.close()
        source.close()
        Path(source_pdf).unlink(missing_ok=True)


def render_cards_fallback(
    snapshot: Dict[str, Any],
    assets: Sequence[Any],
    output_dir: str,
    width: int,
    height: int,
    image_format: str,
) -> None:
    try:
        import pymupdf as fitz
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is required for fallback card rendering") from exc

    os.makedirs(output_dir, exist_ok=True)
    temp_pdf = os.path.join(output_dir, "cards-source.pdf")
    c = canvas.Canvas(temp_pdf, pagesize=(width, height), pageCompression=1)
    photo_paths = [asset.path for asset in assets]
    cover = photo_paths[0] if photo_paths else ""

    def base(fill: str = "#fbfdff") -> None:
        c.setFillColor(HexColor(fill))
        c.rect(0, 0, width, height, stroke=0, fill=1)

    def heading(text: str, x: float, y: float, size: int = 48) -> float:
        c.setFillColor(HexColor("#14213d"))
        c.setFont(_font(), size)
        for line in _lines(text, 18)[:3]:
            c.drawString(x, y, line)
            y -= size * 1.25
        return y

    # Card 1: cover
    base("#14213d")
    if cover:
        _draw_image(c, cover, 0, height * 0.28, width, height * 0.72)
    c.setFillColor(HexColor("#14213d"))
    c.rect(0, 0, width, height * 0.33, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont(_font(), 54)
    y = height * 0.23
    for line in _lines(snapshot.get("title") or "제목 없는 추억", 17)[:2]:
        c.drawString(width * 0.08, y, line)
        y -= 68
    c.setFont(_font(), 22)
    c.drawString(width * 0.08, height * 0.07, f"{snapshot.get('yearEstimate') or '시기 미정'} · {snapshot.get('location') or '장소 미정'}")
    c.showPage()

    # Card 2: scene
    base()
    y = heading("그날의 장면", width * 0.07, height * 0.88)
    _draw_wrapped(c, snapshot.get("sceneDescription"), width * 0.07, y - 20, 24, 24, 38, 15)
    if photo_paths:
        _draw_image(c, photo_paths[min(1, len(photo_paths) - 1)], width * 0.53, height * 0.08, width * 0.4, height * 0.82)
    c.showPage()

    # Card 3: remembered
    base("#f8fbfd")
    y = heading("나의 기억", width * 0.07, height * 0.9)
    _draw_wrapped(c, snapshot.get("remembered"), width * 0.07, y - 12, 34, 23, 36, 13)
    gallery_y = height * 0.08
    gallery_h = height * 0.31
    gallery_w = width * 0.26
    for index, photo in enumerate(photo_paths[:3]):
        _draw_image(c, photo, width * 0.07 + index * (gallery_w + width * 0.035), gallery_y, gallery_w, gallery_h)
    c.showPage()

    # Card 4: unremembered
    base("#edf7fb")
    y = heading("기억나지 않는 것", width * 0.1, height * 0.7)
    _draw_wrapped(c, snapshot.get("unremembered") or "기억나지 않는 부분도 이 기록의 한 조각입니다.", width * 0.1, y - 22, 31, 25, 42, 17)
    c.showPage()

    # Card 5: reflection
    base("#fbf8f2")
    if cover:
        _draw_image(c, cover, width * 0.07, height * 0.15, width * 0.38, height * 0.7)
    y = heading("지금 다시 바라보니", width * 0.51, height * 0.78, 40)
    _draw_wrapped(c, snapshot.get("reflection"), width * 0.51, y - 20, 19, 24, 39, 15)
    c.showPage()
    c.save()

    document = fitz.open(temp_pdf)
    extension = "jpg" if image_format == "jpeg" else "png"
    for index, page in enumerate(document):
        pixmap = page.get_pixmap(alpha=False)
        target = os.path.join(output_dir, f"card-{index + 1:02d}.{extension}")
        if image_format == "jpeg":
            pixmap.pil_save(target, format="JPEG", quality=92)
        else:
            pixmap.save(target)
    document.close()
    os.remove(temp_pdf)
