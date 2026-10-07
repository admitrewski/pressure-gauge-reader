# How this was built (AI as a force multiplier)

## Tools
- **Claude Code** (via Isaac) with the Databricks agent skills (pipelines, Lakebase, Genie Agents, AI Functions, Apps, Bundles, app design)
- Databricks CLI and Declarative Automation Bundles for deployment
- Playwright (headless browser) to check every app change on the deployed app, and PowerPoint PDF export to check every deck change
- Conversation/session ID: `293ae955-de72-4d12-b64e-88af35717330`

## How AI was used
| Area | What AI did | What I decided or overrode |
|---|---|---|
| Use case and criteria | Checked the proposed workflow against the FE Bar build criteria before anything was built | Added the Genie Agent and explicit Unity Catalog grants the first design was missing; dropped hand labels and offline evaluation in favour of operational results plus a Unity AI Gateway section |
| Architecture | Researched Lakebase write-back options | Rejected dual-write and writing to the synced table; chose a native overrides table + Lakehouse Sync (DECISIONS D4) |
| Data | Sourced CC-licensed gauge photos from Wikimedia Commons with licence metadata; screened candidates | A delegated first pass came back with metadata that couldn't be verified, so it was redone directly against the Commons API. Curated the final 30: dropped ambiguous or unstable dials, kept four hard cases on purpose |
| Model selection | Ran 15 vision models over every image and compared accuracy, confidence and batch support | Chose GPT-5.5 for batch support and informative confidence over higher-scoring models that can't run in batch (DECISIONS D11); found that the Unity Catalog listing name 404s and the `system.ai.gpt-5-5` service name works (D20) |
| Prompt for the vision model | Drafted the prompt and JSON response schema (reading, unit, scale, confidence, readable, issues, notes) | Defined confidence as "within 2% of full scale" so it is testable; asked for the largest, most central dial when several are visible; raised `max_tokens` to 16,000 after reasoning tokens truncated the JSON (`src/pipeline/vlm_prompt.md`) |
| Pipeline | Wrote the Lakeflow SQL (Auto Loader bronze, silver with expectations, gold, quarantine, usage table) and fixed run errors (ambiguous columns, `* EXCEPT` risks) | `ai_query` inside the streaming table so each photo is read and billed once (D2); `failOnError => false` with a quarantine table; business rules (operating limit, needs review) calculated once in gold (D6, D14, D15) |
| Lakebase and sync | Created the project, review table, Lakehouse Sync and synced tables; diagnosed failures | Switched the synced table to Snapshot when Change Data Feed wasn't available on the materialized view (D16); registered it in the existing catalog without CREATE CATALOG (D17); used `account users` because `users` isn't a UC principal (D19) |
| Cost | Built `gold_vlm_usage_daily` from Unity AI Gateway usage and published per-token rates | Billing rows mixed the model-selection tests with the pipeline, so cost is a list-price estimate from gateway tokens rather than billed DBUs (D21) |
| App | Scaffolded the AppKit app, built the review queue, Genie panel, AI model & usage page and interactive architecture page; screenshot-tested each change | Five queue tabs, "unexpectedly high" wording, Genie as a side panel rather than a page, a fictional operator brand (D22), and a "How it works" page that fits on one screen |
| Genie Agent | Wrote the space definition, example SQL, synonyms and benchmark questions, and validated every example query | Changed the sample questions from ones the app already answers to data-exploration questions (e.g. low-confidence readings by location) |
| Deck | Built the deck on the Databricks brand template with python-pptx; researched public sources (ETH Zurich ICRA 2024, Siemens 2024) | Rejected KPIs from the 30-photo test set as unconvincing; replaced them with an illustrative site value model with stated assumptions; cut the deck to 9 content slides for a 20–30 minute slot |

## Key prompts and patterns
- *"Validate the workflow and whether it will satisfy the FE Bar criteria — do not start building anything."* Plan and check against the criteria before writing code.
- *"Look at the available models and internal/public docs to recommend a VLM, then test it on the images."* Model choice made on evidence across 15 models, not by default.
- *"No need for my labels … we want to show the results to the customer, not the VLM accuracy (but include a section where Unity Gateway gives observability and control)."* Scope set by the customer outcome.
- *"Merge to main, only use main for further changes, committing in stages so rollbacks are possible."* Every change is a small, revertible commit.
- *"Let's not use the KPIs from the test datasets … find another way of showing value."* Value expressed as a model the customer can fill with their own numbers.
- Pattern: every app change was validated (`databricks apps validate`), deployed and checked with a headless browser; every deck change was exported to PDF and visually checked before committing.
