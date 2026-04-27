/**
 * routes/events.js — Server-Sent Events endpoint.
 *
 * GET /api/events
 *
 * Clients receive two event types:
 *   • reading:taken    — emitted whenever a battery reading is stored
 *   • monitoring:status — emitted when monitoring is paused/resumed
 */

'use strict';

const { Router }  = require('express');
const monitor     = require('../services/monitor');

const router = Router();

router.get('/', (req, res) => {
  // SSE headers
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  // Send a comment ping every 25 s to keep the connection alive through proxies
  const pingInterval = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* client gone */ }
  }, 25_000);

  // Register this client with the monitor so it receives broadcasts
  monitor.addClient(res);

  // Send current monitoring state immediately so the client can initialise
  res.write(`event: monitoring:status\ndata: ${JSON.stringify({ monitoring: monitor.isMonitoring() })}\n\n`);

  req.on('close', () => {
    clearInterval(pingInterval);
    monitor.removeClient(res);
  });
});

module.exports = router;
