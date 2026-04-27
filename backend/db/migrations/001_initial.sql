-- 001_initial.sql
-- Creates the core tables required by the Solina backend.

CREATE TABLE IF NOT EXISTS device_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS battery_readings (
  id               BIGSERIAL    PRIMARY KEY,
  timestamp        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  battery_percent  REAL         NOT NULL,
  is_plugged       BOOLEAN      NOT NULL,
  energy_delta_wh  REAL         NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_br_ts ON battery_readings (timestamp DESC);

-- Seed default settings (upsert so re-running is safe)
INSERT INTO device_settings (key, value) VALUES
  ('deviceName',         'My Device'),
  ('batteryCapacityWh',  '50'),
  ('pollIntervalSeconds','300'),
  ('co2GramsPerKwh',     '233')
ON CONFLICT (key) DO NOTHING;
