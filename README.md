# Pressure Gauge Reader

**AI-assisted gauge reading for refinery operator rounds, with a human in the loop.**

## The problem

Refineries and process plants run daily operator rounds to read hundreds of analog pressure gauges. Increasingly, inspection robots capture these as images, but turning an image into a trusted reading is still slow: readings are transcribed by hand or outsourced to a third-party vision vendor. The data lands outside the central data platform, and an out-of-range pressure can sit unnoticed until someone reviews it.

## The outcome

<!-- TODO: quantify with the impact model in deck/ — every number below must be backed by a query in evidence/ -->
- **Readings in minutes, not days:** every gauge image is read automatically when it lands.
- **Humans only review what matters:** low-confidence readings are routed to a reviewer, and corrections are audited.
- **Excursions surfaced immediately:** readings above a gauge's normal operating range are flagged, and anyone can ask about them in natural language.
- **Estimated value:** `[TBD: hours of manual rounds/transcription removed per site per year × loaded cost; vendor cost avoided per image]`

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
| Business app | Databricks App | `app/` |
| AI observability and control | Unity AI Gateway: access, usage/cost, rate limits, budgets, request logging | `src/gateway/` |

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

<!-- TODO: fill in once the bundle is built -->
```bash
databricks bundle validate --profile <PROFILE>
databricks bundle deploy -t dev --profile <PROFILE>
databricks bundle run gauge_pipeline -t dev --profile <PROFILE>
```

## Evidence

See [VALIDATION.md](VALIDATION.md) for the run evidence behind every stage, committed as text.
