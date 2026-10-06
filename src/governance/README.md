# Unity Catalog governance: explicit grants

| Principal | Grants |
|---|---|
| Pipeline owner / service principal | `READ VOLUME` on `raw`; `USE SCHEMA`, `CREATE TABLE`, `MODIFY` on the schema; `CAN QUERY` on the vision model endpoint |
| App service principal | `READ VOLUME` on `raw` (to display images); `SELECT` on `gold_gauge_readings_final` |
| `ops_analysts` group | `USE CATALOG`, `USE SCHEMA`, `SELECT` on **gold only**; `CAN USE` on the SQL warehouse; `CAN RUN` on the Genie Agent |
| `inspection_reviewers` group | `CAN USE` on the app |

Lakebase (Postgres) permissions are separate from UC: the app service principal owns the `review` schema and has `SELECT` on the synced schema (see `src/lakebase/`).

Evidence: `SHOW GRANTS` output for each object → `evidence/02_grants.md`.
