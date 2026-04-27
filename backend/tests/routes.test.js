/**
 * tests/routes.test.js — Integration tests for all REST routes.
 *
 * Uses supertest against the Express app with mocked DB and monitor layers
 * so no real PostgreSQL connection is required during CI.
 */

'use strict';

const request = require('supertest');

// ── Mock the DB and monitor layers before requiring the app ───────────────────

jest.mock('../src/db/readings', () => ({
  getDailyKwh:        jest.fn(async () => 0.042),
  getHourlyBreakdown: jest.fn(async () => [{ hour: 9, kwh: 0.02 }, { hour: 10, kwh: 0.022 }]),
  getRecentReadings:  jest.fn(async () => [
    { id: 1, timestamp: '2024-06-01T10:00:00Z', batteryPercent: 80, isPlugged: false, energyDeltaWh: 5 },
  ]),
}));

jest.mock('../src/db/settings', () => ({
  getSettings:  jest.fn(async () => ({
    deviceName: 'Test Device', batteryCapacityWh: 50,
    pollIntervalSeconds: 300, co2GramsPerKwh: 233,
  })),
  saveSettings: jest.fn(async () => {}),
}));

jest.mock('../src/services/monitor', () => ({
  takeReading:      jest.fn(async () => ({ info: { percent: 75, isPlugged: false, secondsLeft: null }, energyDeltaWh: 3 })),
  schedulePoll:     jest.fn(),
  toggleMonitoring: jest.fn(() => ({ monitoring: false })),
  isMonitoring:     jest.fn(() => true),
  addClient:        jest.fn(),
  removeClient:     jest.fn(),
}));

// ── Import app after mocks are set up ─────────────────────────────────────────

const { createApp } = require('../src/app');
const app = createApp();

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  test('returns 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/readings/daily-kwh', () => {
  test('returns kwh value', async () => {
    const res = await request(app).get('/api/readings/daily-kwh');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kwh');
    expect(typeof res.body.kwh).toBe('number');
  });

  test('accepts optional date query param', async () => {
    const res = await request(app).get('/api/readings/daily-kwh?date=2024-06-01');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/readings/hourly-breakdown', () => {
  test('returns array of hourly points', async () => {
    const res = await request(app).get('/api/readings/hourly-breakdown');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('hour');
    expect(res.body[0]).toHaveProperty('kwh');
  });
});

describe('GET /api/readings/recent', () => {
  test('returns array of readings', async () => {
    const res = await request(app).get('/api/readings/recent');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('respects limit query param', async () => {
    const res = await request(app).get('/api/readings/recent?limit=5');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/battery/read-now', () => {
  test('returns info and energyDeltaWh', async () => {
    const res = await request(app).post('/api/battery/read-now');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('info');
    expect(res.body).toHaveProperty('energyDeltaWh');
  });
});

describe('GET /api/settings', () => {
  test('returns settings object', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('deviceName');
    expect(res.body).toHaveProperty('batteryCapacityWh');
    expect(res.body).toHaveProperty('pollIntervalSeconds');
    expect(res.body).toHaveProperty('co2GramsPerKwh');
  });
});

describe('PUT /api/settings', () => {
  test('saves and returns updated settings', async () => {
    const res = await request(app)
      .put('/api/settings')
      .send({ deviceName: 'Updated', batteryCapacityWh: 65 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('deviceName');
  });

  test('400 on non-object body', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Content-Type', 'application/json')
      .send('"invalid"');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/monitoring/toggle', () => {
  test('returns monitoring state', async () => {
    const res = await request(app).post('/api/monitoring/toggle');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('monitoring');
    expect(typeof res.body.monitoring).toBe('boolean');
  });
});

describe('GET /api/monitoring/status', () => {
  test('returns monitoring boolean', async () => {
    const res = await request(app).get('/api/monitoring/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('monitoring');
  });
});

describe('404 handler', () => {
  test('unknown route returns 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
