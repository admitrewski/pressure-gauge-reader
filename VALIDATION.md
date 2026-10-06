# Validation and run evidence

Every stage below links to **text** evidence committed in `evidence/` (query results, logs, notebook outputs). Screenshots are supporting material only.

## End-to-end journey
- [ ] One image traced from the volume → bronze → gold → Lakebase → app → override → gold, with Genie answering about it: `evidence/00_end_to_end_trace.md`

## 1. Lakeflow: ingest
- [ ] Pipeline update completed (update ID, rows per table): `evidence/01_pipeline_run.md`
- [ ] Data-quality expectations (pass/fail counts from the event log): `evidence/01_expectations.md`
- [ ] Auto Loader incremental: a second run picks up only new files: `evidence/01_incremental_run.md`

## 2. Unity Catalog: govern
- [ ] `SHOW GRANTS` on the volume, schema and tables for each principal: `evidence/02_grants.md`
- [ ] Lineage from images to gold to synced table: `evidence/02_lineage.md`

## 3. Lakebase: operational serving
- [ ] Synced table online; row count matches gold: `evidence/03_synced_table.md`
- [ ] Override round trip: app write → `review.reading_overrides` → Lakehouse Sync history → gold `is_human_corrected = true`: `evidence/03_writeback.md`

## 4. Gen AI: make it intelligent
- [ ] Sample of `ai_query` structured outputs (reading, unit, scale, confidence, readable, issues): `evidence/04_vlm_outputs.md`
- [ ] Results for all 30 images: reading, confidence, status, routed to review (yes/no), plus summary counts: `evidence/04_readings_summary.md`
- [ ] Human correction rate after review: `evidence/04_review_outcomes.md`

## 5. Genie Agent: natural-language queries
- [ ] Benchmark questions with generated SQL and answers: `evidence/05_genie_benchmarks.md`

## 6. Databricks App: surface it to the business
- [ ] App deployed (URL, deployment status, app log extract): `evidence/06_app_deploy.md`

## 7. Unity Gateway: AI observability and control
- [ ] Model service grants, usage/cost for the pipeline's calls, rate limit and budget configuration, sample logged request: `evidence/07_gateway.md`
