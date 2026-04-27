-- 002_timescale.sql  (optional — only run against a TimescaleDB instance)
-- Converts battery_readings into a hypertable partitioned by timestamp.
-- Safe to skip on plain PostgreSQL.

SELECT create_hypertable(
  'battery_readings',
  'timestamp',
  if_not_exists => TRUE
);
