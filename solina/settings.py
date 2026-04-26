"""Settings management for Solina.

Settings are stored as JSON in ``~/.solina/settings.json``.
Missing keys are transparently filled from :data:`DEFAULTS`.
"""

from __future__ import annotations

import json
from pathlib import Path

_SETTINGS_PATH: Path = Path.home() / ".solina" / "settings.json"

DEFAULTS: dict = {
    "battery_capacity_wh": 50.0,   # Wh – configure to match your device
    "poll_interval_seconds": 300,  # 5 minutes between readings
    "device_name": "My Device",
    "co2_grams_per_kwh": 233.0,    # EU average grid intensity (g CO₂/kWh, 2023)
}


def load() -> dict:
    """Load settings from disk, filling missing keys from :data:`DEFAULTS`."""
    if _SETTINGS_PATH.exists():
        try:
            with open(_SETTINGS_PATH, encoding="utf-8") as fh:
                stored = json.load(fh)
            return {**DEFAULTS, **stored}
        except (json.JSONDecodeError, OSError):
            pass
    return dict(DEFAULTS)


def save(settings: dict) -> None:
    """Persist *settings* to ``~/.solina/settings.json``."""
    _SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_SETTINGS_PATH, "w", encoding="utf-8") as fh:
        json.dump(settings, fh, indent=2)
