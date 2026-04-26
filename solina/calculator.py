"""Energy consumption calculations for Solina.

All public functions are pure (no I/O) so they are easy to unit-test.
"""

from __future__ import annotations

_CHARGING_EFFICIENCY: float = 0.85  # typical Li-ion charger round-trip efficiency


def calculate_energy_delta_wh(
    prev_percent: float,
    curr_percent: float,
    battery_capacity_wh: float,
    was_plugged: bool,
    is_plugged: bool,
) -> float:
    """Return the energy delta in **Wh** between two consecutive readings.

    Discharge scenario (both readings unplugged, level drops):
        ``delta = capacity × Δ% / 100``

    Charge scenario (both readings plugged in, level rises):
        The charger draws more from the grid than what gets stored,
        so the charging efficiency is factored in:
        ``delta = capacity × Δ% / 100 / efficiency``

    If the plug state changed between readings the result is ambiguous
    and ``0.0`` is returned to avoid inflating totals.

    Parameters
    ----------
    prev_percent:
        Battery percentage at the *previous* reading.
    curr_percent:
        Battery percentage at the *current* reading.
    battery_capacity_wh:
        Full-charge capacity of the battery in Watt-hours.
    was_plugged:
        Whether the device was plugged in at the *previous* reading.
    is_plugged:
        Whether the device is plugged in at the *current* reading.

    Returns
    -------
    float
        Energy delta in Wh (always ≥ 0).
    """
    if battery_capacity_wh <= 0:
        return 0.0
    if was_plugged != is_plugged:
        # Plug state changed mid-interval – skip to avoid incorrect deltas
        return 0.0

    delta_pct = prev_percent - curr_percent  # positive → discharging

    if not is_plugged and delta_pct > 0:
        # Pure discharge
        return delta_pct / 100.0 * battery_capacity_wh

    if is_plugged and delta_pct < 0:
        # Pure charge; curr_percent > prev_percent → delta_pct is negative
        charge_stored_wh = (-delta_pct) / 100.0 * battery_capacity_wh
        return charge_stored_wh / _CHARGING_EFFICIENCY

    return 0.0


def format_kwh(kwh: float) -> str:
    """Return *kwh* formatted as a three-decimal kWh string."""
    return f"{kwh:.3f} kWh"


def format_wh(wh: float) -> str:
    """Return *wh* formatted sensibly (mWh for small values)."""
    if wh < 1.0:
        return f"{wh * 1000:.1f} mWh"
    return f"{wh:.2f} Wh"


def estimate_co2_grams(kwh: float, grams_per_kwh: float = 233.0) -> float:
    """Return estimated CO₂ emissions in grams for *kwh* kWh consumed.

    The default grid intensity of 233 g/kWh is the 2023 EU average.
    Users can override this in the app settings.
    """
    return max(0.0, kwh * grams_per_kwh)
