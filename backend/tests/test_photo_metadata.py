from __future__ import annotations

import base64
import io

from PIL import Image

from utils.photo_metadata import (
    extract_photo_metadata_batch,
    merge_photo_metadata,
    normalize_photo_metadata,
)


def test_normalize_photo_metadata_from_nested_exif() -> None:
    metadata = normalize_photo_metadata(
        {
            "DateTimeOriginal": "2018:08:15 14:30:05",
            "OffsetTimeOriginal": "+09:00",
            "GPSInfo": {
                "GPSLatitude": (37, 33, 18),
                "GPSLatitudeRef": "N",
                "GPSLongitude": (126, 58, 41),
                "GPSLongitudeRef": "E",
            },
        },
        photo_index=2,
    )

    assert metadata == {
        "photoIndex": 2,
        "capturedAt": "2018-08-15T14:30:05+09:00",
        "location": {
            "latitude": 37.555,
            "longitude": 126.97806,
            "source": "exif",
        },
        "source": "photo_exif",
    }


def test_normalize_photo_metadata_accepts_decimal_mobile_values() -> None:
    metadata = normalize_photo_metadata(
        {
            "DateTime": "2020:01:02 03:04:05",
            "GPS": {
                "Latitude": 33.49962,
                "LatitudeRef": "N",
                "Longitude": 126.53119,
                "LongitudeRef": "E",
            },
        },
        photo_index=1,
    )

    assert metadata is not None
    assert metadata["capturedAt"] == "2020-01-02T03:04:05"
    assert metadata["location"]["latitude"] == 33.49962
    assert metadata["location"]["longitude"] == 126.53119


def test_image_without_exif_is_omitted() -> None:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "white").save(buffer, format="JPEG")

    result = extract_photo_metadata_batch([
        {
            "base64": base64.b64encode(buffer.getvalue()).decode("ascii"),
            "mimeType": "image/jpeg",
        }
    ])

    assert result == []


def test_merge_photo_metadata_prefers_newly_extracted_values() -> None:
    merged = merge_photo_metadata(
        primary=[
            {
                "photoIndex": 1,
                "capturedAt": "2022-05-01T12:00:00",
                "source": "photo_exif",
            }
        ],
        fallback=[
            {
                "photoIndex": 1,
                "capturedAt": "2020-01-01T00:00:00",
                "location": {
                    "latitude": 37.5,
                    "longitude": 127.0,
                    "source": "exif",
                },
            },
            {
                "photoIndex": 2,
                "capturedAt": "2019-03-04T10:00:00",
            },
        ],
    )

    assert merged[0]["capturedAt"] == "2022-05-01T12:00:00"
    assert merged[0]["location"]["latitude"] == 37.5
    assert merged[1]["photoIndex"] == 2
