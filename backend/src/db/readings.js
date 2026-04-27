/**
 * db/readings.js — Battery readings persistence layer (PostgreSQL).
 *
 * Mirrors the public API of electron/db.js so the business logic
 * (monitor.js) can call the same functions without change.
 */

'use strict';

const pool = require('./pool');

/**
 * Insert one battery reading.
 *
 * @param {string}  timestamp     ISO-8601 string
 * @param {number}  batteryPercent
 * @param {boolean} isPlugged
 * @param {number}  energyDeltaWh
 */
async function insertReading(timestamp, batteryPercent, isPlugged, energyDeltaWh) {
  await pool.query(
    `INSERT INTO battery_readings (timestamp, battery_percent, is_plugged, energy_delta_wh)
     VALUES ($1, $2, $3, $4)`,
    [timestamp, batteryPercent, isPlugged, energyDeltaWh],
  );
}

/**
 * Total energy consumed on isoDate (default: today) in kWh.
 *
 * @param {string} [isoDate]  e.g. '2024-06-01'
 * @returns {Promise<number>}
 */
async function getDailyKwh(isoDate) {
  const date = isoDate || new Date().toISOString().slice(0, 10);
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(energy_delta_wh), 0) AS total
     FROM battery_readings
     WHERE timestamp::date = $1`,
    [date],
  );
  return Number(rows[0].total) / 1000;
}

/**
 * Hourly breakdown of energy for a given day.
 *
 * @param {string} [isoDate]
 * @returns {Promise<Array<{hour: number, kwh: number}>>}
 */
async function getHourlyBreakdown(isoDate) {
  const date = isoDate || new Date().toISOString().slice(0, 10);
  const { rows } = await pool.query(
    `SELECT EXTRACT(HOUR FROM timestamp)::int AS hour,
            SUM(energy_delta_wh) AS wh
     FROM battery_readings
     WHERE timestamp::date = $1
     GROUP BY hour
     ORDER BY hour`,
    [date],
  );
  return rows.map((r) => ({ hour: Number(r.hour), kwh: Number(r.wh) / 1000 }));
}

/**
 * The most recent reading, or null.
 *
 * @returns {Promise<object|null>}
 */
async function getLastReading() {
  const { rows } = await pool.query(
    `SELECT id,
            timestamp,
            battery_percent  AS "batteryPercent",
            is_plugged       AS "isPlugged",
            energy_delta_wh  AS "energyDeltaWh"
     FROM battery_readings
     ORDER BY timestamp DESC
     LIMIT 1`,
  );
  return rows[0] || null;
}

/**
 * The N most recent readings, newest first.
 *
 * @param {number} [limit=24]
 * @returns {Promise<object[]>}
 */
async function getRecentReadings(limit = 24) {
  const { rows } = await pool.query(
    `SELECT id,
            timestamp,
            battery_percent  AS "batteryPercent",
            is_plugged       AS "isPlugged",
            energy_delta_wh  AS "energyDeltaWh"
     FROM battery_readings
     ORDER BY timestamp DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

module.exports = {
  insertReading,
  getDailyKwh,
  getHourlyBreakdown,
  getLastReading,
  getRecentReadings,
};
