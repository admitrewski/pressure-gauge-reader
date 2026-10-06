# End-to-end trace: one gauge image through every stage

Image `gauge_009.jpg` (gauge **PI-3102**, Northbay Refinery, Steam & Utilities), traced on 2026-10-06 (UTC).

| # | Stage | What happened | Evidence |
|---|---|---|---|
| 1 | Lakeflow (Auto Loader) | Image picked up from `/Volumes/serverless_stable_kx6lwb_catalog/pressure_gauge/raw/images/` in update `177c2109…` (30 images, 0 on later runs) | `01_pipeline_run.md`, `01_incremental_run.md` |
| 2 | Gen AI via Unity Gateway | `ai_query('system.ai.gpt-5-5', …, files => content)` read **5.0 bar** on a 0–6 bar dial, confidence 0.86 | `04_vlm_outputs.md`, `04_readings_summary.md`, `07_gateway.md` |
| 3 | Gold | 5.0 > normal max 4.5 bar (75% of full scale) → `reading_status = high`, `review_status = pending_review` | `04_readings_summary.md` |
| 4 | Unity Catalog | Gold readable by `account users` only at gold level; lineage volume → bronze → silver → gold | `02_grants.md`, `02_lineage.md` |
| 5 | Lakebase serving | Snapshot synced to `pressure_gauge.gauge_readings_serving`; shown in the app's review queue | `03_synced_table.md` |
| 6 | App (human review) | 13:28:01.398 — reviewer overrode to **1.0 bar**: "Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end" → `review.reading_overrides` | `03_writeback.md` |
| 7 | Lakehouse Sync | 13:28:01.399 — insert in `lb_reading_overrides_history` (Delta, CDC) | `03_writeback.md` |
| 8 | Pipeline + snapshot sync | Refresh job (update `7405873e…`) rebuilt gold: `final_value = 1.0`, `is_human_corrected = true`, status back to normal; synced back to Lakebase | `03_writeback.md` |
| 9 | Genie Agent | "Which image readings have needed human intervention?" → returns PI-3102 with AI 5.0 vs human 1.0 bar and the reason | `05_genie_benchmarks.md` |
