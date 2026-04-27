/**
 * services/monitor.js — Battery polling loop + SSE broadcast.
 *
 * Replaces the Electron main.js scheduler.  Emits events to all connected
 * SSE clients whenever a reading is taken or monitoring state changes.
 */

'use strict';

const { getBatteryInfo }        = require('./battery');
const { calculateEnergyDeltaWh } = require('./calculator');
const { getSettings }           = require('../db/settings');
const { insertReading }         = require('../db/readings');

// ── SSE client registry ───────────────────────────────────────────────────────

/** @type {Set<import('http').ServerResponse>} */
const _clients = new Set();

/** Register an SSE response object. */
function addClient(res) {
  _clients.add(res);
}

/** Remove an SSE response object (called when the client disconnects). */
function removeClient(res) {
  _clients.delete(res);
}

/** Broadcast a named SSE event with a JSON payload to all connected clients. */
function broadcast(event, data) {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of _clients) {
    try {
      res.write(chunk);
    } catch {
      _clients.delete(res);
    }
  }
}

// ── Polling state ─────────────────────────────────────────────────────────────

let _monitoring  = true;
let _pollTimer   = null;
let _lastReading = null; // { batteryPercent, isPlugged }

/** Returns the current monitoring state. */
function isMonitoring() {
  return _monitoring;
}

/**
 * Take one battery reading, persist it, and broadcast to SSE clients.
 * @returns {Promise<{info: object|null, energyDeltaWh: number}>}
 */
async function takeReading() {
  const info = await getBatteryInfo();
  const now  = new Date().toISOString();
  const cfg  = await getSettings();

  let energyDeltaWh = 0;
  if (info && _lastReading) {
    energyDeltaWh = calculateEnergyDeltaWh(
      _lastReading.batteryPercent,
      info.percent,
      cfg.batteryCapacityWh,
      _lastReading.isPlugged,
      info.isPlugged,
    );
  }

  if (info) {
    await insertReading(now, info.percent, info.isPlugged, energyDeltaWh);
    _lastReading = { batteryPercent: info.percent, isPlugged: info.isPlugged };
  }

  broadcast('reading:taken', { info, energyDeltaWh });
  return { info, energyDeltaWh };
}

/**
 * Schedule the next poll.  Safe to call after a manual read to reset the timer.
 */
function schedulePoll() {
  if (_pollTimer) clearTimeout(_pollTimer);
  if (!_monitoring) return;

  // Read interval from env first (set at startup), then fall back to default.
  const ms = (parseInt(process.env.POLL_INTERVAL_SECONDS, 10) || 300) * 1000;
  _pollTimer = setTimeout(async () => {
    try {
      await takeReading();
    } catch (err) {
      console.error('[monitor] Poll error:', err.message);
    }
    schedulePoll();
  }, ms);
}

/**
 * Toggle monitoring on/off.
 * @returns {{ monitoring: boolean }}
 */
function toggleMonitoring() {
  _monitoring = !_monitoring;
  if (_monitoring) {
    schedulePoll();
  } else {
    if (_pollTimer) { clearTimeout(_pollTimer); _pollTimer = null; }
  }
  broadcast('monitoring:status', { monitoring: _monitoring });
  return { monitoring: _monitoring };
}

/**
 * Start the monitor.  Call once at server startup after the DB is ready.
 */
async function start() {
  await takeReading();   // initial read immediately
  schedulePoll();
}

module.exports = { start, takeReading, schedulePoll, toggleMonitoring, isMonitoring, addClient, removeClient };
