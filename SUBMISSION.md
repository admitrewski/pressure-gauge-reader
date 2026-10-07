# FE Bar submission: Northbay Energy Gauge Reader

Repo: this repository · Deck: `deck/pressure-gauge-reader.pdf` · Evidence (text): `VALIDATION.md` → `evidence/` · Decisions: `DECISIONS.md` · AI usage: `BUILD.md`

*Northbay Energy is a fictional operator. All metadata is synthetic and the gauge photos are publicly licensed (`data/SOURCES.md`).*

## 1. What is the business challenge you are solving?

Energy operators run daily rounds to read hundreds of analog pressure gauges per site. Most plant gauges are still analog, because replacing each one with a transmitter means hot work, cabling and hazardous-area certification. Inspection robots and drones now photograph the gauges, but a photo is not a reading. Readings are still transcribed by hand or bought per image from a third-party vision vendor. They are then re-checked by people, and they arrive outside the data platform with no audit trail.

Hand-built computer vision struggles with glare, dirt, rain, steep angles and the variety of dial designs, and needs tuning for each one. The result is thousands of hours of low-value transcription, dependency on a vendor, and out-of-range pressures that can sit unnoticed until the next manual round. Unplanned downtime costs a large plant about $0.8M an hour (Siemens, *The True Cost of Downtime 2024*).

The two personas are the **executive sponsor**, a VP of Operations / HSE who wants safer, cheaper rounds and earlier warnings, and the **domain owner**, a reliability or maintenance lead who wants readings they can trust and act on.

## 2. How does your Databricks solution address this challenge?

**Architecture.** The solution is one governed data journey on the Databricks Data Intelligence Platform, all serverless and deployed with Declarative Automation Bundles. Robot photos land in Unity Catalog. A Lakeflow pipeline reads each photo once with a vision model and turns it into a trusted reading. Lakebase serves the readings to a Databricks App, where people review only the uncertain ones. Their decisions flow back into the lakehouse, and a Genie Agent answers questions over the result. Unity Catalog governs every step, and Unity AI Gateway observes and controls every model call.

```
Robot photos + round metadata
  → UC volume → Lakeflow: Auto Loader → bronze (ai_query → GPT-5.5 via Unity AI Gateway) → silver → gold
  → Lakebase synced tables → Databricks App (review queue) → reviewer decision → native Lakebase table
  → Lakehouse Sync (CDC) → Delta → gold (next run) → Genie Agent + app
  [Unity Catalog under every step · Unity AI Gateway on every model call]
```

**The data journey, stage by stage:**

1. **Ingest with Lakeflow:**
   - **Lakeflow Spark Declarative Pipelines** (SQL, serverless, triggered).
   - **Auto Loader** (`read_files`) incrementally ingests the photos (binary files) and the metadata CSV (gauge tag, site, process unit, robot, operating limit) exactly once.
   - **Streaming tables** for bronze and **materialized views** for gold.
   - **Expectations** in silver: the model call succeeded, the reading is within the dial's scale, and a unit is present. Failed calls go to a quarantine table instead of stopping the pipeline.
   - A **Lakeflow Job** with a **file-arrival trigger** runs the pipeline when photos land, then refreshes the Lakebase serving copies.
2. **Govern with Unity Catalog:**
   - A UC **volume** holds the raw photos; UC **managed tables** hold every layer.
   - **Explicit least-privilege grants:** analysts get `SELECT` on the gold table only; the app's service principal gets `READ VOLUME` on the photos and a read-only serving copy.
   - **Lineage** from photo to answer (`system.access.table_lineage`).
   - **Model access** governed by `EXECUTE` on `system.ai`.
   - **System tables** feed the cost view: `system.ai_gateway.usage` and `system.billing.list_prices`.
3. **Serve with Lakebase** (Autoscaling Postgres):
   - **Synced tables** (Snapshot mode) give the app millisecond reads of the gold readings and the model usage.
   - Reviewer decisions are appended to an **app-owned native Postgres table**: insert-only, with who, when and why.
   - **Lakehouse Sync** (change data capture, Beta) streams every decision back into a Delta change-history table in Unity Catalog, which gold folds in on the next run. The synced table is never written to, so the sync never breaks.
4. **Make it intelligent with Gen AI:**
   - **AI Functions:** `ai_query` sends each photo (`files => content`) to **GPT-5.5**, served as a **Unity AI Gateway** model service (`system.ai.gpt-5-5`).
   - A JSON response format returns reading, unit, dial scale, a 0–1 confidence, a readable flag and image issues. `failOnError => false` captures errors as data.
   - Calling it inside the streaming table means each photo is read and billed once; refreshes never re-read a photo or change a reviewed reading.
   - Gold applies each gauge's **operating limit** and routes low-confidence, unreadable and unexpectedly high readings to a person.
   - **Unity AI Gateway** logs every call (requester, tokens, status). The pipeline turns that log into a daily **usage and cost table** (`gold_vlm_usage_daily`), and the model can be swapped without changing pipeline code.
5. **Ask with a Genie Agent:**
   - A Genie Agent on the single gold table, with column descriptions, **synonyms** (e.g. "low confidence", "location"), **example SQL** and **benchmark questions**.
   - Embedded in the app and run **on behalf of the signed-in user**, so their own grants apply and the generated SQL is shown on every answer.
6. **Surface it with a Databricks App:**
   - Built with **AppKit** (React + Express) using its **Lakebase**, **Files** (read-only UC volume access for the photos) and **Genie** plugins, and deployed with Declarative Automation Bundles.
   - Four surfaces:
     - **Review queue**, sorted by risk: confirm, override with a reason, or mark unreadable, with image zoom.
     - **Genie side panel.**
     - **AI model & usage** page: cost per reading, confidence against the review threshold, human correction rate.
     - **How it works** page: an interactive architecture diagram with live numbers.

**Why it fits the problem:**
- **Foundation models instead of hand-built computer vision or a per-image vendor:** no labelled data or training, and confidence-based review covers the gaps.
- **A platform, not a point solution:** leaks, corrosion, breakages and missing guards are a new prompt and output fields on the same pipeline, review queue, governance and Genie.
- **Better models over time:** reviewer corrections become labelled data for fine-tuning specialist models (e.g. gauge reading or rust detection), which can be evaluated before switching.
- **Any cloud:** it runs on Databricks on AWS, Azure and Google Cloud.

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
