# Android 실행 및 빌드

Android는 iOS와 같은 Expo Router 네이티브 화면을 사용합니다. 웹 전용 `.web.tsx` 화면과는 분리되어 있으므로 Android 작업이 웹 UI를 바꾸지 않습니다.

## 1. 설치

```bash
cd frontend
npm install
```

Android Studio에서 에뮬레이터를 하나 실행한 뒤:

```bash
npm run android
```

캐시를 비우고 다시 실행하려면:

```bash
npm run android:clear
```

## 2. 백엔드 연결

백엔드를 모든 네트워크 인터페이스에 열어 실행합니다.

```bash
cd backend
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Android Studio 에뮬레이터

별도 환경 변수가 없으면 앱이 자동으로 `http://10.0.2.2:8000`에 연결합니다. Android 에뮬레이터에서 `10.0.2.2`는 개발 컴퓨터의 localhost를 뜻합니다.

### 실제 Android 기기

`frontend/.env.local`을 만들고 컴퓨터의 LAN IP를 지정합니다.

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:8000
EXPO_PUBLIC_SHARE_BASE_URL=http://192.168.0.10:8081
```

휴대폰과 컴퓨터가 같은 Wi-Fi에 있어야 하며, 주소 변경 후 Metro를 재시작해야 합니다.

```bash
npm run android:lan
```

연결이 어려운 네트워크에서는 Metro만 터널로 열 수 있습니다.

```bash
npm run android:tunnel
```

> Metro 터널은 FastAPI 주소를 대신 공개하지 않습니다. 실제 기기에서 백엔드까지 연결하려면 같은 네트워크의 LAN IP 또는 별도의 HTTPS 배포 주소가 필요합니다.

## 3. APK 테스트 빌드

Expo 계정 로그인과 EAS 프로젝트 연결 후 실행합니다.

```bash
cd frontend
npx eas-cli login
npm run build:android:preview
```

`preview` 프로필은 휴대폰이나 에뮬레이터에 직접 설치할 수 있는 APK를 생성합니다.

## 4. Play Store 빌드

```bash
npm run build:android:production
```

`production` 프로필은 Google Play Console 업로드용 AAB를 생성합니다. Play Store에 올릴 때마다 `frontend/app.json`의 `android.versionCode`를 증가시켜야 합니다.

## 5. Android에서 확인할 항목

- 상단 상태바와 카메라 구멍 아래에서 제목 및 버튼이 잘리지 않는지
- 하단 제스처 영역과 탭 버튼이 겹치지 않는지
- 여러 사진 선택 후 앱으로 정상 복귀하는지
- 촬영 시간과 GPS가 있는 사진의 단서가 인터뷰 생성에 반영되는지
- 인터뷰 중 시스템 뒤로가기가 현재 모달을 닫는지
- PDF, 이미지 카드, 영상, ZIP 내보내기에서 Android 공유 창이 열리는지
- 에뮬레이터와 실제 기기에서 사진 URL이 정상 표시되는지

## 6. 배포 전 보안 메모

현재 베타 백엔드가 HTTP이므로 `plugins/withAndroidCleartextTraffic.js`가 Android 테스트 빌드의 HTTP 연결을 허용합니다. 운영 백엔드를 HTTPS로 배포한 뒤에는 이 플러그인을 `app.json`에서 제거해 cleartext 통신을 다시 차단해야 합니다.
