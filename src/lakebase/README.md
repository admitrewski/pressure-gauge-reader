# Lakebase: operational serving and write-back

1. **Synced table** (UC → Lakebase, Triggered): `gold_gauge_readings_final` → `serving.gauge_readings` (read-only in Postgres).
2. **Native overrides table**, owned by the app service principal: `review.reading_overrides (override_id, image_id, human_value, override_reason, reviewed_by, reviewed_at)`, append-only, `REPLICA IDENTITY FULL`.
3. **Lakehouse Sync** (Lakebase → UC, CDC, Beta) on the `review` schema → `lb_reading_overrides_history` (SCD2), which the gold MV reads.

The app reads `COALESCE(latest override, synced ai_value)` so reviewers see their change immediately; gold catches up on the next pipeline run.

Prerequisites: Postgres 17; tables in `databricks_postgres`; destination catalog without default storage. Fallback if Lakehouse Sync isn't available: a scheduled MERGE from the Lakebase catalog registered in UC (see DECISIONS D4).
