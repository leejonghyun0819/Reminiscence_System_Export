"""Export-domain services for completed Reminiscence Note books.

The module deliberately reads existing generated-note JSON and album metadata
without mutating either source. Export-only overrides live for one request.
"""

from __future__ import annotations

import base64
import hashlib
import importlib.util
import json
import mimetypes
import os
import re
import secrets
import shutil
import subprocess
import time
import uuid
import zipfile
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence
from urllib.parse import unquote, urlparse

from PIL import Image, ImageDraw, ImageFont

from config import (
    ALBUMS_DIR,
    BASE_DIR,
    ENHANCED_DIR,
    EXPORTS_DIR,
    EXPORT_FFMPEG_BINARY,
    EXPORT_NODE_BINARY,
    EXPORT_TTL_SECONDS,
)
from database import get_db_cursor
from services.export_templates import (
    CARD_PRESETS,
    TEMPLATE_LABELS,
    render_cards_html,
    render_pdf_html,
)
from utils.file_utils import find_album_folder_path, read_album_meta


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".bmp"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"}
GENERATED_MARKERS = ("_enhanced_", "_colorized_")
TEXT_FIELDS = ("title", "sceneDescription", "remembered", "unremembered", "reflection")


class ExportNotFoundError(Exception):
    pass


class ExportValidationError(Exception):
    pass


class ExportDependencyError(Exception):
    pass


@dataclass(frozen=True)
class MediaAsset:
    id: str
    path: str
    url: str
    file_name: str
    kind: str
    source_memory_id: str

    def public_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "url": self.url,
            "fileName": self.file_name,
            "kind": self.kind,
            "sourceMemoryId": self.source_memory_id,
        }


@dataclass
class ExportBundle:
    snapshot: Dict[str, Any]
    available_assets: List[MediaAsset]
    selected_assets: List[MediaAsset]


def safe_file_stem(value: str, fallback: str = "memory_note") -> str:
    value = re.sub(r"[\\/:*?\"<>|\x00-\x1f]", "_", str(value or "").strip())
    value = re.sub(r"\s+", "_", value).strip("._")
    return (value[:90] or fallback).strip(".")


def cleanup_expired_exports(max_age_seconds: int = EXPORT_TTL_SECONDS) -> None:
    """Best-effort cleanup; called at request boundaries so no scheduler is required."""
    cutoff = time.time() - max(300, max_age_seconds)
    for kind in ("pdf", "cards", "video", "zip", "temp"):
        directory = os.path.join(EXPORTS_DIR, kind)
        if not os.path.isdir(directory):
            continue
        for entry in os.scandir(directory):
            try:
                if entry.stat().st_mtime >= cutoff:
                    continue
                if entry.is_dir(follow_symlinks=False):
                    shutil.rmtree(entry.path)
                else:
                    os.remove(entry.path)
            except OSError:
                continue


def _is_inside(path: str, root: str) -> bool:
    try:
        return os.path.commonpath([os.path.realpath(path), os.path.realpath(root)]) == os.path.realpath(root)
    except ValueError:
        return False


def _normalise_url(value: Any) -> str:
    if not value:
        return ""
    try:
        parsed = urlparse(str(value))
        return unquote(parsed.path or str(value)).replace("\\", "/")
    except (TypeError, ValueError):
        return ""


def _public_url_for_path(path: str) -> str:
    real_path = os.path.realpath(path)
    if _is_inside(real_path, ENHANCED_DIR):
        return f"/enhanced/{os.path.basename(real_path)}"
    if _is_inside(real_path, ALBUMS_DIR):
        relative = os.path.relpath(real_path, ALBUMS_DIR).replace(os.sep, "/")
        return f"/albums/{relative}"
    return ""


