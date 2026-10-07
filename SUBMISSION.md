# FE Bar submission: Northbay Energy Gauge Reader

Repo: this repository · Deck: `deck/pressure-gauge-reader.pdf` · Evidence (text): `VALIDATION.md` → `evidence/` · Decisions: `DECISIONS.md` · AI usage: `BUILD.md`

*Northbay Energy is a fictional operator. All metadata is synthetic and the gauge photos are publicly licensed (`data/SOURCES.md`).*

## 1. What is the business challenge you are solving?

Energy operators run daily rounds to read hundreds of analog pressure gauges per site. Most plant gauges are still analog, because replacing each one with a transmitter means hot work, cabling and hazardous-area certification. Inspection robots and drones now photograph the gauges, but a photo is not a reading. Readings are still transcribed by hand or bought per image from a third-party vision vendor. They are then re-checked by people, and they arrive outside the data platform with no audit trail.

Hand-built computer vision struggles with glare, dirt, rain, steep angles and the variety of dial designs, and needs tuning for each one. The result is thousands of hours of low-value transcription, dependency on a vendor, and out-of-range pressures that can sit unnoticed until the next manual round. Unplanned downtime costs a large plant about $0.8M an hour (Siemens, *The True Cost of Downtime 2024*).

The two personas are the **executive sponsor**, a VP of Operations / HSE who wants safer, cheaper rounds and earlier warnings, and the **domain owner**, a reliability or maintenance lead who wants readings they can trust and act on.

## 2. How does your Databricks solution address this challenge?

One governed flow takes each photo through to a trusted reading and then to an answer:

- **Lakeflow (ingest + AI):** Auto Loader picks up photos and round metadata from a Unity Catalog volume, and a file-arrival trigger starts the job. `ai_query` calls GPT-5.5 through Unity AI Gateway inside a streaming table, so each photo is read and billed exactly once. It returns the reading, unit, dial scale, a confidence score and any image issues. Silver applies data-quality expectations. Gold applies each gauge's operating limit and decides what needs a person.
- **Unity Catalog (govern):** explicit least-privilege grants (analysts see the gold table only; the app reads photos read-only), lineage from photo to answer, and model access through `EXECUTE` on `system.ai`.
- **Lakebase (serve + write-back):** a synced, read-only copy of gold serves the app in milliseconds. Reviewer decisions are appended to a native Postgres table (who, when, why). Lakehouse Sync streams them back to Delta, and the next pipeline run folds them into gold.
- **Databricks App (React, AppKit):**
  - A review queue sorted by risk: low confidence, unreadable, unexpectedly high.
  - Confirm, override with a reason, or mark unreadable, with image zoom.
  - An *AI model & usage* page: cost per reading, confidence against the review threshold, human correction rate.
  - An interactive *How it works* architecture page.
- **Genie Agent:** plain-English questions over gold, run with the signed-in user's own permissions, with the generated SQL shown on every answer.
- **Unity AI Gateway (observe + control):** every model call is attributed and costed (`gold_vlm_usage_daily`), and models can be swapped without changing the pipeline.

**Beyond gauges:** the same photos also show leaks, corrosion, breakages and missing guards. Each new inspection type is a new prompt and output fields on the same pipeline, review queue, governance and Genie. Because this uses open foundation models rather than bespoke computer vision or a vendor, reviewer corrections become labelled data. That data can later fine-tune specialist models (e.g. for gauge reading or rust detection), which can be evaluated before switching. It runs on Databricks on AWS, Azure and Google Cloud.

## 3. What AI tools did you use, and what was your workflow? What decisions and trade-offs did you have to make for your build?

**Tools:**
- Claude Code (via Isaac) with the Databricks agent skills: pipelines, Lakebase, Genie Agents, AI Functions, Apps, Bundles, app design.
- The Databricks CLI and Declarative Automation Bundles for deployment.
- A headless browser (Playwright) to test the deployed app.
- python-pptx on the Databricks brand template for the deck.
- Session ID: `293ae955-de72-4d12-b64e-88af35717330`.

