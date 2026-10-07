# gauge-review: Databricks App (AppKit, React)

The business surface of the Pressure Gauge Reader.

- **Review readings** (`client/src/pages/review/`): KPI strip with data freshness, a status distribution bar for the whole round, and a resizable **split view**: the queue (gauge thumbnails, tabs *Needs review / Unexpectedly high / Human-corrected / Auto-accepted / All readings*) on the left and the selected reading on the right — photo from the UC volume, trusted vs AI reading, a confidence bar with the review threshold marked, image issues, and a decision banner once reviewed. Reviewers **confirm**, **override** (value + reason) or **mark unreadable**; keyboard shortcuts (↑/↓, C, O, U) and auto-advance to the next reading keep the queue moving. **Ask Genie** opens in a side panel without leaving the queue.
- **Ask Genie** (side panel, `client/src/components/GenieAssistant.tsx`): the "Gauge Inspection Readings" Genie Agent, on behalf of the signed-in user, with clickable example questions and generated SQL on every answer. There is no separate Genie page: reviewers ask questions without leaving the queue.

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
