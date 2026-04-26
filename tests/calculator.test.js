/**
 * tests/calculator.test.js – Unit tests for electron/calculator.js
 */

const { calculateEnergyDeltaWh, estimateCo2Grams, CHARGING_EFFICIENCY } = require('../electron/calculator');

const CAPACITY = 50; // Wh

describe('calculateEnergyDeltaWh', () => {
  // ── Discharge ────────────────────────────────────────────────────────────
  test('full discharge 100→0 returns full capacity', () => {
    expect(calculateEnergyDeltaWh(100, 0, CAPACITY, false, false)).toBeCloseTo(50);
  });

  test('partial discharge 80→60 returns 10 Wh', () => {
    expect(calculateEnergyDeltaWh(80, 60, CAPACITY, false, false)).toBeCloseTo(10);
  });

  test('no change while unplugged returns 0', () => {
    expect(calculateEnergyDeltaWh(75, 75, CAPACITY, false, false)).toBe(0);
  });

  test('level rises while unplugged returns 0', () => {
    expect(calculateEnergyDeltaWh(40, 50, CAPACITY, false, false)).toBe(0);
  });

  // ── Charge ───────────────────────────────────────────────────────────────
  test('charge 50→70 accounts for charging efficiency', () => {
    const chargeStored = (20 / 100) * CAPACITY;
    expect(calculateEnergyDeltaWh(50, 70, CAPACITY, true, true))
      .toBeCloseTo(chargeStored / CHARGING_EFFICIENCY);
  });

  test('no change while plugged returns 0', () => {
    expect(calculateEnergyDeltaWh(100, 100, CAPACITY, true, true)).toBe(0);
  });

  test('level drops while plugged returns 0', () => {
    expect(calculateEnergyDeltaWh(70, 60, CAPACITY, true, true)).toBe(0);
  });

  // ── Plug-state change ─────────────────────────────────────────────────────
  test('plug state changed: was unplugged, now plugged → 0', () => {
    expect(calculateEnergyDeltaWh(80, 60, CAPACITY, false, true)).toBe(0);
  });

  test('plug state changed: was plugged, now unplugged → 0', () => {
    expect(calculateEnergyDeltaWh(60, 80, CAPACITY, true, false)).toBe(0);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────
  test('zero capacity returns 0', () => {
    expect(calculateEnergyDeltaWh(80, 60, 0, false, false)).toBe(0);
  });

  test('negative capacity returns 0', () => {
    expect(calculateEnergyDeltaWh(80, 60, -10, false, false)).toBe(0);
  });
});

describe('estimateCo2Grams', () => {
  test('zero kWh → 0 g', () => {
    expect(estimateCo2Grams(0)).toBe(0);
  });

  test('1 kWh at default intensity (233) → 233 g', () => {
    expect(estimateCo2Grams(1)).toBeCloseTo(233);
  });

  test('custom intensity', () => {
    expect(estimateCo2Grams(2, 100)).toBeCloseTo(200);
  });

  test('negative kWh clamped to 0', () => {
    expect(estimateCo2Grams(-1)).toBe(0);
  });
});
