"""Unit tests for solina.database."""

import tempfile
from datetime import date, datetime
from pathlib import Path

import pytest

from solina.database import Database


@pytest.fixture()
def db(tmp_path: Path) -> Database:
    """Return a fresh in-memory-ish database in a temp directory."""
    database = Database(db_path=tmp_path / "test.db")
    yield database
    database.close()


def _insert(db: Database, ts: datetime, pct: float, plugged: bool, wh: float) -> None:
    db.insert_reading(ts, pct, plugged, wh)


class TestInsertAndRetrieve:
    def test_insert_and_get_last_reading(self, db: Database):
        ts = datetime(2024, 6, 1, 10, 0, 0)
        _insert(db, ts, 75.0, False, 5.0)
        row = db.get_last_reading()
        assert row is not None
        assert row["battery_percent"] == pytest.approx(75.0)
        assert row["is_plugged"] == 0
        assert row["energy_delta_wh"] == pytest.approx(5.0)

    def test_empty_db_returns_none(self, db: Database):
        assert db.get_last_reading() is None

    def test_get_recent_readings_newest_first(self, db: Database):
        for i, hour in enumerate([8, 9, 10]):
            _insert(db, datetime(2024, 6, 1, hour, 0, 0), 90.0 - i, False, float(i))
        rows = db.get_recent_readings(limit=10)
        assert len(rows) == 3
        assert rows[0]["battery_percent"] == pytest.approx(88.0)  # 10:00 first

    def test_recent_readings_respects_limit(self, db: Database):
        for hour in range(10):
            _insert(db, datetime(2024, 6, 1, hour, 0, 0), 80.0, False, 1.0)
        assert len(db.get_recent_readings(limit=5)) == 5


class TestGetDailyKwh:
    def test_single_reading_discharge(self, db: Database):
        _insert(db, datetime(2024, 6, 1, 10, 0), 80.0, False, 10.0)
        kwh = db.get_daily_kwh(for_date=date(2024, 6, 1))
        assert kwh == pytest.approx(0.01)  # 10 Wh = 0.010 kWh

    def test_multiple_readings_same_day_sum(self, db: Database):
        for hour in range(3):
            _insert(db, datetime(2024, 6, 1, hour, 0), 80.0, False, 100.0)
        kwh = db.get_daily_kwh(for_date=date(2024, 6, 1))
        assert kwh == pytest.approx(0.3)  # 300 Wh = 0.3 kWh

    def test_different_days_are_isolated(self, db: Database):
        _insert(db, datetime(2024, 6, 1, 10, 0), 80.0, False, 200.0)
        _insert(db, datetime(2024, 6, 2, 10, 0), 80.0, False, 50.0)
        assert db.get_daily_kwh(for_date=date(2024, 6, 1)) == pytest.approx(0.2)
        assert db.get_daily_kwh(for_date=date(2024, 6, 2)) == pytest.approx(0.05)

    def test_empty_db_returns_zero(self, db: Database):
        assert db.get_daily_kwh(for_date=date(2024, 6, 1)) == pytest.approx(0.0)


class TestGetHourlyBreakdown:
    def test_returns_correct_hours(self, db: Database):
        _insert(db, datetime(2024, 6, 1, 8, 0), 80.0, False, 100.0)
        _insert(db, datetime(2024, 6, 1, 9, 0), 80.0, False, 200.0)
        breakdown = db.get_hourly_breakdown(for_date=date(2024, 6, 1))
        hours = {row["hour"]: row["kwh"] for row in breakdown}
        assert hours[8] == pytest.approx(0.1)
        assert hours[9] == pytest.approx(0.2)

    def test_empty_for_other_date(self, db: Database):
        _insert(db, datetime(2024, 6, 1, 8, 0), 80.0, False, 100.0)
        assert db.get_hourly_breakdown(for_date=date(2024, 6, 2)) == []
