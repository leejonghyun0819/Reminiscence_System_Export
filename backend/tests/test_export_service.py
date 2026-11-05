import json
import os
import tempfile
import unittest
import zipfile
import shutil
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from fastapi import FastAPI
from fastapi.testclient import TestClient

import config
import database
import services.export_service as export_service
import utils.file_utils as file_utils
from routers.export import router as export_router
from services.export_service import ExportDependencyError


class ExportServiceTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.albums = root / "albums"
        self.enhanced = self.albums / "enhanced"
        self.exports = root / "exports"
        self.db_path = root / "database.db"
        self.enhanced.mkdir(parents=True)
        for kind in ("pdf", "cards", "video", "zip", "temp"):
            (self.exports / kind).mkdir(parents=True)

        config.ALBUMS_DIR = str(self.albums)
        config.ENHANCED_DIR = str(self.enhanced)
        config.EXPORTS_DIR = str(self.exports)
        config.DB_PATH = str(self.db_path)
        database.DB_PATH = str(self.db_path)
        file_utils.ALBUMS_DIR = str(self.albums)
        file_utils.ENHANCED_DIR = str(self.enhanced)
        export_service.ALBUMS_DIR = str(self.albums)
        export_service.ENHANCED_DIR = str(self.enhanced)
        export_service.EXPORTS_DIR = str(self.exports)

        database.init_db()
        album = self.albums / "여행" / "미분류" / "source-1"
        album.mkdir(parents=True)
        Image.new("RGB", (900, 600), "#8ecae6").save(album / "image_0.jpg")
        Image.new("RGB", (900, 600), "#219ebc").save(self.enhanced / "source-1_enhanced_1.jpg")
        meta = {
            "id": "source-1",
            "mode": "travel",
            "rootCategory": "여행",
            "fileNames": ["image_0.jpg"],
            "imageUrls": ["http://localhost:8000/albums/여행/미분류/source-1/image_0.jpg"],
            "categoryFolder": "미분류",
            "analysis": {"title": "폭포 여행", "location": "제주", "yearEstimate": "2010년"},
            "curatedNote": {
                "title": "폭포 여행",
                "sceneDescription": "물안개가 번지던 폭포 앞에 서 있었습니다.",
                "remembered": "차가운 바람과 물소리가 기억납니다.",
                "unremembered": "함께 간 식당 이름은 기억나지 않습니다.",
                "reflection": "지금 보니 그날의 용기가 고맙습니다.",
            },
            "createdAt": 1700000000000,
        }
        (album / "album_meta.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")

        note = {
            "id": "generated-note-1",
            "mode": "travel",
            "rootCategory": "여행",
            "fileNames": ["image_0.jpg"],
            "imageUrls": ["http://localhost:8000/albums/여행/미분류/source-1/image_0.jpg"],
            "createdAt": 1700000000000,
            "analysis": {"title": "푸른 폭포를 걷던 날", "location": "제주", "yearEstimate": "2010년"},
            "generatedNote": {
                "title": "푸른 폭포를 걷던 날",
                "opening": "폭포 앞의 장면",
                "body": "여행의 기억",
                "closing": "다시 바라본 마음",
                "sourceMemoryIds": ["source-1"],
            },
        }
        with database.get_db_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO memories (
                    id, file_names_json, image_urls_json, title, location, year_estimate,
                    description, story_caption, category_folder
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "source-1",
                    json.dumps(["image_0.jpg"]),
                    json.dumps(meta["imageUrls"], ensure_ascii=False),
                    "폭포 여행",
                    "제주",
                    "2010년",
                    "폭포 앞",
                    "여행 기억",
                    "미분류",
                ),
            )
            cursor.execute(
                "INSERT INTO generated_notes (id, note_json) VALUES (?, ?)",
                (note["id"], json.dumps(note, ensure_ascii=False)),
            )
        test_app = FastAPI()
        test_app.include_router(export_router)
        self.client = TestClient(test_app)

    def tearDown(self):
        self.temp.cleanup()

    def test_preview_normalises_note_and_prefers_enhanced_photo(self):
        preview = export_service.export_preview("generated-note-1")
        self.assertEqual(preview["title"], "푸른 폭포를 걷던 날")
        self.assertEqual(preview["sceneDescription"], "물안개가 번지던 폭포 앞에 서 있었습니다.")
        self.assertEqual(preview["remembered"], "차가운 바람과 물소리가 기억납니다.")
        self.assertEqual(preview["photos"][0]["kind"], "enhanced")
        self.assertTrue(preview["photos"][0]["url"].startswith("/enhanced/"))
        self.assertEqual({item["id"] for item in preview["templates"]}, {"minimal", "photo_essay"})

        enhanced_only = export_service.export_preview("generated-note-1", "enhanced")
        self.assertTrue(enhanced_only["photos"])
        self.assertTrue(all(photo["kind"] == "enhanced" for photo in enhanced_only["photos"]))

    def test_export_override_does_not_change_saved_note(self):
        bundle = export_service.build_export_bundle(
            "generated-note-1",
            overrides={"title": "내가 정한 제목", "reflection": "내보내기 전용 문장"},
        )
        self.assertEqual(bundle.snapshot["title"], "내가 정한 제목")
        with database.get_db_cursor() as cursor:
            cursor.execute("SELECT note_json FROM generated_notes WHERE id = ?", ("generated-note-1",))
            stored = json.loads(cursor.fetchone()["note_json"])
        self.assertEqual(stored["analysis"]["title"], "푸른 폭포를 걷던 날")

    def test_share_snapshot_can_be_disabled(self):
        created = export_service.create_share("generated-note-1", expires_in_days=7)
        shared = export_service.get_share(created["shareId"])
        self.assertEqual(shared["memory"]["title"], "푸른 폭포를 걷던 날")
        export_service.disable_share(created["shareId"])
        with self.assertRaises(export_service.ExportNotFoundError):
            export_service.get_share(created["shareId"])

    def test_export_and_share_api_contract(self):
        preview = self.client.get("/api/export/preview/generated-note-1")
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.json()["title"], "푸른 폭포를 걷던 날")

        created = self.client.post("/api/share/generated-note-1", json={"expiresInDays": 7})
        self.assertEqual(created.status_code, 200)
        share_id = created.json()["shareId"]
        shared = self.client.get(f"/api/share/{share_id}")
        self.assertEqual(shared.status_code, 200)
        self.assertNotIn("albumMeta", shared.json()["memory"])
        disabled = self.client.delete(f"/api/share/{share_id}")
        self.assertEqual(disabled.status_code, 200)
        self.assertEqual(self.client.get(f"/api/share/{share_id}").status_code, 404)

    def test_zip_contains_portable_note_and_available_assets(self):
        with patch.object(export_service, "generate_pdf", side_effect=ExportDependencyError("renderer missing")):
            output, _ = export_service.generate_zip("generated-note-1")
        with zipfile.ZipFile(output) as archive:
            names = archive.namelist()
            self.assertTrue(any(name.endswith("/original/image_1.jpg") for name in names))
            self.assertTrue(any(name.endswith("/enhanced/enhanced_1.jpg") for name in names))
            self.assertTrue(any(name.endswith("/note/note.json") for name in names))
            self.assertTrue(any(name.endswith("/note/note.txt") for name in names))
            self.assertTrue(any(name.endswith("/metadata/album_meta.json") for name in names))
            self.assertTrue(any(name.endswith("/note/PDF_GENERATION_NOTICE.txt") for name in names))

    @unittest.skipUnless(shutil.which("node"), "Node.js is required for the renderer integration test")
    def test_puppeteer_generates_pdf_and_card_archive_when_installed(self):
        renderer_modules = Path(export_service.BASE_DIR) / "export_renderer" / "node_modules" / "puppeteer"
        if not renderer_modules.exists():
            self.skipTest("Run npm install in backend/export_renderer first")

        pdf_path, _ = export_service.generate_pdf("generated-note-1")
        cards_path, _ = export_service.generate_cards("generated-note-1")
        self.assertGreater(os.path.getsize(pdf_path), 500)
        with zipfile.ZipFile(cards_path) as archive:
            cards = [name for name in archive.namelist() if name.endswith(".png")]
        self.assertEqual(len(cards), 5)

    @unittest.skipUnless(shutil.which("ffmpeg"), "FFmpeg is required for the video integration test")
    def test_ffmpeg_generates_playable_slideshow(self):
        output, _ = export_service.generate_video("generated-note-1")
        self.assertGreater(os.path.getsize(output), 10_000)


if __name__ == "__main__":
    unittest.main()
