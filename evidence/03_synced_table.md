# Lakebase synced table (gold → Postgres)

_Captured 2026-10-07 12:32 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Synced table status

```json
{
 "name": "synced_tables/serverless_stable_kx6lwb_catalog.pressure_gauge.gauge_readings_serving",
 "spec": null,
 "status": {
  "detailed_state": "SYNCED_TABLE_ONLINE_NO_PENDING_UPDATE",
  "message": "Synced table creation succeeded using Delta Live Tables: https://fevm-serverless-stable-kx6lwb.cloud.databricks.com#joblist/pipelines/fd47dc64-94cd-42b2-a4c1-efa4eeafd7b2/updates/36d6c49e-d6c2-4854-ba04-437e8ecdfdea.",
  "last_sync": {
   "delta_table_sync_info": {
    "delta_commit_time": "1970-01-01T00:00:00Z",
    "delta_commit_version": 5
   },
   "sync_end_time": "2026-10-06T13:30:06.458301Z",
   "sync_start_time": "2026-10-06T13:29:58.906457Z"
  }
 }
}
```

## Row counts: gold (Delta) vs serving (Lakebase)

Gold:

| rows | pending_review | human_corrected |
|---|---|---|
| 30 | 9 | 1 |

Lakebase `pressure_gauge.gauge_readings_serving`:

| rows | pending_review | human_corrected |
|---|---|---|
| 30 | 9 | 1 |
