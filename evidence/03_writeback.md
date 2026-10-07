# Human review write-back round trip

_Captured 2026-10-07 12:32 UTC from the build workspace by `src/setup/capture_evidence.py`._

## 1. App writes to the native Lakebase table `review.reading_overrides`

| override_id | image_id | action | human_value | override_reason | reviewed_by | reviewed_at |
|---|---|---|---|---|---|---|
| 2 | gauge_009.jpg | override | 1 | Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end | alex.dmitrewski@databricks.com | 2026-10-06 13:28:01.398352+00 |

## 2. Lakehouse Sync (CDC) lands it in Delta `lb_reading_overrides_history`

| _pg_change_type | _pg_lsn | _timestamp | override_id | image_id | action | human_value | reviewed_by |
|---|---|---|---|---|---|---|---|
| insert | 28877016 | 2026-10-06T12:43:00.055 | 1 | __sync_test__ | override | 1.0 | build-check |
| delete | 28880608 | 2026-10-06T12:43:52.819 | 1 | __sync_test__ | override | 1.0 | build-check |
| insert | 30799832 | 2026-10-06T13:28:01.399 | 2 | gauge_009.jpg | override | 1.0 | alex.dmitrewski@databricks.com |

## 3. Pipeline merges it into gold

| image_id | gauge_id | ai_value | final_value | unit | review_status | reading_status | is_human_corrected | reviewed_by | reviewed_at |
|---|---|---|---|---|---|---|---|---|---|
| gauge_009.jpg | PI-3102 | 5.0 | 1.0 | bar | overridden | normal | true | alex.dmitrewski@databricks.com | 2026-10-06T13:28:01.398Z |

## 4. Snapshot sync brings the corrected gold row back to Lakebase serving

| image_id | ai_value | final_value | review_status | is_human_corrected |
|---|---|---|---|---|
| gauge_009.jpg | 5 | 1 | overridden | t |
