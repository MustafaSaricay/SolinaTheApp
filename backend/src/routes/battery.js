/**
 * routes/battery.js — Battery control endpoints.
 *
 * POST /api/battery/read-now
 */

'use strict';

const { Router }  = require('express');
const monitor     = require('../services/monitor');

const router = Router();

// POST /api/battery/read-now
router.post('/read-now', async (req, res, next) => {
  try {
    const result = await monitor.takeReading();
    monitor.schedulePoll(); // reset timer after manual read
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