def resolve_media_path(value: Any) -> Optional[str]:
    """Resolve a stored localhost/relative media URL without allowing traversal."""
    url_path = _normalise_url(value)
    candidates: List[str] = []
    if url_path.startswith("/albums/"):
        candidates.append(os.path.join(ALBUMS_DIR, url_path[len("/albums/") :].lstrip("/")))
    elif url_path.startswith("/enhanced/"):
        candidates.append(os.path.join(ENHANCED_DIR, os.path.basename(url_path)))

    file_name = os.path.basename(url_path)
    if file_name:
        candidates.append(os.path.join(ENHANCED_DIR, file_name))
        for root, dirs, files in os.walk(ALBUMS_DIR):
            dirs[:] = [name for name in dirs if not os.path.islink(os.path.join(root, name))]
            if file_name in files:
                candidates.append(os.path.join(root, file_name))

    for candidate in candidates:
        real_candidate = os.path.realpath(candidate)
        if _is_inside(real_candidate, ALBUMS_DIR) and os.path.isfile(real_candidate):
            return real_candidate
    return None


def _asset(path: str, kind: str, source_memory_id: str, url: str = "") -> Optional[MediaAsset]:
    real_path = os.path.realpath(path)
    suffix = Path(real_path).suffix.lower()
    if not (_is_inside(real_path, ALBUMS_DIR) and os.path.isfile(real_path) and suffix in IMAGE_SUFFIXES):
        return None
    asset_id = hashlib.sha256(real_path.encode("utf-8")).hexdigest()[:18]
    return MediaAsset(
        id=asset_id,
        path=real_path,
        url=_normalise_url(url) or _public_url_for_path(real_path),
        file_name=os.path.basename(real_path),
        kind=kind,
        source_memory_id=str(source_memory_id or ""),
    )


def _dedupe_assets(values: Iterable[Optional[MediaAsset]]) -> List[MediaAsset]:
    output: List[MediaAsset] = []
    seen = set()
    for value in values:
        if not value or value.id in seen:
            continue
        seen.add(value.id)
        output.append(value)
    return output


def _load_generated_note(note_id: str) -> Dict[str, Any]:
    with get_db_cursor() as cursor:
        cursor.execute("SELECT note_json FROM generated_notes WHERE id = ?", (note_id,))
        row = cursor.fetchone()
    if not row:
        raise ExportNotFoundError("완성된 추억 노트를 찾을 수 없습니다.")
    try:
        note = json.loads(row["note_json"])
    except (TypeError, json.JSONDecodeError) as exc:
        raise ExportValidationError("저장된 추억 노트 데이터가 올바르지 않습니다.") from exc
    if not isinstance(note, dict):
        raise ExportValidationError("저장된 추억 노트 형식이 올바르지 않습니다.")
    return note


def _source_ids(note: Dict[str, Any]) -> List[str]:
    generated = note.get("generatedNote") if isinstance(note.get("generatedNote"), dict) else {}
    raw = generated.get("sourceMemoryIds") or []
    if not isinstance(raw, list):
        raw = []
    ids = [str(value) for value in raw if value]
    if not ids and note.get("id"):
        ids.append(str(note["id"]))
    return list(dict.fromkeys(ids))


def _load_source_memories(ids: Sequence[str]) -> List[Dict[str, Any]]:
    if not ids:
        return []
    placeholders = ",".join("?" for _ in ids)
    with get_db_cursor() as cursor:
        cursor.execute(f"SELECT * FROM memories WHERE id IN ({placeholders})", tuple(ids))
        rows = {str(row["id"]): dict(row) for row in cursor.fetchall()}

    sources: List[Dict[str, Any]] = []
    for memory_id in ids:
        row = rows.get(memory_id)
        folder = find_album_folder_path(memory_id)
        meta = read_album_meta(folder) if folder else {}
        if row or meta:
            sources.append({"id": memory_id, "row": row or {}, "folder": folder, "meta": meta or {}})
    return sources


