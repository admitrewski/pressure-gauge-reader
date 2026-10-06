# Lineage (system.access.table_lineage)

_Captured 2026-10-06 13:39 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Edges touching the pressure_gauge schema

| source | target | target_type |
|---|---|---|
| (files / external) | serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_metadata | STREAMING_TABLE |
| (files / external) | serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_readings_ai | STREAMING_TABLE |
| serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_metadata | serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final | MATERIALIZED_VIEW |
| serverless_stable_kx6lwb_catalog.pressure_gauge.lb_reading_overrides_history | serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final | MATERIALIZED_VIEW |
| serverless_stable_kx6lwb_catalog.pressure_gauge.silver_gauge_readings | serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final | MATERIALIZED_VIEW |
| serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_readings_ai | serverless_stable_kx6lwb_catalog.pressure_gauge.quarantine_vlm_errors | STREAMING_TABLE |
| serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_readings_ai | serverless_stable_kx6lwb_catalog.pressure_gauge.silver_gauge_readings | STREAMING_TABLE |
