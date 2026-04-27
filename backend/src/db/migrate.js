/**
 * db/migrate.js — Runs numbered SQL migration files in order.
 *
 * Keeps a migrations table to track which files have already been applied.
 * Safe to call on every startup.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const pool = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'db', 'migrations');

async function migrate() {
  const client = await pool.connect();
  try {
    // Create tracking table if absent
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query(
      'SELECT filename FROM _migrations ORDER BY filename',
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;

      // 002_timescale.sql is optional — skip if TimescaleDB isn't available
      if (file.includes('timescale')) {
        try {
          const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
          await client.query(sql);
          await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
          console.log(`[migrate] Applied ${file}`);
        } catch (err) {
          console.warn(`[migrate] Skipped ${file} (TimescaleDB not available): ${err.message}`);
        }
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`[migrate] Applied ${file}`);
    }
  } finally {
    client.release();
  }
}

module.exports = { migrate };
