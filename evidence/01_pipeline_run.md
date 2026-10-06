# Lakeflow pipeline runs

_Captured 2026-10-06 13:38 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Pipeline updates (serverless, triggered)

| update_id | state | cause | full_refresh | created_utc |
|---|---|---|---|---|
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | COMPLETED | JOB_TASK | False | 2026-10-06 13:28:54 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | COMPLETED | API_CALL | False | 2026-10-06 12:53:36 |
| 177c2109-d3f2-49aa-846d-8b434c3b6861 | COMPLETED | API_CALL | False | 2026-10-06 12:49:11 |
| 19b6db60-492f-44e1-8bd2-5b21dc676857 | FAILED | API_CALL | False | 2026-10-06 12:47:39 |

## Rows per dataset

| dataset | rows |
|---|---|
| bronze_gauge_readings_ai | 30 |
| bronze_gauge_metadata | 30 |
| silver_gauge_readings | 30 |
| quarantine_vlm_errors | 0 |
| gold_gauge_readings_final | 30 |

## Flow results per update (event log)

| update_id | flow | output_rows |
|---|---|---|
| 177c2109-d3f2-49aa-846d-8b434c3b6861 | bronze_gauge_metadata | 30 |
| 177c2109-d3f2-49aa-846d-8b434c3b6861 | silver_gauge_readings | 30 |
| 177c2109-d3f2-49aa-846d-8b434c3b6861 | gold_gauge_readings_final | 30 |
| 177c2109-d3f2-49aa-846d-8b434c3b6861 | bronze_gauge_readings_ai | 30 |
| 177c2109-d3f2-49aa-846d-8b434c3b6861 | quarantine_vlm_errors | 0 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | bronze_gauge_metadata | 0 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | bronze_gauge_readings_ai | 0 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | silver_gauge_readings | 0 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | quarantine_vlm_errors | 0 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | gold_gauge_readings_final | 30 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | silver_gauge_readings | 0 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | bronze_gauge_readings_ai | 0 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | bronze_gauge_metadata | 0 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | quarantine_vlm_errors | 0 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | gold_gauge_readings_final | 30 |