**Workflow:**
1. Check the design against the FE Bar criteria before building. This added the Genie Agent and explicit grants, and dropped hand labels in favour of operational results.
2. Compare 15 vision models on every photo.
3. Build in small, revertible commits on `main`.
4. Validate every app change (`databricks apps validate`), deploy it, and check it in a browser.
5. Export every deck change to PDF and check it.
6. Capture all run evidence as text with a script (`src/setup/capture_evidence.py`).

AI did the research, code, debugging and evidence capture. I made the scope and design calls. Full log: `BUILD.md`.

**Key decisions and trade-offs** (all 22 are in `DECISIONS.md`):
- **Foundation vision model via `ai_query`, not a custom model or vendor:** no labelled data or training, and confidence-based review covers the gaps. The trade-offs are per-token cost and dependence on a model provider; Unity AI Gateway makes the model swappable.
- **Call the model inside the streaming table, not a materialized view:** each photo is read and billed once, and reviewed readings never change on refresh.
- **GPT-5.5, chosen after testing 15 models:** the best accuracy among models that run in batch `ai_query`, with a confidence score that separates right from wrong. The newest models scored higher but aren't supported for batch inference yet.
- **Write-back through a native Lakebase table plus Lakehouse Sync:** never write to the synced table, and keep an append-only audit trail. The trade-off is that gold catches up on the next pipeline run; the app merges live decisions in the meantime.
- **Snapshot sync for serving:** gold is a materialized view without Change Data Feed. At round sizes, a snapshot refresh takes seconds.
- **No offline accuracy evaluation:** the customer sees operational results, and the human correction rate acts as the live accuracy check. The pilot adds a weekly spot check against ±2% of full scale.
- **Cost as a list-price estimate from gateway tokens:** billing rows for the shared model endpoint mixed in the model-selection tests, so they couldn't be attributed to the pipeline.
- **Genie on one denormalised gold table, with business terms defined** (operating limit, low confidence, human-corrected), so it never invents thresholds.

## 4. What are the business outcomes and impact?

The value model uses an **illustrative site: 500 gauges photographed twice a day, or 365,000 readings a year**. Its assumptions are stated so the customer can replace them with their own numbers (deck slide 2).

- **~4,900 hours a year back (about 3 people's time):** at 1 minute to transcribe or re-check each reading, that is ~6,100 hours today. With people checking only uncertain readings (target: 1 in 5), it falls to ~1,200 hours.
- **~$15k a year in AI cost versus ~$180k in vendor fees:** 365,000 photos × ~$0.04 per photo at list price, against an assumed $0.50 per-image vendor fee, with no model to train or host.
- **Earlier warnings:** readings above a gauge's operating limit are flagged the same shift, not at the next manual round. Avoiding a single hour of unplanned downtime (~$0.8M) is worth ~50× the annual AI cost.
- **Safety:** with trusted readings from robot rounds, about 2,200 operator hours a year (2 rounds × ~3 hours a day) stay out of process areas.
- **Trust and governance:** every reading is traceable from photo to answer, every correction is audited, and every model call is attributed and costed.
- **A platform, not a point solution:** the same photos and pipeline extend to condition findings (leaks, rust, damage), then to specialist models fine-tuned on reviewer-labelled photos.

**Pilot success criteria:**
- one site, 8 weeks
- at most 1 in 5 readings sent to review
- at least 95% of auto-accepted readings within ±2% of full scale, by weekly spot check
- about 4,900 hours a year of reading and re-checking removed (run rate)

**What the build proves** (run evidence in `evidence/`):
- A 30-photo round is read in one pipeline update of under 3 minutes, at ~$0.04 per photo.
- Uncertain, unreadable and unexpectedly high readings are routed to a reviewer.
- A correction makes the full round trip: app → Lakebase → Delta → gold → Genie.
