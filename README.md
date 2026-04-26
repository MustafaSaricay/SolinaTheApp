# 🌱 SolinaTheApp

A multiplatform project that aims to create an electrical power consumption tracking app that will raise awareness on sustainable usage practices.

---

## Desktop App – Solina Power Tracker

A cross-platform desktop application built with **Electron** (Node.js).  
It ships as a self-contained installer — **no runtime needs to be pre-installed** on the target PC.

| Platform | Installer format |
|----------|-----------------|
| Windows  | `.exe` (NSIS)   |
| macOS    | `.dmg`          |
| Linux    | `.AppImage` / `.deb` |

### Features

- 🔋 **Live battery status** — percentage, charging state, time remaining
- ⚡ **Today's kWh** — real-time energy consumption calculated from battery drain/charge deltas
- 🌿 **CO₂ equivalent** — configurable grid intensity (default: EU 2023 average 233 g/kWh)
- 📊 **Hourly bar chart** — visualises consumption across the day
- 🕒 **Recent readings table** — last 20 readings with timestamps
- ⚙ **Settings dialog** — device name, battery capacity (Wh), poll interval, CO₂ intensity
- 🗄 **Local SQLite database** — all readings stored in the user's app-data directory

---

## Installation

### Option A — Download the pre-built installer *(end users)*

1. Go to the [**Releases**](../../releases) page.
2. Download the installer for your operating system:
   - **Windows** → `Solina-Power-Tracker-Setup-x.x.x.exe` — run the installer and follow the wizard.
   - **macOS** → `Solina-Power-Tracker-x.x.x.dmg` — open the `.dmg` and drag the app to **Applications**.
   - **Linux** → `Solina-Power-Tracker-x.x.x.AppImage` — make it executable and run it:
     ```bash
     chmod +x Solina-Power-Tracker-*.AppImage
     ./Solina-Power-Tracker-*.AppImage
     ```
     Or install the `.deb` package on Debian/Ubuntu:
     ```bash
     sudo dpkg -i solina-power-tracker_*.deb
     ```
3. Launch **Solina Power Tracker** from your applications menu or desktop shortcut.
4. On first launch, open **⚙ Settings** and set your battery's full-charge capacity in Wh  
   (check your laptop spec sheet — typical values: 45–100 Wh for laptops, 15–30 Wh for phones).

---

### Option B — Run from source *(developers)*

#### Prerequisites

- **Node.js 18+** — [https://nodejs.org](https://nodejs.org)
- **npm** (bundled with Node.js)

#### Steps

```bash
# 1. Clone the repository
git clone https://github.com/MustafaSaricay/SolinaTheApp.git
cd SolinaTheApp

# 2. Install dependencies
npm install

# 3. Run in development mode
npm start
```

#### Build your own installer

```bash
# Build for the current OS (outputs to dist/)
npm run build

# Or target a specific OS explicitly
npm run build:win    # Windows (.exe)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (.AppImage + .deb)
```

#### Run tests

```bash
npm test
```

---

## First-time configuration

| Setting | Description | Default |
|---------|-------------|---------|
| **Device name** | Label for this device | `My Device` |
| **Battery capacity (Wh)** | Full-charge capacity of your battery — check your device spec sheet | `50 Wh` |
| **Poll interval (seconds)** | How often the app reads battery data | `300` (5 min) |
| **CO₂ intensity (g/kWh)** | Local grid carbon intensity — find yours at [electricitymap.org](https://electricitymap.org) | `233` (EU avg 2023) |

Open the **⚙ Settings** dialog from the status bar at the bottom of the window to adjust these values.

---

## Project structure

```
SolinaTheApp/
├── electron/
│   ├── main.js        # Main process: window, IPC handlers, polling loop
│   ├── preload.js     # Secure contextBridge API exposed to the renderer
│   ├── db.js          # SQLite layer (sql.js – pure WebAssembly, no native build)
│   ├── battery.js     # Battery info via systeminformation
│   ├── calculator.js  # Pure kWh / CO₂ calculation functions
│   └── settings.js    # JSON settings stored in userData
├── renderer/
│   ├── index.html     # Single-page UI
│   ├── styles.css     # Forest-green CSS theme
│   └── renderer.js    # UI logic, chart drawing, IPC calls
├── tests/
│   ├── calculator.test.js
│   └── db.test.js
└── package.json
```

