"""SQLite persistence layer for Solina.

All battery readings are stored in ``~/.solina/solina.db`` by default.
"""

from __future__ import annotations

import sqlite3
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional

_DEFAULT_PATH: Path = Path.home() / ".solina" / "solina.db"

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS battery_readings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp        TEXT    NOT NULL,
    battery_percent  REAL    NOT NULL,
    is_plugged       INTEGER NOT NULL,
    energy_delta_wh  REAL    NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_br_timestamp
    ON battery_readings (timestamp);
"""


class Database:
    """Thin wrapper around an SQLite database used to store battery readings."""

    def __init__(self, db_path: Optional[Path] = None) -> None:
        self.db_path: Path = Path(db_path) if db_path is not None else _DEFAULT_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    # ── Schema ────────────────────────────────────────────────────────────────

    def _init_schema(self) -> None:
        with self._conn:
            self._conn.executescript(_SCHEMA_SQL)

    # ── Writes ────────────────────────────────────────────────────────────────

    def insert_reading(
        self,
        timestamp: datetime,
        battery_percent: float,
        is_plugged: bool,
        energy_delta_wh: float,
    ) -> None:
        """Insert a single battery reading into the database."""
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO battery_readings
                    (timestamp, battery_percent, is_plugged, energy_delta_wh)
                VALUES (?, ?, ?, ?)
                """,
                (
                    timestamp.isoformat(),
                    float(battery_percent),
                    int(is_plugged),
                    float(energy_delta_wh),
                ),
            )

    # ── Reads ─────────────────────────────────────────────────────────────────

    def get_daily_kwh(self, for_date: Optional[date] = None) -> float:
        """Return total energy (kWh) recorded on *for_date* (default: today)."""
        target = (for_date or date.today()).isoformat()
        row = self._conn.execute(
            "SELECT COALESCE(SUM(energy_delta_wh), 0.0) FROM battery_readings "
            "WHERE DATE(timestamp) = ?",
            (target,),
        ).fetchone()
        return (row[0] or 0.0) / 1000.0

    def get_hourly_breakdown(self, for_date: Optional[date] = None) -> List[dict]:
        """Return ``[{hour, kwh}, ...]`` for each hour that has data on *for_date*."""
        target = (for_date or date.today()).isoformat()
        rows = self._conn.execute(
            """
            SELECT CAST(strftime('%H', timestamp) AS INTEGER) AS hour,
                   SUM(energy_delta_wh) AS wh
            FROM   battery_readings
            WHERE  DATE(timestamp) = ?
            GROUP  BY hour
            ORDER  BY hour
            """,
            (target,),
        ).fetchall()
        return [{"hour": r["hour"], "kwh": r["wh"] / 1000.0} for r in rows]

    def get_last_reading(self) -> Optional[dict]:
        """Return the most recent reading as a dict, or *None* if empty."""
        row = self._conn.execute(
            "SELECT * FROM battery_readings ORDER BY timestamp DESC LIMIT 1"
        ).fetchone()
        return dict(row) if row is not None else None

    def get_recent_readings(self, limit: int = 24) -> List[dict]:
        """Return the *limit* most recent readings, newest first."""
        rows = self._conn.execute(
            "SELECT * FROM battery_readings ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def close(self) -> None:
        """Close the underlying SQLite connection."""
        self._conn.close()
