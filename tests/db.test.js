/**
 * tests/db.test.js – Unit tests for electron/db.js (sql.js backend)
 */

const path = require('path');
const os   = require('os');
const fs   = require('fs');

let db;
let tmpDir;

beforeEach(async () => {
  jest.resetModules();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solina-test-'));
  db = require('../electron/db');
  await db.init(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('insertReading / getLastReading', () => {
  test('inserts a reading and retrieves it', () => {
    db.insertReading('2024-06-01T10:00:00.000Z', 75.0, false, 5.0);
    const row = db.getLastReading();
    expect(row).not.toBeNull();
    expect(row.batteryPercent).toBeCloseTo(75.0);
    expect(row.isPlugged).toBe(0);
    expect(row.energyDeltaWh).toBeCloseTo(5.0);
  });

  test('returns null when table is empty', () => {
    expect(db.getLastReading()).toBeNull();
  });
});

describe('getRecentReadings', () => {
  test('returns newest first', () => {
    db.insertReading('2024-06-01T08:00:00.000Z', 90.0, false, 0);
    db.insertReading('2024-06-01T09:00:00.000Z', 88.0, false, 1);
    db.insertReading('2024-06-01T10:00:00.000Z', 86.0, false, 2);
    const rows = db.getRecentReadings(10);
    expect(rows.length).toBe(3);
    expect(rows[0].batteryPercent).toBeCloseTo(86.0); // newest first
  });

  test('respects the limit', () => {
    for (let h = 0; h < 10; h++) {
      db.insertReading(`2024-06-01T${String(h).padStart(2,'0')}:00:00.000Z`, 80, false, 1);
    }
    expect(db.getRecentReadings(5).length).toBe(5);
  });
});

describe('getDailyKwh', () => {
  test('single reading: 10 Wh → 0.01 kWh', () => {
    db.insertReading('2024-06-01T10:00:00.000Z', 80, false, 10);
    expect(db.getDailyKwh('2024-06-01')).toBeCloseTo(0.01);
  });

  test('sums multiple readings for the same day', () => {
    db.insertReading('2024-06-01T08:00:00.000Z', 90, false, 100);
    db.insertReading('2024-06-01T09:00:00.000Z', 85, false, 100);
    db.insertReading('2024-06-01T10:00:00.000Z', 80, false, 100);
    expect(db.getDailyKwh('2024-06-01')).toBeCloseTo(0.3);
  });

  test('isolates readings from different days', () => {
    db.insertReading('2024-06-01T10:00:00.000Z', 80, false, 200);
    db.insertReading('2024-06-02T10:00:00.000Z', 80, false, 50);
    expect(db.getDailyKwh('2024-06-01')).toBeCloseTo(0.2);
    expect(db.getDailyKwh('2024-06-02')).toBeCloseTo(0.05);
  });

  test('returns 0 for a day with no data', () => {
    expect(db.getDailyKwh('2099-01-01')).toBe(0);
  });
});

describe('getHourlyBreakdown', () => {
  test('groups readings by hour', () => {
    db.insertReading('2024-06-01T08:00:00.000Z', 80, false, 100);
    db.insertReading('2024-06-01T09:30:00.000Z', 78, false, 200);
    const breakdown = db.getHourlyBreakdown('2024-06-01');
    const map = Object.fromEntries(breakdown.map(r => [r.hour, r.kwh]));
    expect(map[8]).toBeCloseTo(0.1);
    expect(map[9]).toBeCloseTo(0.2);
  });

  test('returns empty array for a day with no data', () => {
    expect(db.getHourlyBreakdown('2099-01-01')).toEqual([]);
  });
});
