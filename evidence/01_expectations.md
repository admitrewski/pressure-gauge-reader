# Data-quality expectations (event log)

_Captured 2026-10-07 15:33 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Expectation results summed across updates

| flow_name | expectation | dataset | passed | failed |
|---|---|---|---|---|
| serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_metadata | captured_at_valid | serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_metadata | 30 | 0 |
| serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_metadata | gauge_id_present | serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_metadata | 30 | 0 |
| serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_metadata | image_file_present | serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_metadata | 30 | 0 |
| serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final | has_metadata | serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final | 150 | 0 |
| serverless_stable_kx6lwb_catalog.pressure_gauge.silver_gauge_readings | reading_within_scale | serverless_stable_kx6lwb_catalog.pressure_gauge.silver_gauge_readings | 30 | 0 |
| serverless_stable_kx6lwb_catalog.pressure_gauge.silver_gauge_readings | response_parsed | serverless_stable_kx6lwb_catalog.pressure_gauge.silver_gauge_readings | 30 | 0 |
| serverless_stable_kx6lwb_catalog.pressure_gauge.silver_gauge_readings | unit_present | serverless_stable_kx6lwb_catalog.pressure_gauge.silver_gauge_readings | 29 | 1 |
| serverless_stable_kx6lwb_catalog.pressure_gauge.silver_gauge_readings | vlm_call_succeeded | serverless_stable_kx6lwb_catalog.pressure_gauge.silver_gauge_readings | 30 | 0 |

## Reading the results

Failed records on `reading_within_scale` / `unit_present` are warnings (rows kept and flagged for review), not drops; only rows without an image file name are dropped from metadata.
