# iOS beta development setup

## 1. Install dependencies

```bash
cd frontend
yarn install
```

## 2. Start the backend

Open another terminal from the repository root:

```bash
cd backend
python app.py
```

The backend already listens on `0.0.0.0:8000`, so it can accept connections
from the iOS simulator and devices on the same local network.

## 3. Choose an iOS target

### iOS Simulator (Mac + Xcode)

```bash
cd frontend
cp .env.example .env.local
yarn ios
```

The simulator can use `http://localhost:8000`.

### Physical iPhone (Expo Go)

Find the Mac's Wi-Fi IP address:

```bash
ipconfig getifaddr en0
```

Create `frontend/.env.local` and use that address:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.0.10:8000
```

Then start Expo and scan the QR code with the iPhone:

```bash
cd frontend
yarn start
```

The Mac and iPhone must be on the same Wi-Fi. Allow local-network access when
iOS asks. If the API cannot be reached, check the macOS firewall and open
`http://YOUR_MAC_IP:8000/docs` in iPhone Safari.

After changing `.env.local`, restart Metro with a clean cache:

```bash
yarn ios:clear
```

## 4. Keep running the web version

No source-code switch is needed:

```bash
yarn web
```

Only the launch command and local API environment value differ by target.
