-- Postgres-level grants for the app's service principal (Lakebase permissions are separate from UC).
-- Run after the app is deployed (the platform creates the SP's Postgres role):
--   databricks psql --project pressure-gauge-reader -- -d databricks_postgres -v app_sp=<SP_CLIENT_ID> -f src/lakebase/02_app_grants.sql

-- Read the synced (read-only) serving copy of the gold table.
GRANT USAGE  ON SCHEMA pressure_gauge TO :"app_sp";
GRANT SELECT ON pressure_gauge.gauge_readings_serving TO :"app_sp";

-- Append reviewer decisions; no UPDATE / DELETE, so the review history can't be rewritten from the app.
GRANT USAGE          ON SCHEMA review TO :"app_sp";
GRANT SELECT, INSERT ON review.reading_overrides TO :"app_sp";
GRANT USAGE          ON ALL SEQUENCES IN SCHEMA review TO :"app_sp";
