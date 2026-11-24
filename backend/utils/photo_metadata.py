"""Photo capture metadata extraction for interview clues.

Only the capture time and GPS coordinates required by the memory interview are
kept. Device make/model and other EXIF fields are deliberately ignored.
"""

from __future__ import annotations

import base64
import io
import math
import re
from datetime import datetime
from typing import Any

from PIL import ExifTags, Image


_DATE_KEYS = (
    "DateTimeOriginal",
    "DateTimeDigitized",
    "DateTime",
    "datetimeoriginal",
    "datetimedigitized",
    "datetime",
)
_OFFSET_KEYS = (
    "OffsetTimeOriginal",
    "OffsetTimeDigitized",
    "OffsetTime",
    "offsettimeoriginal",
    "offsettimedigitized",
    "offsettime",
)
_LATITUDE_KEYS = (
    "GPSLatitude",
    "Latitude",
    "latitude",
    "gpslatitude",
)
_LATITUDE_REF_KEYS = (
    "GPSLatitudeRef",
    "LatitudeRef",
    "latitudeRef",
    "gpslatituderef",
)
_LONGITUDE_KEYS = (
    "GPSLongitude",
    "Longitude",
    "longitude",
    "gpslongitude",
)
_LONGITUDE_REF_KEYS = (
    "GPSLongitudeRef",
    "LongitudeRef",
    "longitudeRef",
    "gpslongituderef",
)


def _decode_value(value: Any) -> Any:
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="ignore").strip("\x00")
    return value


def _flatten_exif(exif: Any) -> dict[str, Any]:
    if not isinstance(exif, dict):
        return {}

    flattened: dict[str, Any] = {}

    for key, value in exif.items():
        normalized_key = str(key)
        flattened[normalized_key] = _decode_value(value)

        if normalized_key.lower() in {
            "gps",
            "gpsinfo",
            "gps_info",
            "exif",
        } and isinstance(value, dict):
            for nested_key, nested_value in value.items():
                flattened[str(nested_key)] = _decode_value(nested_value)

    return flattened


def _first_value(values: dict[str, Any], keys: tuple[str, ...]) -> Any:
    lowered = {
        str(key).lower(): value
        for key, value in values.items()
    }

    for key in keys:
        if key in values:
            return values[key]

        lowered_value = lowered.get(key.lower())
        if lowered_value not in (None, ""):
            return lowered_value

    return None


def _as_float(value: Any) -> float | None:
    try:
        if hasattr(value, "numerator") and hasattr(value, "denominator"):
            denominator = float(value.denominator)
            if denominator == 0:
                return None
            return float(value.numerator) / denominator

        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def _coordinate_to_decimal(value: Any, reference: Any) -> float | None:
    if value is None:
        return None

    if isinstance(value, str):
        stripped = value.strip()
        try:
            value = float(stripped)
        except ValueError:
            numbers = re.findall(r"-?\d+(?:\.\d+)?", stripped)
            value = [float(number) for number in numbers[:3]]

    if isinstance(value, (list, tuple)):
        if len(value) < 3:
            return None

        degrees = _as_float(value[0])
        minutes = _as_float(value[1])
        seconds = _as_float(value[2])

        if None in (degrees, minutes, seconds):
            return None

        decimal = abs(degrees) + minutes / 60 + seconds / 3600
        if degrees < 0:
            decimal *= -1
    else:
        decimal = _as_float(value)
        if decimal is None:
            return None

    ref = str(_decode_value(reference) or "").upper()
    if ref in {"S", "W"}:
        decimal = -abs(decimal)
    elif ref in {"N", "E"}:
        decimal = abs(decimal)

    return decimal


