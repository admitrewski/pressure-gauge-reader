# Northbay Energy Gauge Reader

**AI-assisted gauge reading for refinery operator rounds, with a human in the loop.**

*Northbay Energy is a fictional operator (one refinery, one terminal); all metadata is synthetic and the gauge photos are publicly licensed.*

**Reviewers start here:** `SUBMISSION.md` (the four submission answers) · `deck/pressure-gauge-reader.pdf` · `VALIDATION.md` (text evidence for every stage) · `DECISIONS.md` · `BUILD.md` (AI usage)

## The problem

Refineries and process plants run daily operator rounds to read hundreds of analog pressure gauges. Increasingly, inspection robots capture these as images, but turning an image into a trusted reading is still slow: readings are transcribed by hand or outsourced to a third-party vision vendor. The data lands outside the central data platform, and an out-of-range pressure can sit unnoticed until someone reviews it.

## The outcome

**Value model for an illustrative site** (500 gauges photographed twice a day = 365,000 readings a year; the assumptions are stated so they can be replaced with a customer's own numbers; worked in `deck/build_deck.py`, slide "Where the value comes from"):

- **~4,900 hours a year back:** at 1 minute to transcribe or re-check each reading, that's ~6,100 hours a year today. With people checking only the uncertain readings (target: 1 in 5), it falls to ~1,200 hours, about 3 people's time.
- **~$15k a year in AI cost:** 365,000 photos × ~$0.04 per photo (measured tokens × GPT-5.5 list price, `evidence/07_gateway.md`). That compares with ~$180k a year at an assumed $0.50 per-image vendor fee, with no model to train or host.
- **Earlier warnings:** readings above a gauge's operating limit are flagged the same shift. Unplanned downtime costs a large plant ~$0.8M an hour (Siemens, *The True Cost of Downtime 2024*), so avoiding a single hour is worth ~50× the annual AI cost.
- **Pilot targets:** one site, 8 weeks; at most 1 in 5 readings sent to review; ≥ 95% of auto-accepted readings within ±2% of full scale by weekly spot check.

**What the build proves** (synthetic metadata, public photos): every photo is read once by one pipeline update (under 3 minutes for a 30-photo round, `evidence/01_pipeline_run.md`); uncertain, unreadable and unexpectedly high readings go to a reviewer, and corrections flow back to Delta and Genie (`evidence/03_writeback.md`); every model call is attributed and costed (`evidence/07_gateway.md`).

## How it works: one integrated data journey

```
Raw images + gauge metadata (UC Volume)
  │  Lakeflow: Auto Loader (triggered) → bronze → silver → gold, with expectations
  │  Gen AI: ai_query vision model (via Unity Gateway) reads each gauge once → reading + confidence
  ▼
gold.gauge_readings_final (Delta, governed in Unity Catalog with explicit grants)
  │  Lakebase synced table (read-only, low-latency serving)
  ▼
Databricks App: review queue → reviewer confirms or overrides the reading
  │  overrides written to a native Lakebase table → Lakehouse Sync (CDC) → back into gold
  ▼
Genie Agent on gold: "Which readings needed human intervention?" "Are any pressures unusually high?"
```

| Stage | Databricks capability | Where |
|---|---|---|
| Ingest | Lakeflow Spark Declarative Pipelines, Auto Loader | `src/pipeline/` |
| Govern | Unity Catalog: volumes, grants, lineage | `src/governance/` |
| Serve | Lakebase: synced table + native overrides table, Lakehouse Sync | `src/lakebase/` |
| Intelligence | `ai_query` with a vision model: reading, unit, scale, confidence | `src/pipeline/` |
| Natural-language queries | Genie Agent | `src/genie/` |
| Business app | Databricks App: review queue with outcome KPIs, *How it works* (interactive architecture diagram), *AI model & usage*, Genie side panel | `app/` |
| AI observability and control | Unity AI Gateway: access, usage/cost (`gold_vlm_usage_daily` → app), rate limits, budgets, request logging | `src/gateway/` |

## Repository layout

```
├── README.md            ← you are here (outcome first)
├── DECISIONS.md         ← decisions and trade-offs
├── VALIDATION.md        ← evidence index: proof each stage ran (text outputs)
├── BUILD.md             ← how AI tools were used to build this
├── databricks.yml       ← Declarative Automation Bundle (deploys everything)
├── resources/           ← bundle resources: pipeline, job, app
├── data/                ← raw inputs: public gauge images, synthetic metadata, licences
├── src/
│   ├── setup/           ← catalog / schema / volume creation, data upload
│   ├── pipeline/        ← Lakeflow SDP: Auto Loader ingest, ai_query reading, gold
│   ├── governance/      ← explicit Unity Catalog grants
│   ├── lakebase/        ← synced table, overrides schema, Lakehouse Sync config
│   ├── genie/           ← Genie Agent definition + benchmark questions
│   └── gateway/         ← Unity AI Gateway: governance and observability of the vision model
├── app/                 ← Databricks App (review + override UI, embedded Genie)
├── evidence/            ← committed run outputs, as text (the evaluator reads text only)
└── deck/                ← business presentation (PDF / Markdown)
```

## Data

30 publicly licensed photographs of analog pressure gauges from Wikimedia Commons, covering clean dials, field conditions and deliberately hard cases (see `data/SOURCES.md` for licences and attribution). All gauge metadata (sites, dates, robots) is **synthetic**. No customer data is used.

## Running it

Built and running in the FE workspace `fevm-serverless-stable-kx6lwb` (catalog `serverless_stable_kx6lwb_catalog`, schema `pressure_gauge`).

| Component | Where |
|---|---|
| Review app | https://gauge-review-7474650602871732.aws.databricksapps.com |
| Pipeline | `pressure-gauge-reader-pipeline` (bundle resource `gauge_pipeline`) |
| Refresh job | `pressure-gauge-reader-refresh` (file-arrival trigger on `raw/images/`) |
| Lakebase | project `pressure-gauge-reader` (Postgres 17) |
| Genie Agent | "Gauge Inspection Readings" |

To rebuild from scratch:
```bash
# 1. Data: schema, raw volume, images + metadata
databricks schemas create pressure_gauge <catalog>
databricks volumes create <catalog> pressure_gauge raw MANAGED
databricks fs cp -r data/images dbfs:/Volumes/<catalog>/pressure_gauge/raw/images
databricks fs cp data/metadata/gauge_metadata.csv dbfs:/Volumes/<catalog>/pressure_gauge/raw/metadata/
# 2. Lakebase project, review table, Lakehouse Sync          -> src/lakebase/README.md
# 3. Pipeline + refresh job
databricks bundle deploy -t dev && databricks bundle run gauge_pipeline -t dev
# 4. Synced table (gold -> Lakebase)                          -> src/lakebase/synced_table.json
# 5. Genie Agent
python src/genie/build_space.py <catalog>.pressure_gauge > /tmp/space.json
databricks genie create-space <WAREHOUSE_ID> "$(cat /tmp/space.json)" --title "Gauge Inspection Readings"
# 6. App, then Lakebase + UC grants                           -> app/README.md, src/governance/
cd app && databricks bundle deploy && databricks bundle run app
# 7. Evidence
python src/setup/capture_evidence.py
```

## Evidence

See [VALIDATION.md](VALIDATION.md) for the run evidence behind every stage, committed as text.
