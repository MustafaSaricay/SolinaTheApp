/**
 * db/settings.js — Device settings persistence (PostgreSQL key/value store).
 *
 * Mirrors the public API of electron/settings.js.
 */

'use strict';

const pool = require('./pool');

const DEFAULTS = {
  deviceName:          'My Device',
  batteryCapacityWh:   50,
  pollIntervalSeconds: 300,
  co2GramsPerKwh:      233,
};

/**
 * Return all settings merged with defaults.
 * @returns {Promise<object>}
 */
async function getSettings() {
  const { rows } = await pool.query('SELECT key, value FROM device_settings');
  const stored = {};
  for (const { key, value } of rows) {
    // Numeric fields are stored as text; coerce back to number.
    stored[key] = isNaN(value) ? value : Number(value);
  }
  return { ...DEFAULTS, ...stored };
}

/**
 * Upsert settings object.  Only known keys are persisted.
 * @param {object} settings
 */
async function saveSettings(settings) {
  const allowed = Object.keys(DEFAULTS);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const key of allowed) {
      if (settings[key] === undefined) continue;
      await client.query(
        `INSERT INTO device_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, String(settings[key])],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getSettings, saveSettings, DEFAULTS };
