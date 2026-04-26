/**
 * db.js – SQLite persistence layer using sql.js (pure WebAssembly).
 *
 * sql.js keeps the database in memory and persists it to a file on every
 * write, so there are no native bindings to rebuild.
 *
 * Database file location: <userData>/solina/solina.db
 */

const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

let _db   = null;
let _dbPath = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS battery_readings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       TEXT    NOT NULL,
    batteryPercent  REAL    NOT NULL,
    isPlugged       INTEGER NOT NULL,
    energyDeltaWh   REAL    NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_br_ts ON battery_readings (timestamp);
`;

/**
 * Initialise the database. Must be called once (and awaited) before any other
 * function. Accepts a userData directory path (Electron: app.getPath('userData'))
 * or an arbitrary temp path for unit tests.
 *
 * @param {string} userDataPath
 * @returns {Promise<void>}
 */
async function init(userDataPath) {
  const dir = path.join(userDataPath, 'solina');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _dbPath = path.join(dir, 'solina.db');

  const SQL = await initSqlJs();
  if (fs.existsSync(_dbPath)) {
    const fileBuffer = fs.readFileSync(_dbPath);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }
  _db.run(SCHEMA);
  _persist();
}

/** Flush the in-memory database to disk. Called after every write. */
function _persist() {
  if (!_db || !_dbPath) return;
  const data = _db.export();
  fs.writeFileSync(_dbPath, Buffer.from(data));
}

function _getDb() {
  if (!_db) throw new Error('db.init() not called');
  return _db;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Run a SELECT and return all rows as plain objects.
 * @param {string} sql
 * @param {any[]} [params=[]]
 * @returns {object[]}
 */
function _query(sql, params = []) {
  const stmt    = _getDb().prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Run a SELECT that returns exactly one row (or null).
 */
function _queryOne(sql, params = []) {
  const rows = _query(sql, params);
  return rows.length ? rows[0] : null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Insert one battery reading.
 */
function insertReading(timestamp, batteryPercent, isPlugged, energyDeltaWh) {
  _getDb().run(
    `INSERT INTO battery_readings (timestamp, batteryPercent, isPlugged, energyDeltaWh)
     VALUES (?, ?, ?, ?)`,
    [timestamp, batteryPercent, isPlugged ? 1 : 0, energyDeltaWh],
  );
  _persist();
}

/**
 * Total energy consumed on *isoDate* (default: today) in kWh.
 * @param {string} [isoDate]  e.g. '2024-06-01'
 */
function getDailyKwh(isoDate) {
  const date = isoDate || new Date().toISOString().slice(0, 10);
  const row = _queryOne(
    `SELECT COALESCE(SUM(energyDeltaWh), 0) AS total
     FROM battery_readings
     WHERE DATE(timestamp) = ?`,
    [date],
  );
  return (row ? row.total || 0 : 0) / 1000;
}

/**
 * Hourly breakdown of energy (kWh) for a given day.
 * @param {string} [isoDate]
 * @returns {Array<{hour: number, kwh: number}>}
 */
function getHourlyBreakdown(isoDate) {
  const date = isoDate || new Date().toISOString().slice(0, 10);
  return _query(
    `SELECT CAST(strftime('%H', timestamp) AS INTEGER) AS hour,
            SUM(energyDeltaWh) AS wh
     FROM battery_readings
     WHERE DATE(timestamp) = ?
     GROUP BY hour
     ORDER BY hour`,
    [date],
  ).map((r) => ({ hour: Number(r.hour), kwh: Number(r.wh) / 1000 }));
}

/**
 * The most recent reading, or null if the table is empty.
 */
function getLastReading() {
  return _queryOne(
    `SELECT * FROM battery_readings ORDER BY timestamp DESC LIMIT 1`,
  );
}

/**
 * The N most recent readings, newest first.
 * @param {number} [limit=24]
 */
function getRecentReadings(limit = 24) {
  return _query(
    `SELECT * FROM battery_readings ORDER BY timestamp DESC LIMIT ?`,
    [limit],
  );
}

module.exports = { init, insertReading, getDailyKwh, getHourlyBreakdown, getLastReading, getRecentReadings };
