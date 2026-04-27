# 🌱 SolinaTheApp

A multiplatform project that aims to create an electrical power consumption tracking app that will raise awareness on sustainable usage practices.

---

## Architecture

```
┌─────────────────────┐        HTTP/REST + SSE
│   Flutter App        │ ◄──────────────────────────── Node.js + Express API
│  (mobile/desktop/web)│                                       │
└─────────────────────┘                                       ▼
                                                   PostgreSQL (+ TimescaleDB)
```

| Layer | Technology |
|-------|-----------|
| **Frontend** | Flutter (Dart) |
| **Backend** | Node.js 20 + Express |
| **Database** | PostgreSQL 16 + TimescaleDB (optional) |

---

## Features

- 🔋 **Live battery status** — percentage, charging state, time remaining
- ⚡ **Today's kWh** — real-time energy consumption calculated from battery drain/charge deltas
- 🌿 **CO₂ equivalent** — configurable grid intensity (default: EU 2023 average 233 g/kWh)
- 📊 **Hourly bar chart** — visualises consumption across the day
- 🕒 **Recent readings table** — last 20 readings with timestamps
- ⚙ **Settings dialog** — device name, battery capacity (Wh), poll interval, CO₂ intensity
- 🔄 **Real-time updates** — Server-Sent Events push new readings to the Flutter app instantly
- 🐘 **PostgreSQL storage** — production-grade persistence with optional TimescaleDB hypertables

---

## Quick Start (Docker)

The fastest way to run the full stack locally:

```bash
# 1. Clone the repository
git clone https://github.com/MustafaSaricay/SolinaTheApp.git
cd SolinaTheApp

# 2. Start the database + backend
docker compose up --build

# The backend API is now available at http://localhost:3000
```

---

## Backend — Node.js + Express

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or use Docker Compose)

### Setup

```bash
cd backend

# Copy environment config
cp .env.example .env
# Edit .env → set DATABASE_URL to your PostgreSQL connection string

# Install dependencies
npm install

# Run in development mode (nodemon, auto-restart)
npm run dev

# Run in production mode
npm start
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `POLL_INTERVAL_SECONDS` | `300` | Battery poll interval |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |

### REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/readings/daily-kwh` | Today's total kWh |
| `GET`  | `/api/readings/hourly-breakdown` | Per-hour kWh array |
| `GET`  | `/api/readings/recent?limit=20` | Last N readings |
| `POST` | `/api/battery/read-now` | Trigger immediate reading |
| `GET`  | `/api/settings` | Return device settings |
| `PUT`  | `/api/settings` | Save device settings |
| `POST` | `/api/monitoring/toggle` | Pause / resume polling |
| `GET`  | `/api/monitoring/status` | Current monitoring state |
| `GET`  | `/api/events` | SSE stream (`reading:taken`, `monitoring:status`) |

### Run backend tests

```bash
cd backend
npm test
```

---

## Frontend — Flutter

### Prerequisites

- Flutter SDK 3.x — [https://flutter.dev/docs/get-started/install](https://flutter.dev/docs/get-started/install)
- A running Solina backend (see above)

### Setup

```bash
cd frontend

# Copy environment config
cp .env.example .env
# Edit .env → set API_BASE_URL to your backend URL

# Get packages
flutter pub get

# Run on your target platform
flutter run                   # connected device / emulator
flutter run -d chrome         # web
flutter run -d macos          # macOS desktop
flutter run -d linux          # Linux desktop
flutter run -d windows        # Windows desktop
```

### Run Flutter tests

```bash
cd frontend
flutter test
```

---

## Project structure

```
SolinaTheApp/
├── backend/                     ← Node.js + Express API
│   ├── db/
│   │   ├── schema.sql           # Full schema reference
│   │   └── migrations/          # Numbered SQL migrations
│   │       ├── 001_initial.sql
│   │       └── 002_timescale.sql (optional TimescaleDB)
│   ├── src/
│   │   ├── app.js               # Express app factory
│   │   ├── server.js            # Entry point (migrate → monitor → listen)
│   │   ├── db/
│   │   │   ├── pool.js          # Shared pg.Pool
│   │   │   ├── migrate.js       # Migration runner
│   │   │   ├── readings.js      # battery_readings queries
│   │   │   └── settings.js      # device_settings queries
│   │   ├── services/
│   │   │   ├── battery.js       # systeminformation wrapper
│   │   │   ├── calculator.js    # Pure kWh / CO₂ calculations
│   │   │   └── monitor.js       # Polling loop + SSE broadcast
│   │   └── routes/
│   │       ├── readings.js
│   │       ├── battery.js
│   │       ├── settings.js
│   │       ├── monitoring.js
│   │       └── events.js        # SSE endpoint
│   ├── tests/
│   │   ├── calculator.test.js
│   │   └── routes.test.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── frontend/                    ← Flutter app
│   ├── lib/
│   │   ├── main.dart            # App entry point + provider wiring
│   │   ├── models/              # BatteryInfo, BatteryReading, HourlyPoint, DeviceSettings
│   │   ├── services/
│   │   │   └── api_service.dart # HTTP + SSE client
│   │   ├── providers/           # ReadingsProvider, BatteryProvider, SettingsProvider, MonitoringProvider
│   │   ├── screens/             # DashboardScreen, SettingsScreen
│   │   └── widgets/             # BatteryCard, KwhCard, Co2Card, HourlyChart, HistoryTable
│   ├── test/
│   │   ├── models_test.dart
│   │   └── api_service_test.dart
│   ├── pubspec.yaml
│   └── .env.example
├── docker-compose.yml           ← PostgreSQL (TimescaleDB) + backend
├── electron/                    ← Legacy desktop app (kept for compatibility)
├── renderer/
├── tests/
└── README.md
```

---

## TimescaleDB (optional)

The backend works on plain PostgreSQL out of the box. To enable TimescaleDB:

1. Use the `timescale/timescaledb:latest-pg16` Docker image (already in `docker-compose.yml`).
2. Run the optional migration after the initial schema:

```bash
psql $DATABASE_URL -f backend/db/migrations/002_timescale.sql
```

This converts `battery_readings` into a **hypertable** partitioned by `timestamp`, enabling automatic time-based chunk management and efficient time-range queries at scale.

---

## First-time configuration

| Setting | Description | Default |
|---------|-------------|---------|
| **Device name** | Label for this device | `My Device` |
| **Battery capacity (Wh)** | Full-charge capacity — check your device spec sheet | `50 Wh` |
| **Poll interval (seconds)** | How often the backend reads battery data | `300` (5 min) |
| **CO₂ intensity (g/kWh)** | Local grid carbon intensity — find yours at [electricitymap.org](https://electricitymap.org) | `233` (EU avg 2023) |

Open the **⚙ Settings** dialog in the Flutter app to adjust these values.

---

## Legacy Desktop App (Electron)

The original Electron desktop app is preserved in the `electron/` and `renderer/` directories for users who need a self-contained single-binary install without a separate backend.

<details>
<summary>Legacy Desktop App – Solina Power Tracker (Electron)</summary>

A cross-platform desktop application built with **Electron** (Node.js).  
It ships as a self-contained installer — **no runtime needs to be pre-installed** on the target PC.

| Platform | Installer format |
|----------|-----------------|
| Windows  | `.exe` (NSIS)   |
| macOS    | `.dmg`          |
| Linux    | `.AppImage` / `.deb` |

### Run from source

```bash
npm install
npm start
```

### Build installer

```bash
npm run build        # current OS
npm run build:win    # Windows (.exe)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (.AppImage + .deb)
```

### Run legacy tests

```bash
npm test
```

</details>
