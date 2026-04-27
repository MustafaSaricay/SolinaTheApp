-- schema.sql  (informational — run via migrations/)
-- Full schema for reference; individual migration files apply changes
-- incrementally.

-- Device settings (key/value)
CREATE TABLE IF NOT EXISTS device_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Battery readings
CREATE TABLE IF NOT EXISTS battery_readings (
  id               BIGSERIAL    PRIMARY KEY,
  timestamp        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  battery_percent  REAL         NOT NULL,
  is_plugged       BOOLEAN      NOT NULL,
  energy_delta_wh  REAL         NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_br_ts ON battery_readings (timestamp DESC);
