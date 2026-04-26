/**
 * preload.js – Secure contextBridge between main process and renderer.
 *
 * Only explicitly listed IPC channels are exposed; the renderer never has
 * access to Node.js or Electron internals directly.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('solina', {
  // ── Readings ──────────────────────────────────────────────────────────────
  getDailyKwh:       ()        => ipcRenderer.invoke('db:getDailyKwh'),
  getHourlyBreakdown:()        => ipcRenderer.invoke('db:getHourlyBreakdown'),
  getRecentReadings: (limit)   => ipcRenderer.invoke('db:getRecentReadings', limit),
  takeReadingNow:    ()        => ipcRenderer.invoke('battery:readNow'),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings:       ()        => ipcRenderer.invoke('settings:get'),
  saveSettings:      (s)       => ipcRenderer.invoke('settings:save', s),

  // ── Events from main ──────────────────────────────────────────────────────
  onReadingTaken: (cb) => {
    ipcRenderer.on('reading:taken', (_event, data) => cb(data));
  },
  onMonitoringStatus: (cb) => {
    ipcRenderer.on('monitoring:status', (_event, data) => cb(data));
  },

  // ── Control ───────────────────────────────────────────────────────────────
  toggleMonitoring:  ()        => ipcRenderer.invoke('monitoring:toggle'),
});
