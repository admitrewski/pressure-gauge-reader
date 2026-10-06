# Unity Catalog governance: explicit grants

| Principal | Grants |
|---|---|
| Pipeline owner | Owns the schema and pipeline tables; `EXECUTE` on `system.ai` for the vision model |
| App service principal | `READ VOLUME` on `raw` (app resource binding); reads gold only through the Lakebase synced copy |
| `account users` (stands in for `ops_analysts`, DECISIONS D19) | `USE CATALOG`, `USE SCHEMA`, `SELECT` on **gold only** (`grants.sql`); Genie runs on their behalf |

Lakebase (Postgres) permissions are separate from UC: the app service principal owns the `review` schema and has `SELECT` on the synced schema (see `src/lakebase/`).

Evidence: `SHOW GRANTS` output for each object → `evidence/02_grants.md`.
