# gauge-review: Databricks App (AppKit, React)

The business surface of the Pressure Gauge Reader.

- **Review readings** (`client/src/pages/review/`): an outcome panel (share of the round's readings that needed no one) and KPI cards (to review, unexpectedly high, human correction rate, AI cost per gauge) with data freshness, a status distribution bar for the whole round, and a resizable **split view**: the queue (gauge thumbnails, tabs *Needs review / Unexpectedly high / Human-corrected / Auto-accepted / All readings*) on the left and the selected reading on the right — photo from the UC volume, trusted vs AI reading, a confidence bar with the review threshold marked, image issues, and a decision banner once reviewed. Reviewers **confirm**, **override** (value + reason) or **mark unreadable**; keyboard shortcuts (↑/↓, C, O, U) and auto-advance to the next reading keep the queue moving. **Ask Genie** opens in a side panel without leaving the queue.
- **How it works** (`client/src/pages/architecture/`): the seven steps (land → read → refine → serve → review → sync back → ask) as a clickable flow with the review loop and the Unity Catalog / Unity AI Gateway layers; each step shows what happens, the Databricks objects behind it, the design decision and a live number. *Follow one reading* traces a real gauge (e.g. the human-corrected PI-3102) through every step with its timestamps. Live review counts come from `GET /api/review-stats`.
- **AI model & usage** (`client/src/pages/model/`): model card (model, gateway service, review rule, access), AI cost per reading, spend, tokens per reading, failed calls, the confidence distribution against the review threshold, human correction rate, common image issues, where the cost goes (input vs output, reasoning share) and usage by day. Reads `pressure_gauge.vlm_usage_serving`, the Lakebase copy of `gold_vlm_usage_daily`.
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
