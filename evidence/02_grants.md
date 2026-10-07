# Unity Catalog governance: explicit grants

_Captured 2026-10-07 12:32 UTC from the build workspace by `src/setup/capture_evidence.py`._

## SHOW GRANTS ON CATALOG serverless_stable_kx6lwb_catalog

| Principal | ActionType | ObjectType | ObjectKey |
|---|---|---|---|
| 5f21c708-c49d-4e43-9341-9937baa0ad13 | BROWSE | CATALOG | serverless_stable_kx6lwb_catalog |
| 5f21c708-c49d-4e43-9341-9937baa0ad13 | USE CATALOG | CATALOG | serverless_stable_kx6lwb_catalog |
| 2446f043-fcb8-43d4-b58f-f0c1135ce2f2 | USE CATALOG | CATALOG | serverless_stable_kx6lwb_catalog |
| account users | USE CATALOG | CATALOG | serverless_stable_kx6lwb_catalog |
| alex.dmitrewski@databricks.com | ALL PRIVILEGES | CATALOG | serverless_stable_kx6lwb_catalog |
| alex.dmitrewski@databricks.com | MANAGE | CATALOG | serverless_stable_kx6lwb_catalog |

## SHOW GRANTS ON SCHEMA serverless_stable_kx6lwb_catalog.pressure_gauge

| Principal | ActionType | ObjectType | ObjectKey |
|---|---|---|---|
| 2446f043-fcb8-43d4-b58f-f0c1135ce2f2 | USE SCHEMA | SCHEMA | serverless_stable_kx6lwb_catalog.pressure_gauge |
| account users | USE SCHEMA | SCHEMA | serverless_stable_kx6lwb_catalog.pressure_gauge |
| alex.dmitrewski@databricks.com | ALL PRIVILEGES | CATALOG | serverless_stable_kx6lwb_catalog |
| alex.dmitrewski@databricks.com | MANAGE | CATALOG | serverless_stable_kx6lwb_catalog |

## SHOW GRANTS ON VOLUME serverless_stable_kx6lwb_catalog.pressure_gauge.raw

| Principal | ActionType | ObjectType | ObjectKey |
|---|---|---|---|
| 2446f043-fcb8-43d4-b58f-f0c1135ce2f2 | READ VOLUME | VOLUME | serverless_stable_kx6lwb_catalog.pressure_gauge.raw |
| alex.dmitrewski@databricks.com | ALL PRIVILEGES | CATALOG | serverless_stable_kx6lwb_catalog |
| alex.dmitrewski@databricks.com | MANAGE | CATALOG | serverless_stable_kx6lwb_catalog |

## SHOW GRANTS ON TABLE serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final

| Principal | ActionType | ObjectType | ObjectKey |
|---|---|---|---|
| account users | SELECT | TABLE | serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final |
| alex.dmitrewski@databricks.com | ALL PRIVILEGES | CATALOG | serverless_stable_kx6lwb_catalog |
| alex.dmitrewski@databricks.com | MANAGE | CATALOG | serverless_stable_kx6lwb_catalog |

## SHOW GRANTS ON TABLE serverless_stable_kx6lwb_catalog.pressure_gauge.bronze_gauge_readings_ai

| Principal | ActionType | ObjectType | ObjectKey |
|---|---|---|---|
| alex.dmitrewski@databricks.com | ALL PRIVILEGES | CATALOG | serverless_stable_kx6lwb_catalog |
| alex.dmitrewski@databricks.com | MANAGE | CATALOG | serverless_stable_kx6lwb_catalog |

## Lakebase (Postgres) grants — separate from UC

| grantee | table_schema | table_name | privileges |
|---|---|---|---|
| 2446f043-fcb8-43d4-b58f-f0c1135ce2f2 | pressure_gauge | gauge_readings_serving | SELECT |
| alex.dmitrewski@databricks.com | pressure_gauge | gauge_readings_serving | DELETE, SELECT, TRUNCATE |
| 2446f043-fcb8-43d4-b58f-f0c1135ce2f2 | pressure_gauge | vlm_usage_serving | SELECT |
| alex.dmitrewski@databricks.com | pressure_gauge | vlm_usage_serving | DELETE, SELECT, TRUNCATE |
| 2446f043-fcb8-43d4-b58f-f0c1135ce2f2 | review | reading_overrides | INSERT, SELECT |
| alex.dmitrewski@databricks.com | review | reading_overrides | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| databricks_gateway | review | reading_overrides | SELECT |
| databricks_reader_16406 | review | reading_overrides | SELECT |

## Model access (Unity AI Gateway)

`account users` hold `EXECUTE` on `system.ai` (inherited by `system.ai.gpt-5-5`), which governs who can call the vision model.
