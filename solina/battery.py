"""Battery information retrieval via psutil.

If psutil is not installed or no battery is present the functions degrade
gracefully instead of raising exceptions.
"""

from __future__ import annotations

from typing import Optional

try:
    import psutil as _psutil

    _PSUTIL_OK = True
except ImportError:  # pragma: no cover
    _PSUTIL_OK = False


def get_battery_info() -> Optional[dict]:
    """Return current battery data, or *None* if none is available.

    Returned dict keys
    ------------------
    percent      : float  – current charge level 0–100
    is_plugged   : bool   – True when connected to mains power
    seconds_left : int|None – estimated seconds until empty (None when charging
                              or information is unavailable)
    """
    if not _PSUTIL_OK:
        return None
    try:
        batt = _psutil.sensors_battery()
    except Exception:
        return None
    if batt is None:
        return None
    seconds_left: Optional[int] = None
    if not batt.power_plugged and batt.secsleft not in (
        _psutil.POWER_TIME_UNKNOWN,
        _psutil.POWER_TIME_UNLIMITED,
        -1,
        -2,
    ):
        seconds_left = max(0, int(batt.secsleft))
    return {
        "percent": round(float(batt.percent), 1),
        "is_plugged": bool(batt.power_plugged),
        "seconds_left": seconds_left,
    }


def is_available() -> bool:
    """Return ``True`` if battery monitoring is possible on this machine."""
    return get_battery_info() is not None
