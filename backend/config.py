# backend/config.py

import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

ALBUMS_DIR = os.path.join(BASE_DIR, "albums")
ENHANCED_DIR = os.path.join(ALBUMS_DIR, "enhanced")
EXPORTS_DIR = os.path.join(BASE_DIR, "exports")
DB_PATH = os.path.join(BASE_DIR, "database.db")

# Secrets must be supplied through backend/.env or the process environment.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
YOUCAM_API_KEY = os.getenv("YOUCAM_API_KEY", "")

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-4-neon")
GEMINI_HTTP_TIMEOUT_MS = int(os.getenv("GEMINI_HTTP_TIMEOUT_MS", "60000"))
GEMINI_MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", "2"))
GEMINI_CLASSIFY_BATCH_SIZE = int(
    os.getenv("GEMINI_CLASSIFY_BATCH_SIZE", "4")
)
GEMINI_DIRECT_THRESHOLD = int(os.getenv("GEMINI_DIRECT_THRESHOLD", "4"))

EXPORT_TTL_SECONDS = int(os.getenv("EXPORT_TTL_SECONDS", "86400"))
EXPORT_NODE_BINARY = os.getenv("EXPORT_NODE_BINARY", "node")
EXPORT_FFMPEG_BINARY = os.getenv("EXPORT_FFMPEG_BINARY", "ffmpeg")

os.makedirs(ALBUMS_DIR, exist_ok=True)
os.makedirs(ENHANCED_DIR, exist_ok=True)
for export_kind in ("pdf", "cards", "video", "zip", "temp"):
    os.makedirs(os.path.join(EXPORTS_DIR, export_kind), exist_ok=True)

