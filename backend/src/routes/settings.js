/**
 * routes/settings.js — Device settings endpoints.
 *
 * GET  /api/settings
 * PUT  /api/settings
 */

'use strict';

const { Router }  = require('express');
const db          = require('../db/settings');

const router = Router();

// GET /api/settings
router.get('/', async (req, res, next) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings
router.put('/', async (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }
    await db.saveSettings(body);
    const updated = await db.getSettings();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
