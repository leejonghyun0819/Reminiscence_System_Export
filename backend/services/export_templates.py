"""HTML templates shared by PDF memory books and image-card exports."""

from __future__ import annotations

from html import escape
from typing import Any, Dict, Iterable, List


TEMPLATE_LABELS = {
    "minimal": "Minimal",
    "photo_essay": "Photo Essay",
}

CARD_PRESETS = {
    "portrait": (1080, 1350),
    "square": (1080, 1080),
    "landscape": (1920, 1080),
}


def _text(value: Any, fallback: str = "") -> str:
    value = str(value or "").strip()
    return escape(value if value else fallback).replace("\n", "<br>")


def _shorten(value: Any, limit: int) -> str:
    raw = str(value or "").strip()
    if len(raw) <= limit:
        return raw
    return f"{raw[: max(0, limit - 1)].rstrip()}…"


def _image(photo: Dict[str, Any] | None, class_name: str = "photo") -> str:
    if not photo or not photo.get("dataUri"):
        return '<div class="photo placeholder"><span>Reminiscence Note</span></div>'
    return (
        f'<img class="{class_name}" src="{photo["dataUri"]}" '
        f'alt="{escape(str(photo.get("fileName") or "추억 사진"))}">'
    )


def _gallery(photos: Iterable[Dict[str, Any]], max_items: int = 4) -> str:
    chosen = list(photos)[:max_items]
    if not chosen:
        return '<div class="gallery empty"></div>'
    return '<div class="gallery">' + "".join(_image(photo, "gallery-photo") for photo in chosen) + "</div>"


def _base_css(template: str) -> str:
    photo_essay = template == "photo_essay"
    accent = "#0f78b8" if not photo_essay else "#9a6449"
    paper = "#ffffff" if not photo_essay else "#fbf8f2"
    return f"""
      :root {{ --accent: {accent}; --paper: {paper}; --ink: #14213d; --muted: #64748b; }}
      * {{ box-sizing: border-box; }}
      html, body {{ margin: 0; padding: 0; background: #eef4f8; color: var(--ink); }}
      body {{ font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif; }}
      .page, .export-card {{ position: relative; overflow: hidden; background: var(--paper); }}
      .eyebrow {{ color: var(--accent); font-size: 14px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }}
      h1, h2, p {{ margin-top: 0; }}
      h1 {{ font-size: 42px; line-height: 1.18; letter-spacing: -.03em; margin-bottom: 18px; }}
      h2 {{ font-size: 30px; line-height: 1.25; letter-spacing: -.02em; margin-bottom: 22px; }}
      p {{ font-size: 17px; line-height: 1.85; color: #334155; overflow-wrap: anywhere; }}
      .meta {{ display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0; }}
      .meta span {{ border: 1px solid #d9e4ec; border-radius: 999px; padding: 7px 13px; color: #52657a; font-size: 13px; }}
      .photo {{ width: 100%; height: 100%; object-fit: cover; display: block; background: #e8eef3; }}
      .placeholder {{ display: flex; align-items: center; justify-content: center; color: #8fa1b3; }}
      .gallery {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; }}
      .gallery-photo {{ width: 100%; height: 220px; object-fit: cover; border-radius: 12px; background: #e8eef3; }}
      .section-tag {{ display: inline-flex; border-radius: 999px; padding: 7px 12px; background: #eaf6fd; color: var(--accent); font-size: 13px; font-weight: 800; margin-bottom: 18px; }}
      .rule {{ width: 42px; height: 4px; background: var(--accent); border-radius: 4px; margin: 18px 0 24px; }}
      .footer {{ position: absolute; left: 44px; right: 44px; bottom: 26px; display: flex; justify-content: space-between; color: #94a3b8; font-size: 11px; }}
    """


