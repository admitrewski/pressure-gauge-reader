# Lakeflow pipeline runs

_Captured 2026-10-07 15:33 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Pipeline updates (serverless, triggered)

| update_id | state | cause | full_refresh | created_utc |
|---|---|---|---|---|
| 9abadc0b-ea04-4778-a269-9ccfcc0a05bf | COMPLETED | API_CALL | False | 2026-10-07 12:23:07 |
| 0e92267b-543a-470f-8d49-f5404194b92b | COMPLETED | API_CALL | False | 2026-10-07 12:18:10 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | COMPLETED | JOB_TASK | False | 2026-10-06 13:28:54 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | COMPLETED | API_CALL | False | 2026-10-06 12:53:36 |
| 177c2109-d3f2-49aa-846d-8b434c3b6861 | COMPLETED | API_CALL | False | 2026-10-06 12:49:11 |
| 19b6db60-492f-44e1-8bd2-5b21dc676857 | FAILED | API_CALL | False | 2026-10-06 12:47:39 |

## Time to read a round: updates that read new photos (event log)

| update_id | started_utc | finished_utc | duration_s | images_read |
|---|---|---|---|---|
| 177c2109-d3f2-49aa-846d-8b434c3b6861 | 2026-10-06T12:49:11.018Z | 2026-10-06T12:51:52.509Z | 161 | 30.0 |

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
| 177c2109-d3f2-49aa-846d-8b434c3b6861 | missingFlowName | 0 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | bronze_gauge_metadata | 0 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | bronze_gauge_readings_ai | 0 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | silver_gauge_readings | 0 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | quarantine_vlm_errors | 0 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | gold_gauge_readings_final | 30 |
| ae33fd66-cdfd-473a-ba61-25d2bdc260dd | missingFlowName | 0 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | silver_gauge_readings | 0 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | bronze_gauge_readings_ai | 0 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | bronze_gauge_metadata | 0 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | quarantine_vlm_errors | 0 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | gold_gauge_readings_final | 30 |
| 7405873e-5965-4af4-a70c-1a0a1f53d22d | missingFlowName | 0 |
| 0e92267b-543a-470f-8d49-f5404194b92b | silver_gauge_readings | 0 |
| 0e92267b-543a-470f-8d49-f5404194b92b | bronze_gauge_readings_ai | 0 |
| 0e92267b-543a-470f-8d49-f5404194b92b | gold_gauge_readings_final | 30 |
| 0e92267b-543a-470f-8d49-f5404194b92b | quarantine_vlm_errors | 0 |
| 0e92267b-543a-470f-8d49-f5404194b92b | gold_vlm_usage_daily | 1 |
| 0e92267b-543a-470f-8d49-f5404194b92b | bronze_gauge_metadata | 0 |
| 0e92267b-543a-470f-8d49-f5404194b92b | missingFlowName | 0 |
| 9abadc0b-ea04-4778-a269-9ccfcc0a05bf | gold_vlm_usage_daily | 1 |
| 9abadc0b-ea04-4778-a269-9ccfcc0a05bf | bronze_gauge_metadata | 0 |
| 9abadc0b-ea04-4778-a269-9ccfcc0a05bf | quarantine_vlm_errors | 0 |
| 9abadc0b-ea04-4778-a269-9ccfcc0a05bf | bronze_gauge_readings_ai | 0 |
| 9abadc0b-ea04-4778-a269-9ccfcc0a05bf | gold_gauge_readings_final | 30 |
| 9abadc0b-ea04-4778-a269-9ccfcc0a05bf | silver_gauge_readings | 0 |
| 9abadc0b-ea04-4778-a269-9ccfcc0a05bf | missingFlowName | 0 |
