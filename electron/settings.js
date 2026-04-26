/**
 * settings.js – Persistent JSON settings stored in Electron's userData directory.
 */

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  deviceName: 'My Device',
  batteryCapacityWh: 50,        // Wh – user should set to match their battery
  pollIntervalSeconds: 300,     // 5 minutes between readings
  co2GramsPerKwh: 233,          // EU average grid intensity 2023 (g CO₂/kWh)
};

let _settingsPath = null;

/**
 * Must be called once after app.getPath('userData') is available (i.e. in main.js).
 * @param {string} userDataPath
 */
function init(userDataPath) {
  const dir = path.join(userDataPath, 'solina');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _settingsPath = path.join(dir, 'settings.json');
}

function load() {
  if (!_settingsPath || !fs.existsSync(_settingsPath)) return { ...DEFAULTS };
  try {
    const stored = JSON.parse(fs.readFileSync(_settingsPath, 'utf8'));
    return { ...DEFAULTS, ...stored };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(settings) {
  if (!_settingsPath) throw new Error('settings.init() not called');
  fs.writeFileSync(_settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

module.exports = { init, load, save, DEFAULTS };
