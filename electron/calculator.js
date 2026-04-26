/**
 * calculator.js – Pure energy/CO₂ calculation functions.
 * No I/O – fully unit-testable without Electron.
 */

const CHARGING_EFFICIENCY = 0.85; // typical Li-ion round-trip efficiency

/**
 * Calculate the energy delta in Wh between two consecutive battery readings.
 *
 * @param {number} prevPercent     Battery % at previous reading
 * @param {number} currPercent     Battery % at current reading
 * @param {number} capacityWh     Full-charge capacity in Wh
 * @param {boolean} wasPlugged    Whether device was plugged in at previous reading
 * @param {boolean} isPlugged     Whether device is plugged in now
 * @returns {number}              Energy delta in Wh (≥ 0)
 */
function calculateEnergyDeltaWh(prevPercent, currPercent, capacityWh, wasPlugged, isPlugged) {
  if (capacityWh <= 0) return 0;
  if (wasPlugged !== isPlugged) return 0; // plug state changed – ambiguous

  const deltaPct = prevPercent - currPercent; // positive → discharging

  if (!isPlugged && deltaPct > 0) {
    // Pure discharge
    return (deltaPct / 100) * capacityWh;
  }

  if (isPlugged && deltaPct < 0) {
    // Pure charge – account for charger efficiency
    const chargeStoredWh = ((-deltaPct) / 100) * capacityWh;
    return chargeStoredWh / CHARGING_EFFICIENCY;
  }

  return 0;
}

/**
 * Estimate CO₂ emissions in grams for a given kWh consumption.
 * @param {number} kwh
 * @param {number} [gramsPerKwh=233]  Grid intensity (default: EU 2023 average)
 * @returns {number}
 */
function estimateCo2Grams(kwh, gramsPerKwh = 233) {
  return Math.max(0, kwh * gramsPerKwh);
}

module.exports = { calculateEnergyDeltaWh, estimateCo2Grams, CHARGING_EFFICIENCY };
