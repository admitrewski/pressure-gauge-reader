# Databricks App deployment

_Captured 2026-10-07 15:34 UTC from the build workspace by `src/setup/capture_evidence.py`._

## App status

```json
{
 "name": "gauge-review",
 "url": "https://gauge-review-7474650602871732.aws.databricksapps.com",
 "app_status": {
  "message": "App has status: App is running",
  "state": "RUNNING"
 },
 "compute_status": {
  "message": "App compute is running.",
  "state": "ACTIVE"
 },
 "active_deployment": {
  "deployment_id": "01f1c2586af512cc870b908461e11f95",
  "status": {
   "message": "App started successfully",
   "state": "SUCCEEDED"
  },
  "create_time": "2026-10-07T14:07:23Z"
 },
 "resources": [
  {
   "name": "files",
   "uc_securable": {
    "permission": "READ_VOLUME",
    "securable_full_name": "serverless_stable_kx6lwb_catalog.pressure_gauge.raw",
    "securable_type": "VOLUME"
   }
  },
  {
   "genie_space": {
    "name": "Gauge Inspection Readings",
    "permission": "CAN_RUN",
    "space_id": "01f1c1856cf81e78abbc04e6f1863c80"
   },
   "name": "genie-space"
  },
  {
   "name": "postgres",
   "postgres": {
    "branch": "projects/pressure-gauge-reader/branches/production",
    "database": "projects/pressure-gauge-reader/branches/production/databases/databricks-postgres",
    "permission": "CAN_CONNECT_AND_CREATE"
   }
  }
 ],
 "user_api_scopes": [
  "dashboards.genie",
  "files.files"
 ]
}
```
