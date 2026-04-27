/**
 * routes/monitoring.js — Monitoring control endpoints.
 *
 * POST /api/monitoring/toggle
 * GET  /api/monitoring/status
 */

'use strict';

const { Router }  = require('express');
const monitor     = require('../services/monitor');

const router = Router();

// POST /api/monitoring/toggle
router.post('/toggle', (req, res) => {
  const result = monitor.toggleMonitoring();
  res.json(result);
});

// GET /api/monitoring/status
router.get('/status', (req, res) => {
  res.json({ monitoring: monitor.isMonitoring() });
});

module.exports = router;