def _normalize_capture_time(raw_value: Any, raw_offset: Any) -> str | None:
    if raw_value in (None, ""):
        return None

    text = str(_decode_value(raw_value)).strip().replace("\x00", "")
    offset = str(_decode_value(raw_offset) or "").strip()

    parsed: datetime | None = None

    for pattern in (
        "%Y:%m:%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            parsed = datetime.strptime(text[:19], pattern)
            break
        except ValueError:
            continue

    if parsed is None:
        return None

    normalized = parsed.isoformat(timespec="seconds")

    if re.fullmatch(r"[+-]\d{2}:?\d{2}", offset):
        if len(offset) == 5:
            offset = f"{offset[:3]}:{offset[3:]}"
        normalized += offset

    return normalized


def _pillow_exif_from_base64(encoded: str) -> dict[str, Any]:
    if not encoded:
        return {}

    payload = encoded.split(",", 1)[-1]

    try:
        raw = base64.b64decode(payload, validate=False)
        with Image.open(io.BytesIO(raw)) as image:
            exif = image.getexif()
            if not exif:
                return {}

            values = {
                ExifTags.TAGS.get(tag_id, str(tag_id)): _decode_value(value)
                for tag_id, value in exif.items()
                if tag_id != 34853
            }

            try:
                gps_ifd = exif.get_ifd(ExifTags.IFD.GPSInfo)
            except (AttributeError, KeyError, TypeError, ValueError):
                gps_ifd = exif.get(34853, {})

            if isinstance(gps_ifd, dict):
                values["GPSInfo"] = {
                    ExifTags.GPSTAGS.get(tag_id, str(tag_id)): _decode_value(value)
                    for tag_id, value in gps_ifd.items()
                }

            return values
    except Exception:
        return {}


def normalize_photo_metadata(
    exif: Any,
    photo_index: int,
) -> dict[str, Any] | None:
    values = _flatten_exif(exif)

    captured_at = _normalize_capture_time(
        _first_value(values, _DATE_KEYS),
        _first_value(values, _OFFSET_KEYS),
    )

    latitude = _coordinate_to_decimal(
        _first_value(values, _LATITUDE_KEYS),
        _first_value(values, _LATITUDE_REF_KEYS),
    )
    longitude = _coordinate_to_decimal(
        _first_value(values, _LONGITUDE_KEYS),
        _first_value(values, _LONGITUDE_REF_KEYS),
    )

    metadata: dict[str, Any] = {
        "photoIndex": photo_index,
    }

    if captured_at:
        metadata["capturedAt"] = captured_at

    if (
        latitude is not None
        and longitude is not None
        and -90 <= latitude <= 90
        and -180 <= longitude <= 180
    ):
        metadata["location"] = {
            "latitude": round(latitude, 5),
            "longitude": round(longitude, 5),
            "source": "exif",
        }

    if len(metadata) == 1:
        return None

    metadata["source"] = "photo_exif"
    return metadata


def extract_photo_metadata(
    image_payload: dict[str, Any],
    photo_index: int,
) -> dict[str, Any] | None:
    client_exif = image_payload.get("exif")
    extracted_exif = _pillow_exif_from_base64(
        str(image_payload.get("base64") or "")
    )

    # The picker-provided values are useful on mobile where the returned Base64
    # can be recompressed. Original-file EXIF fills any missing fields on web.
    merged_exif = _flatten_exif(extracted_exif)
    merged_exif.update(_flatten_exif(client_exif))

    return normalize_photo_metadata(
        merged_exif,
        photo_index,
    )


def extract_photo_metadata_batch(
    images_payload: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    metadata = []

    for index, image_payload in enumerate(images_payload, start=1):
        item = extract_photo_metadata(
            image_payload,
            index,
        )
        if item:
            metadata.append(item)

    return metadata


def merge_photo_metadata(
    primary: list[dict[str, Any]] | None,
    fallback: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    merged: dict[int, dict[str, Any]] = {}

    for collection in (fallback or [], primary or []):
        for source in collection:
            if not isinstance(source, dict):
                continue

            try:
                photo_index = int(source.get("photoIndex"))
            except (TypeError, ValueError):
                continue

            if photo_index < 1:
                continue

            current = merged.get(photo_index, {"photoIndex": photo_index})
            current.update(source)
            merged[photo_index] = current

    return [
        merged[index]
        for index in sorted(merged)
    ]
