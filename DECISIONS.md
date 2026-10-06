# Decisions and trade-offs

Status: **Decided** · **Proposed** (default, not yet confirmed) · **Open** (still to choose)

| # | Decision | Status | Alternatives considered | Why this choice | Revisit if… |
|---|---|---|---|---|---|
| D1 | Read gauges with `ai_query` and a foundation vision model; it returns the **reading and a confidence score** | Decided | Custom CNN/regression model; incumbent third-party vision vendor | No labelled training data, GPU training or model maintenance needed; less manual tuning. Quality is controlled by confidence-based routing to a human reviewer, not by model training | The human correction rate stays high → consider fine-tuning or a classical computer-vision step for the needle angle |
| D2 | Run `ai_query` inside the Auto Loader **streaming table**, never in a materialized view | Decided | VLM in a materialized view; separate batch job | Streaming tables process each image exactly once, so no repeat inference cost and reviewed readings never change on recompute; lineage stays in one pipeline | Re-reading the history becomes necessary (e.g. a new model) → run a one-off backfill flow |
| D3 | Auto Loader in **triggered** (batch) mode | Decided | Continuous streaming; plain `read_files` batch | Images arrive in batches per inspection round; triggered runs give incremental exactly-once ingest with no always-on compute | Readings are needed within seconds of capture |
| D4 | Lakebase **synced table is read-only**; the app writes overrides to a **separate native table**; Lakehouse Sync brings them back to Delta | Decided | App writes to the synced table (breaks the sync); app writes to both Lakebase and Delta (no transaction across the two); app writes to Delta through a SQL warehouse (latency) | Low-latency transactional writes for reviewers; free CDC audit trail of every correction; no write loop | Lakehouse Sync (Beta) isn't available in the workspace → scheduled MERGE from the Lakebase catalog registered in UC |
| D5 | Images stay in the UC Volume; Delta and Lakebase store only the path | Decided | Storing image bytes in Delta and syncing them to Lakebase | Keeps the synced table small; the app fetches images through the Files API with the volume grant | — |
| D6 | Genie Agent on **one denormalised gold table**, with `reading_status`, `needs_review` and `is_human_corrected` calculated in the pipeline | Decided | Genie over several tables; defining "unusually high" in Genie text instructions | Deterministic, governed definitions; simpler SQL for Genie, so more accurate answers | Users need trends against each gauge's own history → add example SQL or a metric view |
| D7 | Explicit, least-privilege **Unity Catalog grants** per role (pipeline, app service principal, reviewers, analysts) | Decided | Workspace-admin defaults; broad schema-level grants | Analysts see gold only; the app sees only what it serves; grants committed as evidence | — |
| D8 | Embedded Genie runs **as the signed-in user** (on-behalf-of) | Proposed | Genie runs as the app service principal | UC grants still apply per user | — |
| D9 | App framework | Open | AppKit (Node/React) vs Python (FastAPI / Streamlit) | — | — |
| D10 | The VLM reads the value **directly**, and also returns unit, scale min/max, readability and issues (glare, fog, occlusion) | Decided | Ask for the needle angle and compute the value | Simplest prompt; one structured response per image | — |
| D11 | Vision model: **`system.ai.gpt-5-5`**; fallback `system.ai.gemini-3-5-flash` | Decided | 15 vision models tested on the gauge photos (see *Model selection* below) | Best accuracy among models that `ai_query` can run in batch; its confidence score separates right from wrong readings (needed for D15); stable across repeat runs | A stronger model (e.g. GPT-6 Sol, Claude Opus 5.5) becomes available for batch `ai_query` |
| D12 | **No offline accuracy evaluation**; the customer sees operational results instead: readings, confidence, review queue and **human correction rate** | Decided | Labelled ground-truth set with MLflow evaluation | The demo shows the customer's workflow, not a model benchmark. The human correction rate measures accuracy in production for free | The customer asks for an accuracy benchmark before rollout |
| D13 | Call the model through **Unity AI Gateway** (`system.ai.*` service) for access control, usage/cost tracking, rate limits, budgets and request logging | Decided | Calling a legacy serving endpoint directly | One place to govern and observe the AI; supports swapping models | Known issues in `src/gateway/` aren't fixed in the workspace |
| D14 | "Unusually high" = reading above the gauge's **normal operating maximum**, by default **75% of full scale** (the gauge-sizing rule of thumb for steady pressure), overridable per gauge in the metadata | Proposed | Fixed thresholds per site; statistical outliers versus each gauge's history | Works with no hand labelling (full scale comes from the VLM); matches how instrument engineers size gauges | The customer provides real operating limits per tag |
| D15 | A reading **needs review** if confidence is below a threshold, the dial is unreadable, or the reading is above the normal maximum | Proposed | Review everything; review only unreadable dials | Reviewers' time goes where it matters; excursions always get a human check | Threshold tuned from the human correction rate |

## Model selection (one-off, 2026-10-06)

Tested in the build workspace by calling each model's serving endpoint with the prompt in `src/pipeline/vlm_prompt.md`. Accuracy was judged against a visual estimate on 22 clearly readable dials (within 5% of full scale). This was used to choose a model; it is not part of the pipeline.

| Model | Batch `ai_query` | Readings within 5% FS | Avg confidence: right vs wrong | Median latency |
|---|---|---|---|---|
| GPT-6 Sol / Claude Opus 5.5 | **No** (not supported for batch inference) | 21/22 | 0.94 vs 0.76 / 0.80 vs 0.60 | 7–9 s |
| **GPT-5.5** | Yes | 18–19/22 (two runs) | 0.85 vs ~0.7 | 9–13 s |
| Gemini 3.5 Flash | Yes | 18–19/22 | 0.94 vs 0.92 (confidence not informative) | 5 s |
| GPT-5.6 Luna | Yes | 17/22 | 0.91 vs 0.86 | 11 s |
| Claude Opus 4.8 | Yes | 12/22 | 0.84 vs 0.61 | 3 s |
| Claude Sonnet 4.6 / Haiku 4.5, GPT-5.4 mini, Gemini 3.1 Flash Lite, Llama 4 Maverick | Yes | 2–11/22 | — | 1–5 s |

Findings that shaped the design:
- **Newest frontier models can't be used by `ai_query` in batch** in this workspace ("not supported for batch inference"), so the pipeline uses the best batch-capable model.
- **Unity Gateway naming for `ai_query`:** use `system.ai.gpt-5-5`. The UC listing shows `system.ai.databricks-gpt-5-5`, but that form fails with a 404.
- **Reasoning models need a generous output-token limit**; with low limits the JSON is cut off.
- **Workspace token-per-minute limits** returned HTTP 429 at 8 parallel requests; Unity Gateway rate limits make this explicit and controllable.
- **Images curated** to 30 (from 38): dials whose reading flipped between runs, or that were ambiguous (ornate hands, dual scales read inconsistently), were replaced. Four deliberately hard images remain to show routing to review.