def render_pdf_html(
    snapshot: Dict[str, Any],
    photos: List[Dict[str, Any]],
    template: str = "minimal",
) -> str:
    template = template if template in TEMPLATE_LABELS else "minimal"
    cover = photos[0] if photos else None
    rest = photos[1:] if len(photos) > 1 else photos
    sections = [
        ("그날의 장면", snapshot.get("sceneDescription"), rest[:3] or photos[:2]),
        ("나의 기억", snapshot.get("remembered"), photos[1:5] or photos[:3]),
        ("기억나지 않는 것", snapshot.get("unremembered"), photos[2:4]),
        ("지금 다시 바라보니", snapshot.get("reflection"), [cover] if cover else []),
    ]

    pages = [f"""
      <section class="page cover-page">
        <div class="cover-photo">{_image(cover)}</div>
        <div class="cover-copy">
          <div class="eyebrow">Reminiscence Note</div>
          <h1>{_text(snapshot.get('title'), '제목 없는 추억')}</h1>
          <div class="meta">
            <span>{_text(snapshot.get('yearEstimate'), '시기 미정')}</span>
            <span>{_text(snapshot.get('location'), '장소 미정')}</span>
          </div>
        </div>
        <div class="footer"><span>나의 작은 추억책</span><span>01</span></div>
      </section>
    """]

    for index, (title, body, section_photos) in enumerate(sections, start=2):
        pages.append(f"""
          <section class="page section-page">
            <div class="section-copy">
              <div class="section-tag">{escape(title)}</div>
              <h2>{escape(title)}</h2>
              <div class="rule"></div>
              <p>{_text(body, '아직 기록하지 않은 부분입니다.')}</p>
            </div>
            <div class="section-gallery">{_gallery(section_photos, 4)}</div>
            <div class="footer"><span>{_text(snapshot.get('title'))}</span><span>{index:02d}</span></div>
          </section>
        """)

    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><style>
{_base_css(template)}
@page {{ size: A4; margin: 0; }}
.page {{ width: 210mm; min-height: 297mm; page-break-after: always; padding: 22mm 18mm 20mm; }}
.page:last-child {{ page-break-after: auto; }}
.cover-page {{ display: flex; flex-direction: column; padding: 0; }}
.cover-photo {{ height: 176mm; background: #e8eef3; }}
.cover-copy {{ flex: 1; padding: 17mm 18mm 20mm; }}
.cover-copy h1 {{ max-width: 155mm; }}
.section-page {{ display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, .92fr); gap: 14mm; align-items: center; }}
.section-copy {{ align-self: center; }}
.section-copy p {{ white-space: normal; }}
.section-gallery .gallery {{ grid-template-columns: 1fr; }}
.section-gallery .gallery-photo {{ height: 56mm; }}
.section-gallery .gallery-photo:nth-child(n+4) {{ display: none; }}
</style></head><body>{''.join(pages)}</body></html>"""


def render_cards_html(
    snapshot: Dict[str, Any],
    photos: List[Dict[str, Any]],
    template: str = "minimal",
    preset: str = "portrait",
) -> str:
    template = template if template in TEMPLATE_LABELS else "minimal"
    width, height = CARD_PRESETS.get(preset, CARD_PRESETS["portrait"])
    cover = photos[0] if photos else None
    scene_photo = photos[1] if len(photos) > 1 else cover
    memory_photos = photos[2:5] or photos[:3]

    cards = [
        f"""<section class="export-card cover-card">
          <div class="card-photo-full">{_image(cover)}</div>
          <div class="card-gradient"></div>
          <div class="card-cover-copy"><div class="eyebrow light">Reminiscence Note</div>
          <h1>{_text(snapshot.get('title'), '제목 없는 추억')}</h1>
          <div class="cover-meta">{_text(snapshot.get('yearEstimate'), '시기 미정')} · {_text(snapshot.get('location'), '장소 미정')}</div></div>
        </section>""",
        f"""<section class="export-card split-card"><div class="card-copy"><div class="section-tag">그날의 장면</div>
          <h2>그날의 장면</h2><p>{_text(_shorten(snapshot.get('sceneDescription'), 620), '아직 기록하지 않은 부분입니다.')}</p></div>
          <div class="card-side-photo">{_image(scene_photo)}</div></section>""",
        f"""<section class="export-card memory-card"><div class="card-copy wide"><div class="section-tag">나의 기억</div>
          <h2>마음에 남은 기억</h2><p>{_text(_shorten(snapshot.get('remembered'), 700), '아직 기록하지 않은 부분입니다.')}</p></div>
          <div class="card-collage">{_gallery(memory_photos, 3)}</div></section>""",
        f"""<section class="export-card quiet-card"><div class="card-copy centered"><div class="section-tag">기억의 빈자리</div>
          <h2>기억나지 않는 것</h2><p>{_text(_shorten(snapshot.get('unremembered'), 620), '기억나지 않는 부분도 이 기록의 한 조각입니다.')}</p></div></section>""",
        f"""<section class="export-card reflection-card"><div class="reflection-photo">{_image(cover)}</div>
          <div class="reflection-copy"><div class="section-tag">지금 다시 바라보니</div><p>{_text(_shorten(snapshot.get('reflection'), 620), '사진을 다시 바라보며 떠오른 마음을 기록해 보세요.')}</p>
          <div class="signature">{_text(snapshot.get('title'))}</div></div></section>""",
    ]

    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
{_base_css(template)}
html, body {{ background: #dce6ed; }}
body {{ display: flex; flex-direction: column; align-items: center; gap: 48px; padding: 48px; }}
.export-card {{ width: {width}px; height: {height}px; flex: 0 0 auto; }}
.card-photo-full {{ position: absolute; inset: 0; }}
.card-gradient {{ position: absolute; inset: 0; background: linear-gradient(180deg, rgba(4,15,30,.08) 20%, rgba(4,15,30,.82) 100%); }}
.card-cover-copy {{ position: absolute; left: 8%; right: 8%; bottom: 8%; color: white; }}
.card-cover-copy h1 {{ color: white; font-size: 68px; max-width: 85%; }}
.light {{ color: #e8f5fc; }}
.cover-meta {{ font-size: 24px; color: #e2e8f0; }}
.split-card {{ display: grid; grid-template-columns: 54% 46%; }}
.card-copy {{ padding: 9%; display: flex; flex-direction: column; justify-content: center; }}
.card-copy.wide {{ padding: 7% 8% 3%; }}
.card-copy h2 {{ font-size: 52px; }}
.card-copy p, .reflection-copy p {{ font-size: 28px; line-height: 1.72; }}
.card-side-photo {{ height: 100%; }}
.memory-card {{ display: grid; grid-template-rows: 52% 48%; }}
.card-collage {{ padding: 0 8% 7%; overflow: hidden; }}
.card-collage .gallery {{ grid-template-columns: 1.4fr 1fr 1fr; height: 100%; }}
.card-collage .gallery-photo {{ height: 100%; border-radius: 18px; }}
.quiet-card {{ display: flex; align-items: center; justify-content: center; padding: 10%; background: linear-gradient(145deg, var(--paper), #edf7fb); }}
.centered {{ max-width: 82%; text-align: center; padding: 0; }}
.centered .section-tag {{ align-self: center; }}
.reflection-card {{ display: grid; grid-template-columns: 43% 57%; padding: 7%; gap: 6%; align-items: center; }}
.reflection-photo {{ height: 78%; border-radius: 999px 999px 22px 22px; overflow: hidden; }}
.reflection-copy p {{ font-size: 30px; }}
.signature {{ margin-top: 42px; color: var(--accent); font-weight: 800; font-size: 20px; }}
</style></head><body>{''.join(cards)}</body></html>"""
