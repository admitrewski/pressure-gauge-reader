# Lakebase: operational serving and write-back

1. **Synced table** (UC → Lakebase, **Snapshot**, DECISIONS D16/D17): `gold_gauge_readings_final` → `pressure_gauge.gauge_readings_serving` (read-only in Postgres), refreshed by the job after each pipeline run.
2. **Native review table** (`01_review_schema.sql`), with app grants in `02_app_grants.sql`: `review.reading_overrides (override_id, image_id, human_value, override_reason, reviewed_by, reviewed_at)`, append-only, `REPLICA IDENTITY FULL`.
3. **Lakehouse Sync** (Lakebase → UC, CDC, Beta) on the `review` schema → `lb_reading_overrides_history` (SCD2), which the gold MV reads.

The app reads `COALESCE(latest override, synced ai_value)` so reviewers see their change immediately; gold catches up on the next pipeline run.

Prerequisites: Postgres 17; tables in `databricks_postgres`; destination catalog without default storage. Fallback if Lakehouse Sync isn't available: a scheduled MERGE from the Lakebase catalog registered in UC (see DECISIONS D4).

## Commands used (project `pressure-gauge-reader`, Postgres 17)
```bash
databricks postgres create-project pressure-gauge-reader --json '{"spec": {"display_name": "Pressure Gauge Reader", "pg_version": 17}}'
databricks psql --project pressure-gauge-reader -- -d databricks_postgres -f src/lakebase/01_review_schema.sql
databricks postgres create-cdf-config projects/pressure-gauge-reader/branches/production/databases/databricks-postgres \
  serverless_stable_kx6lwb_catalog pressure_gauge review --cdf-config-id review_overrides
databricks postgres create-synced-table serverless_stable_kx6lwb_catalog.pressure_gauge.gauge_readings_serving --json @synced_table.json
databricks postgres create-synced-table serverless_stable_kx6lwb_catalog.pressure_gauge.vlm_usage_serving --json @synced_usage_table.json
databricks psql --project pressure-gauge-reader -- -d databricks_postgres -v app_sp=<SP_CLIENT_ID> -f src/lakebase/02_app_grants.sql
```
