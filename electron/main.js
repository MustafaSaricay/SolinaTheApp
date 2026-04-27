/**
 * main.js – Electron main process.
 *
 * Responsibilities:
 *  • Create the BrowserWindow
 *  • Initialise SQLite database and settings
 *  • Run periodic battery polling
 *  • Handle all IPC messages from the renderer
 */

const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');

const db          = require('./db');
const settings    = require('./settings');
const battery     = require('./battery');
const { calculateEnergyDeltaWh } = require('./calculator');

// ── State ─────────────────────────────────────────────────────────────────────

let mainWindow   = null;
let tray         = null;
let pollTimer    = null;
let monitoring   = true;
let lastReading  = null;  // { batteryPercent, isPlugged }

// ── Window ────────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  980,
    height: 720,
    minWidth:  720,
    minHeight: 560,
    title: '🌱 Solina Power Tracker',
    backgroundColor: '#1B4332',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Hide to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── System Tray ───────────────────────────────────────────────────────────────

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'tray.png'));
  tray = new Tray(icon);
  tray.setToolTip('Solina Power Tracker');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click on tray icon opens the window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// ── Battery polling ───────────────────────────────────────────────────────────

async function takeReading() {
  const info = await battery.getBatteryInfo();
  const now  = new Date().toISOString();
  const cfg  = settings.load();

  let energyDeltaWh = 0;
  if (info && lastReading) {
    energyDeltaWh = calculateEnergyDeltaWh(
      lastReading.batteryPercent,
      info.percent,
      cfg.batteryCapacityWh,
      lastReading.isPlugged,
      info.isPlugged,
    );
  }

  if (info) {
    db.insertReading(now, info.percent, info.isPlugged, energyDeltaWh);
    lastReading = { batteryPercent: info.percent, isPlugged: info.isPlugged };
  }

  // Notify renderer
  if (mainWindow) {
    mainWindow.webContents.send('reading:taken', { info, energyDeltaWh });
  }
  return { info, energyDeltaWh };
}

function schedulePoll() {
  if (pollTimer) clearTimeout(pollTimer);
  if (!monitoring) return;
  const cfg = settings.load();
  const ms  = (cfg.pollIntervalSeconds || 300) * 1000;
  pollTimer = setTimeout(async () => {
    await takeReading();
    schedulePoll();
  }, ms);
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('db:getDailyKwh',        () => db.getDailyKwh());
ipcMain.handle('db:getHourlyBreakdown', () => db.getHourlyBreakdown());
ipcMain.handle('db:getRecentReadings',  (_e, limit) => db.getRecentReadings(limit || 20));

ipcMain.handle('settings:get',   () => settings.load());
ipcMain.handle('settings:save',  (_e, s) => {
  settings.save(s);
  // Re-schedule polling with possibly updated interval
  schedulePoll();
});

ipcMain.handle('battery:readNow', async () => {
  const result = await takeReading();
  schedulePoll(); // reset the timer after a manual read
  return result;
});

ipcMain.handle('monitoring:toggle', () => {
  monitoring = !monitoring;
  if (monitoring) {
    schedulePoll();
  } else {
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  }
  if (mainWindow) {
    mainWindow.webContents.send('monitoring:status', { monitoring });
  }
  return { monitoring };
});

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Remove the default application menu (File / Edit / View …)
  Menu.setApplicationMenu(null);

  const userDataPath = app.getPath('userData');
  await db.init(userDataPath);
  settings.init(userDataPath);

  createTray();
  createWindow();

  // Initial reading right away, then start periodic polling
  takeReading().then(() => schedulePoll());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Keep the app running in the system tray on all platforms
  // (do NOT quit when the last window is closed)
});
