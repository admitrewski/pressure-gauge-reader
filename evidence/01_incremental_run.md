# Auto Loader incremental processing

_Captured 2026-10-07 12:32 UTC from the build workspace by `src/setup/capture_evidence.py`._

## bronze_gauge_readings_ai output rows per completed update

| update_id | flow | output_rows |
|---|---|---|
| 177c2109-d3f2-49aa-846d-8b434c3b6861 | bronze_gauge_readings_ai | 30 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | bronze_gauge_readings_ai | 0 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | bronze_gauge_readings_ai | 0 |
| 0e92267b-543a-470f-8d49-f5404194b92b | bronze_gauge_readings_ai | 0 |
| 9abadc0b-ea04-4778-a269-9ccfcc0a05bf | bronze_gauge_readings_ai | 0 |

## Vision-model calls recorded by Unity AI Gateway (image-sized requests)

| vision_model_calls_from_pipeline |
|---|
| 32 |

## What this shows

The first completed update ingested all 30 images; later updates (re-runs and the refresh job) output 0 rows because Auto Loader only processes new files. Unity AI Gateway confirms the model was called about once per image (the count also includes a 2-image ai_query test run before the pipeline), not once per pipeline run.
