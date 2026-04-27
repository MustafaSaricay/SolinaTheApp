/**
 * routes/readings.js — Battery readings endpoints.
 *
 * GET /api/readings/daily-kwh
 * GET /api/readings/hourly-breakdown
 * GET /api/readings/recent
 */

'use strict';

const { Router } = require('express');
const db = require('../db/readings');

const router = Router();

// GET /api/readings/daily-kwh?date=YYYY-MM-DD
router.get('/daily-kwh', async (req, res, next) => {
  try {
    const kwh = await db.getDailyKwh(req.query.date || undefined);
    res.json({ kwh });
  } catch (err) {
    next(err);
  }
});

// GET /api/readings/hourly-breakdown?date=YYYY-MM-DD
router.get('/hourly-breakdown', async (req, res, next) => {
  try {
    const breakdown = await db.getHourlyBreakdown(req.query.date || undefined);
    res.json(breakdown);
  } catch (err) {
    next(err);
  }
});

// GET /api/readings/recent?limit=20
router.get('/recent', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 200);
    const rows  = await db.getRecentReadings(limit);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