def _json_list(value: Any) -> List[Any]:
    if isinstance(value, list):
        return value
    if not value:
        return []
    try:
        loaded = json.loads(str(value))
        return loaded if isinstance(loaded, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def _source_assets(source: Dict[str, Any]) -> Dict[str, List[MediaAsset]]:
    memory_id = str(source.get("id") or "")
    row = source.get("row") or {}
    meta = source.get("meta") or {}
    folder = source.get("folder")
    raw_names = _json_list(meta.get("fileNames") or row.get("file_names_json"))
    raw_urls = _json_list(meta.get("imageUrls") or row.get("image_urls_json"))

    originals: List[MediaAsset] = []
    enhanced: List[MediaAsset] = []
    current: List[MediaAsset] = []

    if folder:
        for name in raw_names:
            file_name = os.path.basename(str(name))
            if not file_name or any(marker in file_name for marker in GENERATED_MARKERS):
                continue
            candidate = _asset(os.path.join(folder, file_name), "original", memory_id)
            if candidate:
                originals.append(candidate)

    for raw_url in raw_urls:
        path = resolve_media_path(raw_url)
        if not path:
            continue
        kind = "enhanced" if any(marker in os.path.basename(path) for marker in GENERATED_MARKERS) else "original"
        candidate = _asset(path, kind, memory_id, str(raw_url))
        if candidate:
            current.append(candidate)
            (enhanced if kind == "enhanced" else originals).append(candidate)

    identifiers = {memory_id, str(meta.get("id") or ""), os.path.basename(folder) if folder else ""}
    if folder and os.path.isdir(folder):
        for name in sorted(os.listdir(folder)):
            if any(marker in name for marker in GENERATED_MARKERS):
                enhanced.append(_asset(os.path.join(folder, name), "enhanced", memory_id))
    if os.path.isdir(ENHANCED_DIR):
        for name in sorted(os.listdir(ENHANCED_DIR)):
            if any(identifier and name.startswith(f"{identifier}_") for identifier in identifiers):
                enhanced.append(_asset(os.path.join(ENHANCED_DIR, name), "enhanced", memory_id))

    originals = _dedupe_assets(originals)
    enhanced = _dedupe_assets(enhanced)
    current = _dedupe_assets(current)

    preferred: List[MediaAsset] = []
    # Existing data has no persisted original↔enhanced relation. Preserve image slots
    # and pair legacy enhanced candidates deterministically by their order.
    for index, original in enumerate(originals):
        preferred.append(enhanced[index] if index < len(enhanced) else original)
    if not originals:
        preferred.extend(enhanced or current)

    return {
        "original": originals,
        "enhanced": enhanced,
        "current": current,
        "preferred": _dedupe_assets(preferred),
    }


def _join_curated(sources: Sequence[Dict[str, Any]], field: str) -> str:
    values = []
    for source in sources:
        curated = (source.get("meta") or {}).get("curatedNote") or {}
        value = str(curated.get(field) or "").strip() if isinstance(curated, dict) else ""
        if value and value not in values:
            values.append(value)
    return "\n\n".join(values)


def _normalised_snapshot(note: Dict[str, Any], sources: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    analysis = note.get("analysis") if isinstance(note.get("analysis"), dict) else {}
    generated = note.get("generatedNote") if isinstance(note.get("generatedNote"), dict) else {}
    first_meta = (sources[0].get("meta") or {}) if sources else {}
    first_curated = first_meta.get("curatedNote") if isinstance(first_meta.get("curatedNote"), dict) else {}

    title = analysis.get("title") or generated.get("title") or first_curated.get("title") or "제목 없는 추억"
    opening = generated.get("opening") or analysis.get("description") or _join_curated(sources, "sceneDescription")
    body = generated.get("body") or analysis.get("storyCaption") or _join_curated(sources, "remembered")
    closing = generated.get("closing") or _join_curated(sources, "reflection")

    created_at = note.get("createdAt")
    if isinstance(created_at, (int, float)):
        created_at_iso = datetime.fromtimestamp(created_at / 1000, timezone.utc).isoformat()
    else:
        created_at_iso = str(created_at or "")

    return {
        "id": str(note.get("id") or ""),
        "title": str(title),
        "location": str(analysis.get("location") or generated.get("placeSummary") or ""),
        "yearEstimate": str(analysis.get("yearEstimate") or generated.get("periodSummary") or ""),
        "sceneDescription": str(_join_curated(sources, "sceneDescription") or opening or ""),
        "remembered": str(_join_curated(sources, "remembered") or body or ""),
        "unremembered": str(_join_curated(sources, "unremembered") or ""),
        "reflection": str(_join_curated(sources, "reflection") or closing or ""),
        "category": note.get("rootCategory") or note.get("mode") or note.get("categoryFolder") or "미분류",
        "createdAt": created_at_iso,
        "sourceMemoryIds": _source_ids(note),
        "generatedNote": generated,
        "albumMeta": [source.get("meta") or {} for source in sources],
    }


def _apply_overrides(snapshot: Dict[str, Any], overrides: Optional[Dict[str, Any]]) -> None:
    for field in TEXT_FIELDS:
        if overrides and field in overrides and overrides[field] is not None:
            snapshot[field] = str(overrides[field]).strip()


def build_export_bundle(
    note_id: str,
    photo_source: str = "preferred",
    selected_photo_ids: Optional[Sequence[str]] = None,
    cover_photo_id: Optional[str] = None,
    overrides: Optional[Dict[str, Any]] = None,
) -> ExportBundle:
    note = _load_generated_note(note_id)
    sources = _load_source_memories(_source_ids(note))
    snapshot = _normalised_snapshot(note, sources)
    _apply_overrides(snapshot, overrides)

    source_groups = [_source_assets(source) for source in sources]
    originals = _dedupe_assets(asset for group in source_groups for asset in group["original"])
    enhanced = _dedupe_assets(asset for group in source_groups for asset in group["enhanced"])
    preferred = _dedupe_assets(asset for group in source_groups for asset in group["preferred"])

    note_current = []
    for raw_url in _json_list(note.get("imageUrls")):
        path = resolve_media_path(raw_url)
        if not path:
            continue
        kind = "enhanced" if any(marker in os.path.basename(path) for marker in GENERATED_MARKERS) else "original"
        note_current.append(_asset(path, kind, "", str(raw_url)))
    current = _dedupe_assets(note_current)

    if not originals:
        originals = [asset for asset in current if asset.kind == "original"] or current
    if not enhanced:
        enhanced = [asset for asset in current if asset.kind == "enhanced"]
    if not preferred:
        preferred = current or originals or enhanced

    available = _dedupe_assets([*current, *preferred, *originals, *enhanced])
    source_key = photo_source if photo_source in {"original", "enhanced", "preferred", "current"} else "preferred"
    default_map = {
        "original": originals or current,
        "enhanced": enhanced or current,
        "preferred": preferred or current,
        "current": current or preferred,
    }
    selected = list(default_map[source_key])

    if selected_photo_ids is not None:
        wanted = [str(value) for value in selected_photo_ids]
        by_id = {asset.id: asset for asset in available}
        selected = [by_id[asset_id] for asset_id in wanted if asset_id in by_id]
        if not selected:
            raise ExportValidationError("내보낼 사진을 한 장 이상 선택해주세요.")

    if cover_photo_id:
        cover = next((asset for asset in selected if asset.id == cover_photo_id), None)
        if cover:
            selected = [cover, *[asset for asset in selected if asset.id != cover.id]]

    snapshot["imageUrls"] = [asset.url for asset in selected]
    snapshot["photoSource"] = source_key
    return ExportBundle(snapshot=snapshot, available_assets=available, selected_assets=selected)


def export_preview(note_id: str, photo_source: str = "preferred") -> Dict[str, Any]:
    bundle = build_export_bundle(note_id, photo_source=photo_source)
    return {
        **bundle.snapshot,
        "photos": [asset.public_dict() for asset in bundle.selected_assets],
        "availablePhotos": [asset.public_dict() for asset in bundle.available_assets],
        "templates": [{"id": key, "label": label} for key, label in TEMPLATE_LABELS.items()],
        "cardPresets": [
            {"id": key, "width": value[0], "height": value[1]}
            for key, value in CARD_PRESETS.items()
        ],
    }


def _data_uri(path: str) -> str:
    mime_type = mimetypes.guess_type(path)[0] or "image/jpeg"
    with open(path, "rb") as handle:
        encoded = base64.b64encode(handle.read()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _renderable_photos(assets: Sequence[MediaAsset]) -> List[Dict[str, Any]]:
    return [{**asset.public_dict(), "dataUri": _data_uri(asset.path)} for asset in assets]


def _run_renderer(mode: str, html: str, output_path: str, *extra: str) -> None:
    renderer_dir = os.path.join(BASE_DIR, "export_renderer")
    script = os.path.join(renderer_dir, "render.js")
    if not shutil.which(EXPORT_NODE_BINARY):
        raise ExportDependencyError("Node.js가 필요합니다. EXPORT_NODE_BINARY 설정을 확인해주세요.")
    if not os.path.isfile(script):
        raise ExportDependencyError("Puppeteer 렌더러 파일을 찾을 수 없습니다.")

    temp_html = os.path.join(EXPORTS_DIR, "temp", f"{uuid.uuid4().hex}.html")
    with open(temp_html, "w", encoding="utf-8") as handle:
        handle.write(html)
    try:
        result = subprocess.run(
            [EXPORT_NODE_BINARY, script, mode, temp_html, output_path, *extra],
            cwd=renderer_dir,
            capture_output=True,
            text=True,
            timeout=180,
            check=False,
        )
        if result.returncode != 0:
            details = (result.stderr or result.stdout or "").strip()[-1600:]
            hint = "backend/export_renderer에서 npm install을 실행해주세요."
            raise ExportDependencyError(f"Puppeteer 렌더링 실패: {details or hint}")
    finally:
        try:
            os.remove(temp_html)
        except OSError:
            pass


def generate_pdf(
    note_id: str,
    template: str = "minimal",
    photo_source: str = "preferred",
    selected_photo_ids: Optional[Sequence[str]] = None,
    cover_photo_id: Optional[str] = None,
    overrides: Optional[Dict[str, Any]] = None,
) -> tuple[str, str]:
    cleanup_expired_exports()
    bundle = build_export_bundle(note_id, photo_source, selected_photo_ids, cover_photo_id, overrides)
    html = render_pdf_html(bundle.snapshot, _renderable_photos(bundle.selected_assets), template)
    stem = safe_file_stem(bundle.snapshot["title"])
    output = os.path.join(EXPORTS_DIR, "pdf", f"{stem}_{uuid.uuid4().hex[:8]}.pdf")
    try:
        _run_renderer("pdf", html, output)
    except ExportDependencyError as puppeteer_error:
        try:
            from services.export_fallback import render_pdf_fallback

            render_pdf_fallback(bundle.snapshot, bundle.selected_assets, output)
        except Exception as fallback_error:
            raise ExportDependencyError(
                f"Puppeteer와 PDF 대체 렌더러가 모두 실패했습니다. "
                f"Puppeteer: {puppeteer_error}; fallback: {fallback_error}"
            ) from fallback_error
    if not os.path.isfile(output) or os.path.getsize(output) < 500:
        raise ExportDependencyError("PDF 파일이 정상적으로 생성되지 않았습니다.")
    return output, f"{stem}.pdf"


def generate_cards(
    note_id: str,
    template: str = "minimal",
    photo_source: str = "preferred",
    selected_photo_ids: Optional[Sequence[str]] = None,
    cover_photo_id: Optional[str] = None,
    overrides: Optional[Dict[str, Any]] = None,
    preset: str = "portrait",
    image_format: str = "png",
) -> tuple[str, str]:
    cleanup_expired_exports()
    if preset not in CARD_PRESETS:
        raise ExportValidationError("지원하지 않는 이미지 카드 크기입니다.")
    if image_format not in {"png", "jpeg"}:
        raise ExportValidationError("이미지 카드 형식은 png 또는 jpeg만 지원합니다.")
    bundle = build_export_bundle(note_id, photo_source, selected_photo_ids, cover_photo_id, overrides)
    html = render_cards_html(bundle.snapshot, _renderable_photos(bundle.selected_assets), template, preset)
    stem = safe_file_stem(bundle.snapshot["title"])
    card_dir = os.path.join(EXPORTS_DIR, "cards", f"{stem}_{uuid.uuid4().hex[:8]}")
    os.makedirs(card_dir, exist_ok=True)
    width, height = CARD_PRESETS[preset]
    try:
        _run_renderer("cards", html, card_dir, str(width), str(height), image_format)
    except ExportDependencyError as puppeteer_error:
        try:
            from services.export_fallback import render_cards_fallback

            render_cards_fallback(
                bundle.snapshot,
                bundle.selected_assets,
                card_dir,
                width,
                height,
                image_format,
            )
        except Exception as fallback_error:
            raise ExportDependencyError(
                f"Puppeteer와 이미지 카드 대체 렌더러가 모두 실패했습니다. "
                f"Puppeteer: {puppeteer_error}; fallback: {fallback_error}"
            ) from fallback_error

    card_paths = sorted(Path(card_dir).glob(f"card-*.{'jpg' if image_format == 'jpeg' else 'png'}"))
    if not card_paths:
        raise ExportDependencyError("이미지 카드가 생성되지 않았습니다.")
    archive = os.path.join(EXPORTS_DIR, "cards", f"{stem}_cards_{uuid.uuid4().hex[:8]}.zip")
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in card_paths:
            zf.write(path, arcname=path.name)
    shutil.rmtree(card_dir, ignore_errors=True)
    return archive, f"{stem}_image_cards.zip"


def _font_path() -> Optional[str]:
    candidates = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "C:/Windows/Fonts/malgun.ttf",
    ]
    return next((path for path in candidates if os.path.isfile(path)), None)


def _render_video_slide(path: str, heading: str, body: str = "") -> None:
    image = Image.new("RGB", (1920, 1080), "#f6f9fb")
    draw = ImageDraw.Draw(image)
    font_path = _font_path()
    title_font = ImageFont.truetype(font_path, 76) if font_path else ImageFont.load_default()
    body_font = ImageFont.truetype(font_path, 38) if font_path else ImageFont.load_default()
    draw.rounded_rectangle((170, 150, 1750, 930), radius=44, fill="#ffffff", outline="#d9e7ef", width=3)

    def wrapped(text: str, max_chars: int) -> str:
        words = list(str(text or ""))
        return "\n".join("".join(words[i : i + max_chars]) for i in range(0, len(words), max_chars))

    draw.multiline_text((260, 300), wrapped(heading, 19), fill="#14213d", font=title_font, spacing=18)
    if body:
        draw.multiline_text((260, 590), wrapped(body[:180], 34), fill="#52657a", font=body_font, spacing=14)
    image.save(path, "PNG")


def generate_video(
    note_id: str,
    photo_source: str = "preferred",
    selected_photo_ids: Optional[Sequence[str]] = None,
    cover_photo_id: Optional[str] = None,
    overrides: Optional[Dict[str, Any]] = None,
    include_audio: bool = False,
) -> tuple[str, str]:
    cleanup_expired_exports()
    if not shutil.which(EXPORT_FFMPEG_BINARY):
        raise ExportDependencyError("FFmpeg가 설치되어 있지 않아 슬라이드쇼를 만들 수 없습니다.")
    bundle = build_export_bundle(note_id, photo_source, selected_photo_ids, cover_photo_id, overrides)
    if not bundle.selected_assets:
        raise ExportValidationError("영상에 사용할 사진이 없습니다.")

    stem = safe_file_stem(bundle.snapshot["title"])
    work_dir = os.path.join(EXPORTS_DIR, "temp", f"video_{uuid.uuid4().hex}")
    os.makedirs(work_dir, exist_ok=True)
    title_slide = os.path.join(work_dir, "title.png")
    reflection_slide = os.path.join(work_dir, "reflection.png")
    _render_video_slide(
        title_slide,
        bundle.snapshot["title"],
        f"{bundle.snapshot.get('yearEstimate') or '시기 미정'} · {bundle.snapshot.get('location') or '장소 미정'}",
    )
    _render_video_slide(reflection_slide, "지금 다시 바라보니", bundle.snapshot.get("reflection") or "")
    inputs = [title_slide, *[asset.path for asset in bundle.selected_assets[:8]], reflection_slide]
    total_duration = min(60.0, max(30.0, len(inputs) * 5.0))
    segment_duration = total_duration / len(inputs)

    command = [EXPORT_FFMPEG_BINARY, "-y"]
    for input_path in inputs:
        command.extend(["-loop", "1", "-t", f"{segment_duration:.3f}", "-i", input_path])

    audio_path = None
    if include_audio:
        for meta in bundle.snapshot.get("albumMeta") or []:
            if isinstance(meta, dict) and meta.get("audioUrl"):
                audio_path = resolve_media_path(meta.get("audioUrl"))
                if audio_path:
                    break
        if audio_path:
            command.extend(["-stream_loop", "-1", "-i", audio_path])

    filters = []
    labels = []
    for index in range(len(inputs)):
        label = f"v{index}"
        labels.append(f"[{label}]")
        fade_out = max(0.1, segment_duration - 0.8)
        filters.append(
            f"[{index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,"
            f"pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf6f9fb,setsar=1,format=yuv420p,"
            f"fade=t=in:st=0:d=0.8,fade=t=out:st={fade_out:.3f}:d=0.8[{label}]"
        )
    filters.append(f"{''.join(labels)}concat=n={len(labels)}:v=1:a=0[outv]")

    output = os.path.join(EXPORTS_DIR, "video", f"{stem}_{uuid.uuid4().hex[:8]}.mp4")
    output_args = [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[outv]",
    ]
    if audio_path:
        output_args.extend(["-map", f"{len(inputs)}:a:0?", "-c:a", "aac", "-b:a", "160k", "-shortest"])
    output_args.extend(
        [
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-t",
            f"{total_duration:.3f}",
            output,
        ]
    )
    command.extend(output_args)
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=300, check=False)
        if result.returncode != 0:
            raise ExportDependencyError(f"FFmpeg 영상 생성 실패: {(result.stderr or '')[-1200:]}")
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
    return output, f"{stem}_slideshow.mp4"


def _note_text(snapshot: Dict[str, Any]) -> str:
    sections = [
        ("제목", snapshot.get("title")),
        ("시기", snapshot.get("yearEstimate")),
        ("장소", snapshot.get("location")),
        ("그날의 장면", snapshot.get("sceneDescription")),
        ("나의 기억", snapshot.get("remembered")),
        ("기억나지 않는 것", snapshot.get("unremembered")),
        ("지금 다시 바라보니", snapshot.get("reflection")),
    ]
    return "\n\n".join(f"[{title}]\n{value or ''}" for title, value in sections)


def generate_zip(
    note_id: str,
    template: str = "minimal",
    photo_source: str = "preferred",
    selected_photo_ids: Optional[Sequence[str]] = None,
    cover_photo_id: Optional[str] = None,
    overrides: Optional[Dict[str, Any]] = None,
) -> tuple[str, str]:
    cleanup_expired_exports()
    bundle = build_export_bundle(note_id, photo_source, selected_photo_ids, cover_photo_id, overrides)
    stem = safe_file_stem(bundle.snapshot["title"])
    output = os.path.join(EXPORTS_DIR, "zip", f"{stem}_backup_{uuid.uuid4().hex[:8]}.zip")

    original_assets = [asset for asset in bundle.available_assets if asset.kind == "original"]
    enhanced_assets = [asset for asset in bundle.available_assets if asset.kind == "enhanced"]
    note_json = {
        key: bundle.snapshot.get(key)
        for key in (
            "title",
            "location",
            "yearEstimate",
            "sceneDescription",
            "remembered",
            "unremembered",
            "reflection",
            "imageUrls",
            "category",
            "createdAt",
            "sourceMemoryIds",
        )
    }

    pdf_path = None
    pdf_error = ""
    try:
        pdf_path, _ = generate_pdf(
            note_id,
            template,
            photo_source,
            selected_photo_ids,
            cover_photo_id,
            overrides,
        )
    except ExportDependencyError as exc:
        pdf_error = str(exc)

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
        for index, asset in enumerate(original_assets, start=1):
            suffix = Path(asset.path).suffix.lower() or ".jpg"
            zf.write(asset.path, arcname=f"{stem}/original/image_{index}{suffix}")
        for index, asset in enumerate(enhanced_assets, start=1):
            suffix = Path(asset.path).suffix.lower() or ".jpg"
            zf.write(asset.path, arcname=f"{stem}/enhanced/enhanced_{index}{suffix}")
        video_index = 1
        audio_index = 1
        copied_extra_paths = set()
        for meta in bundle.snapshot.get("albumMeta") or []:
            if not isinstance(meta, dict):
                continue
            for value in _json_list(meta.get("imageUrls")):
                path = resolve_media_path(value)
                if not path or path in copied_extra_paths or Path(path).suffix.lower() not in VIDEO_SUFFIXES:
                    continue
                copied_extra_paths.add(path)
                suffix = Path(path).suffix.lower() or ".mp4"
                zf.write(path, arcname=f"{stem}/original/video_{video_index}{suffix}")
                video_index += 1
            if meta.get("audioUrl"):
                path = resolve_media_path(meta.get("audioUrl"))
                if path and path not in copied_extra_paths:
                    copied_extra_paths.add(path)
                    suffix = Path(path).suffix.lower() or ".mp3"
                    zf.write(path, arcname=f"{stem}/audio/audio_{audio_index}{suffix}")
                    audio_index += 1
        if pdf_path and os.path.isfile(pdf_path):
            zf.write(pdf_path, arcname=f"{stem}/note/memory.pdf")
        elif pdf_error:
            zf.writestr(f"{stem}/note/PDF_GENERATION_NOTICE.txt", pdf_error)
        zf.writestr(
            f"{stem}/note/note.json",
            json.dumps(note_json, ensure_ascii=False, indent=2),
        )
        zf.writestr(f"{stem}/note/note.txt", _note_text(bundle.snapshot))
        zf.writestr(
            f"{stem}/metadata/album_meta.json",
            json.dumps(
                {
                    "generatedNoteId": note_id,
                    "sourceAlbums": bundle.snapshot.get("albumMeta") or [],
                },
                ensure_ascii=False,
                indent=2,
            ),
        )
    return output, f"{stem}_backup.zip"


def create_share(note_id: str, expires_in_days: Optional[int] = None) -> Dict[str, Any]:
    bundle = build_export_bundle(note_id, photo_source="preferred")
    snapshot = {
        key: value
        for key, value in bundle.snapshot.items()
        if key not in {"albumMeta", "generatedNote"}
    }
    snapshot["photos"] = [asset.public_dict() for asset in bundle.selected_assets]
    share_id = secrets.token_urlsafe(12)
    expires_at = None
    if expires_in_days is not None:
        if expires_in_days < 1 or expires_in_days > 365:
            raise ExportValidationError("공유 링크 만료 기간은 1~365일이어야 합니다.")
        expires_at = (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat()

    with get_db_cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO memory_shares (share_id, memory_id, snapshot_json, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (share_id, note_id, json.dumps(snapshot, ensure_ascii=False), expires_at),
        )
    return {"shareId": share_id, "memoryId": note_id, "expiresAt": expires_at, "enabled": True}


def get_share(share_id: str) -> Dict[str, Any]:
    with get_db_cursor() as cursor:
        cursor.execute("SELECT * FROM memory_shares WHERE share_id = ?", (share_id,))
        row = cursor.fetchone()
    if not row or not row["enabled"]:
        raise ExportNotFoundError("공유 링크를 찾을 수 없거나 비활성화되었습니다.")
    if row["expires_at"]:
        try:
            expires = datetime.fromisoformat(str(row["expires_at"]).replace("Z", "+00:00"))
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires <= datetime.now(timezone.utc):
                raise ExportNotFoundError("공유 링크가 만료되었습니다.")
        except ValueError:
            pass
    try:
        snapshot = json.loads(row["snapshot_json"])
    except (TypeError, json.JSONDecodeError) as exc:
        raise ExportValidationError("공유 데이터가 올바르지 않습니다.") from exc
    return {
        "shareId": share_id,
        "createdAt": row["created_at"],
        "expiresAt": row["expires_at"],
        "memory": snapshot,
    }


def disable_share(share_id: str) -> None:
    with get_db_cursor() as cursor:
        cursor.execute(
            "UPDATE memory_shares SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE share_id = ?",
            (share_id,),
        )
        if cursor.rowcount == 0:
            raise ExportNotFoundError("공유 링크를 찾을 수 없습니다.")


def export_capabilities() -> Dict[str, Any]:
    renderer_dir = os.path.join(BASE_DIR, "export_renderer")
    portable_renderer = bool(
        importlib.util.find_spec("reportlab") and importlib.util.find_spec("pymupdf")
    )
    puppeteer_renderer = bool(
        shutil.which(EXPORT_NODE_BINARY) and os.path.isfile(os.path.join(renderer_dir, "render.js"))
    )
    return {
        "pdf": puppeteer_renderer or portable_renderer,
        "cards": puppeteer_renderer or portable_renderer,
        "video": bool(shutil.which(EXPORT_FFMPEG_BINARY)),
        "zip": True,
        "share": True,
        "ttlSeconds": EXPORT_TTL_SECONDS,
    }
