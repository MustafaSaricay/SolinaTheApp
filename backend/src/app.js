/**
 * src/app.js — Express application factory.
 *
 * Does NOT call app.listen() — that lives in server.js so tests can import
 * the app without binding to a port.
 */

'use strict';

const express  = require('express');
const cors     = require('cors');

// Route modules
const readingsRouter   = require('./routes/readings');
const batteryRouter    = require('./routes/battery');
const settingsRouter   = require('./routes/settings');
const monitoringRouter = require('./routes/monitoring');
const eventsRouter     = require('./routes/events');

function createApp() {
  const app = express();

  // ── Middleware ──────────────────────────────────────────────────────────────
  const origin = process.env.CORS_ORIGIN || '*';
  app.use(cors({ origin }));
  app.use(express.json());

  // ── Routes ──────────────────────────────────────────────────────────────────
  app.use('/api/readings',   readingsRouter);
  app.use('/api/battery',    batteryRouter);
  app.use('/api/settings',   settingsRouter);
  app.use('/api/monitoring', monitoringRouter);
  app.use('/api/events',     eventsRouter);

  // ── Health check ────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // ── 404 ─────────────────────────────────────────────────────────────────────
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  // ── Error handler ───────────────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // Body-parser JSON syntax errors → 400
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON in request body.' });
    }
    console.error('[app] Unhandled error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
