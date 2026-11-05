from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from services.export_service import (
    ExportDependencyError,
    ExportNotFoundError,
    ExportValidationError,
    create_share,
    disable_share,
    export_capabilities,
    export_preview,
    generate_cards,
    generate_pdf,
    generate_video,
    generate_zip,
    get_share,
)


router = APIRouter(tags=["Export"])


class ExportTextOverrides(BaseModel):
    title: Optional[str] = None
    sceneDescription: Optional[str] = None
    remembered: Optional[str] = None
    unremembered: Optional[str] = None
    reflection: Optional[str] = None


class ExportRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    template: Literal["minimal", "photo_essay"] = "minimal"
    photo_source: Literal["preferred", "original", "enhanced", "current"] = Field(
        default="preferred",
        alias="photoSource",
    )
    selected_photo_ids: Optional[List[str]] = Field(default=None, alias="selectedPhotoIds")
    cover_photo_id: Optional[str] = Field(default=None, alias="coverPhotoId")
    overrides: Optional[ExportTextOverrides] = None
    preset: Literal["portrait", "square", "landscape"] = "portrait"
    image_format: Literal["png", "jpeg"] = Field(default="png", alias="imageFormat")
    include_audio: bool = Field(default=False, alias="includeAudio")


class ShareRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    expires_in_days: Optional[int] = Field(default=None, alias="expiresInDays")


def _overrides(payload: ExportRequest) -> Optional[Dict[str, Any]]:
    return payload.overrides.model_dump() if payload.overrides else None


def _raise_http(exc: Exception) -> None:
    if isinstance(exc, ExportNotFoundError):
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if isinstance(exc, ExportValidationError):
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if isinstance(exc, ExportDependencyError):
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    raise HTTPException(status_code=500, detail=f"내보내기 처리 중 오류가 발생했습니다: {exc}") from exc


@router.get("/api/export/capabilities")
def get_export_capabilities():
    return export_capabilities()


@router.get("/api/export/preview/{memory_id}")
def get_export_preview(
    memory_id: str,
    photo_source: Literal["preferred", "original", "enhanced", "current"] = Query(
        default="preferred",
        alias="photoSource",
    ),
):
    try:
        return export_preview(memory_id, photo_source)
    except Exception as exc:
        _raise_http(exc)


@router.post("/api/export/pdf/{memory_id}")
def export_pdf(memory_id: str, payload: ExportRequest):
    try:
        path, filename = generate_pdf(
            memory_id,
            payload.template,
            payload.photo_source,
            payload.selected_photo_ids,
            payload.cover_photo_id,
            _overrides(payload),
        )
        return FileResponse(path, media_type="application/pdf", filename=filename)
    except Exception as exc:
        _raise_http(exc)


@router.post("/api/export/cards/{memory_id}")
def export_cards(memory_id: str, payload: ExportRequest):
    try:
        path, filename = generate_cards(
            memory_id,
            payload.template,
            payload.photo_source,
            payload.selected_photo_ids,
            payload.cover_photo_id,
            _overrides(payload),
            payload.preset,
            payload.image_format,
        )
        return FileResponse(path, media_type="application/zip", filename=filename)
    except Exception as exc:
        _raise_http(exc)


@router.post("/api/export/video/{memory_id}")
def export_video(memory_id: str, payload: ExportRequest):
    try:
        path, filename = generate_video(
            memory_id,
            payload.photo_source,
            payload.selected_photo_ids,
            payload.cover_photo_id,
            _overrides(payload),
            payload.include_audio,
        )
        return FileResponse(path, media_type="video/mp4", filename=filename)
    except Exception as exc:
        _raise_http(exc)


@router.post("/api/export/zip/{memory_id}")
def export_zip(memory_id: str, payload: ExportRequest):
    try:
        path, filename = generate_zip(
            memory_id,
            payload.template,
            payload.photo_source,
            payload.selected_photo_ids,
            payload.cover_photo_id,
            _overrides(payload),
        )
        return FileResponse(path, media_type="application/zip", filename=filename)
    except Exception as exc:
        _raise_http(exc)


@router.post("/api/share/{memory_id}")
def create_memory_share(memory_id: str, payload: ShareRequest):
    try:
        return create_share(memory_id, payload.expires_in_days)
    except Exception as exc:
        _raise_http(exc)


@router.get("/api/share/{share_id}")
def get_memory_share(share_id: str):
    try:
        return get_share(share_id)
    except Exception as exc:
        _raise_http(exc)


@router.delete("/api/share/{share_id}")
def disable_memory_share(share_id: str):
    try:
        disable_share(share_id)
        return {"success": True, "shareId": share_id, "enabled": False}
    except Exception as exc:
        _raise_http(exc)
