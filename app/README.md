# gauge-review: Databricks App (AppKit, React)

The business surface of the Pressure Gauge Reader.

- **Review readings** (`client/src/pages/review/`): KPI strip (readings, needs review, above normal maximum, human correction rate, with data freshness), a queue filtered by *Needs review / High / Human-corrected / All*, and a detail dialog showing the gauge image (served from the UC volume), metadata and the AI reading with confidence and issues. Reviewers **confirm**, **override** (value + reason) or **mark unreadable**.
- **Ask Genie** (`client/src/pages/genie/`): the "Gauge Inspection Readings" Genie Agent, on behalf of the signed-in user, with generated SQL shown on every answer.

## How it reads and writes
| Route | What it does |
|---|---|
| `GET /api/readings` | Reads the Lakebase synced copy of gold (`pressure_gauge.gauge_readings_serving`) merged with the latest live decision from `review.reading_overrides`, so a review shows immediately |
| `POST /api/readings/:imageId/review` | Appends a decision to `review.reading_overrides` (reviewer = signed-in user's email). Lakehouse Sync carries it to Delta; the next pipeline run updates gold |
| `GET /api/files/files/raw?path=images/<file>` | Files plugin: serves the gauge image from the raw volume, read-only, as the app's service principal |
| `POST /api/genie/default/messages` | Genie plugin (OBO via `user_api_scopes: dashboards.genie`) |
| `GET /api/whoami` | Signed-in identity shown in the header |

## Deploy
```bash
databricks apps validate
databricks bundle deploy && databricks bundle run app
# then grant the app service principal in Lakebase:
databricks psql --project pressure-gauge-reader -- -d databricks_postgres -v app_sp=<SP_CLIENT_ID> -f ../src/lakebase/02_app_grants.sql
```
Resources (see `databricks.yml`): Lakebase `postgres` (CAN_CONNECT_AND_CREATE), raw volume (READ_VOLUME), Genie space (CAN_RUN).
