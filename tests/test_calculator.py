"""Unit tests for solina.calculator."""

import pytest
from solina.calculator import (
    calculate_energy_delta_wh,
    estimate_co2_grams,
    format_kwh,
    format_wh,
)


CAPACITY = 50.0  # Wh – typical laptop battery for all tests


class TestCalculateEnergyDeltaWh:
    # ── Discharge scenarios ────────────────────────────────────────────────

    def test_discharge_full_drain(self):
        """100% → 0% on a 50 Wh battery = 50 Wh used."""
        result = calculate_energy_delta_wh(100.0, 0.0, CAPACITY, False, False)
        assert result == pytest.approx(50.0)

    def test_discharge_partial(self):
        """80% → 60% = 20% of 50 Wh = 10 Wh."""
        result = calculate_energy_delta_wh(80.0, 60.0, CAPACITY, False, False)
        assert result == pytest.approx(10.0)

    def test_discharge_no_change(self):
        """Same percentage → 0 Wh."""
        assert calculate_energy_delta_wh(75.0, 75.0, CAPACITY, False, False) == 0.0

    def test_discharge_battery_level_rises_while_unplugged(self):
        """Level can't meaningfully rise while unplugged – return 0."""
        assert calculate_energy_delta_wh(40.0, 50.0, CAPACITY, False, False) == 0.0

    # ── Charge scenarios ───────────────────────────────────────────────────

    def test_charge_partial(self):
        """50% → 70% plugged in = 10 Wh stored / 0.85 ≈ 11.76 Wh from grid."""
        result = calculate_energy_delta_wh(50.0, 70.0, CAPACITY, True, True)
        expected = (20.0 / 100.0 * CAPACITY) / 0.85
        assert result == pytest.approx(expected, rel=1e-6)

    def test_charge_no_change(self):
        """Battery full and plugged in → 0 Wh."""
        assert calculate_energy_delta_wh(100.0, 100.0, CAPACITY, True, True) == 0.0

    def test_charge_level_drops_while_plugged(self):
        """Level can drop while plugged in (e.g. heavy load) – skip ambiguous reading."""
        assert calculate_energy_delta_wh(70.0, 60.0, CAPACITY, True, True) == 0.0

    # ── Plug-state-change scenarios ────────────────────────────────────────

    def test_plug_state_changed_returns_zero(self):
        """If plug state changed between readings the delta is ambiguous → 0."""
        assert calculate_energy_delta_wh(80.0, 60.0, CAPACITY, False, True) == 0.0
        assert calculate_energy_delta_wh(60.0, 80.0, CAPACITY, True, False) == 0.0

    # ── Edge cases ─────────────────────────────────────────────────────────

    def test_zero_capacity_returns_zero(self):
        assert calculate_energy_delta_wh(80.0, 60.0, 0.0, False, False) == 0.0

    def test_negative_capacity_returns_zero(self):
        assert calculate_energy_delta_wh(80.0, 60.0, -10.0, False, False) == 0.0


class TestEstimateCo2Grams:
    def test_zero_kwh(self):
        assert estimate_co2_grams(0.0) == 0.0

    def test_one_kwh_default_intensity(self):
        assert estimate_co2_grams(1.0) == pytest.approx(233.0)

    def test_custom_intensity(self):
        assert estimate_co2_grams(2.0, grams_per_kwh=100.0) == pytest.approx(200.0)

    def test_negative_kwh_clamped_to_zero(self):
        assert estimate_co2_grams(-1.0) == 0.0


class TestFormatKwh:
    def test_zero(self):
        assert format_kwh(0.0) == "0.000 kWh"

    def test_small_value(self):
        assert format_kwh(0.025) == "0.025 kWh"

    def test_large_value(self):
        assert format_kwh(1.5) == "1.500 kWh"


class TestFormatWh:
    def test_small_value_milliwatt_hours(self):
        assert format_wh(0.5) == "500.0 mWh"

    def test_one_wh(self):
        assert format_wh(1.0) == "1.00 Wh"

    def test_larger_value(self):
        assert format_wh(25.5) == "25.50 Wh"
