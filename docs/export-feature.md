# 추억 노트 Export 기능

## 개요

완성된 추억 노트를 다음 결과물로 변환합니다.

- PDF 추억책
- 이미지 카드 묶음(PNG/JPG ZIP)
- 읽기 전용 웹 공유 링크
- MP4 슬라이드쇼
- 원본 데이터 전체 백업 ZIP

Export 과정에서 수정한 제목과 본문은 출력에만 사용합니다. SQLite의
`generated_notes.note_json`, `memories`, `album_meta.json` 원본은 변경하지
않습니다.

## 설치

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
```

Puppeteer 기반 HTML/CSS 렌더러를 설치합니다.

```bash
cd backend/export_renderer
npm install
```

Puppeteer/Chromium을 실행할 수 없는 환경에서는 ReportLab과 PyMuPDF 기반
보조 렌더러가 PDF와 이미지 카드를 생성합니다. 한국어 포토북 품질은
Puppeteer 렌더러 사용을 권장합니다.

슬라이드쇼 영상을 사용하려면 FFmpeg가 필요합니다.

```bash
# macOS
brew install ffmpeg
```

경로를 직접 지정해야 한다면 `backend/.env`에 설정합니다.

```dotenv
EXPORT_NODE_BINARY=node
EXPORT_FFMPEG_BINARY=ffmpeg
EXPORT_TTL_SECONDS=86400
```

### Frontend

```bash
cd frontend
npm install
```

모바일 공유 시트를 위해 `expo-file-system`과 `expo-sharing`을 사용합니다.
다른 기기에서 공유 링크를 열려면 배포된 프론트엔드 주소를 지정합니다.

```dotenv
EXPO_PUBLIC_SHARE_BASE_URL=https://example.com
```

## 데이터 흐름

1. 프론트엔드는 완성 노트 ID로 `/api/export/preview/{memory_id}`를 요청합니다.
2. 백엔드는 `generated_notes.note_json`과 `sourceMemoryIds`를 기준으로
   `memories`, 앨범 폴더, `album_meta.json`을 합칩니다.
3. 원본/개선본 선택, 대표 사진, 사용할 사진, 템플릿, 출력용 텍스트를
   미리보기에서 결정합니다.
4. 종류별 API가 요청 시 결과물을 `backend/exports/`에 생성합니다.
5. 웹에서는 파일을 다운로드하고 iOS/Android에서는 시스템 공유 시트를
   엽니다.

## API

| Method | Path | 결과 |
|---|---|---|
| `GET` | `/api/export/capabilities` | 렌더러와 FFmpeg 사용 가능 여부 |
| `GET` | `/api/export/preview/{memory_id}` | 정규화한 노트와 선택 가능한 사진 |
| `POST` | `/api/export/pdf/{memory_id}` | PDF 추억책 |
| `POST` | `/api/export/cards/{memory_id}` | 이미지 카드 ZIP |
| `POST` | `/api/export/video/{memory_id}` | MP4 슬라이드쇼 |
| `POST` | `/api/export/zip/{memory_id}` | 전체 백업 ZIP |
| `POST` | `/api/share/{memory_id}` | 공유 링크 생성 |
| `GET` | `/api/share/{share_id}` | 읽기 전용 공유 스냅샷 |
| `DELETE` | `/api/share/{share_id}` | 공유 링크 비활성화 |

`photoSource`는 `preferred`, `original`, `enhanced`, `current`를 지원합니다.
기본값 `preferred`는 개선본이 존재하면 개선본을 사용하고, 없으면 원본을
사용합니다.

과거 개선 파일에는 원본과의 명시적인 관계가 저장되지 않은 경우가 있어
파일 순서로 대응시킵니다. 사용자는 미리보기에서 최종 선택을 확인할 수
있습니다.

## 템플릿

- `minimal`: 여백이 많은 개인 포토 에세이 스타일
- `photo_essay`: 사진 비중이 큰 포토북 스타일

PDF와 이미지 카드는 `backend/services/export_templates.py`의 공통 섹션
구조(Cover, Scene, Memory, Unremembered, Reflection)를 재사용합니다.
카드 프리셋은 1080×1350, 1080×1080, 1920×1080입니다.

## 파일 보관과 정리

결과물은 다음 폴더에 생성됩니다.

```text
backend/exports/
  pdf/
  cards/
  video/
  zip/
  temp/
```

각 요청이 시작될 때 `EXPORT_TTL_SECONDS`보다 오래된 임시 결과물을
정리합니다. 기본 보존 시간은 24시간입니다. 공유 링크 자체는 SQLite의
`memory_shares`에 보존되며 링크 비활성화와 만료일을 지원합니다.

## ZIP 구조

실제로 존재하는 파일만 포함합니다.

```text
memory_title/
  original/
  enhanced/
  media/
  note/
    memory.pdf
    note.json
    note.txt
  metadata/
    album_meta.json
```

## 검증

```bash
cd backend
python -m unittest discover -s tests -v

cd ../frontend
npm run typecheck
```

백엔드 테스트는 데이터 정규화, 개선본 우선 선택, 원본 DB 비변경,
공유 링크 수명주기, API 계약, PDF·카드·MP4 실제 생성, ZIP 내부 구조를
검증합니다.

## 후속 확장

- 공유 링크 비밀번호 입력 및 검증 UI
- 공유 링크 관리 목록과 만료일 변경
- Export 작업 큐와 진행률 표시
- 영상 배경 음악 선택 및 자막 타이밍 편집
- 오래된 결과물을 주기적으로 정리하는 스케줄러
