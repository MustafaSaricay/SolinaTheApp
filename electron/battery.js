/**
 * battery.js – Wraps systeminformation to get battery data cross-platform.
 */

const si = require('systeminformation');

/**
 * Returns battery info or null if none is detected.
 * @returns {Promise<{percent: number, isPlugged: boolean, secondsLeft: number|null}|null>}
 */
async function getBatteryInfo() {
  try {
    const batt = await si.battery();
    if (!batt || !batt.hasBattery) return null;
    return {
      percent: Math.round(batt.percent * 10) / 10,
      isPlugged: !!batt.acConnected,
      secondsLeft:
        !batt.acConnected && batt.timeRemaining && batt.timeRemaining > 0
          ? batt.timeRemaining * 60  // systeminformation returns minutes
          : null,
    };
  } catch {
    return null;
  }
}

module.exports = { getBatteryInfo };
