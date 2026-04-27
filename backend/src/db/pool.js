/**
 * db/pool.js — Shared pg.Pool configured from DATABASE_URL.
 *
 * Import this module (not pg directly) everywhere database access is needed
 * so the pool is created exactly once.
 */

'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep SSL flexible: accept a boolean or a proper ssl object via env.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

module.exports = pool;
