# Northbay Energy Gauge Reader

**AI-assisted gauge reading for refinery operator rounds, with a human in the loop.**

*Northbay Energy is a fictional operator (one refinery, one terminal); all metadata is synthetic and the gauge photos are publicly licensed.*

**Reviewers start here:** `deck/pressure-gauge-reader.pdf` · `VALIDATION.md` (text evidence for every stage) · `DECISIONS.md` · `BUILD.md` (AI usage)

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

## Evidence of execution

Real output from the build workspace (fevm, AWS eu-central-1), captured 2026-10-07 15:34 UTC by `src/setup/capture_evidence.py`. Full results for every stage are in `evidence/` (index: `VALIDATION.md`).

### 1. Lakeflow pipeline run: 30 photos read, every table refreshed (pipeline event log)

```
Pipeline update 177c2109-d3f2-49aa-846d-8b434c3b6861   COMPLETED   serverless, triggered, full_refresh = False
Started 2026-10-06 12:49:11 UTC   Finished 12:51:52 UTC   Duration 161 s

flow                         type              output_rows
bronze_gauge_readings_ai     streaming table   30    <- Auto Loader + ai_query: 30 photos, one model call each
bronze_gauge_metadata        streaming table   30    <- metadata CSV
silver_gauge_readings        streaming table   30
quarantine_vlm_errors        streaming table    0    <- no failed model calls
gold_gauge_readings_final    materialized view 30

Later updates (incl. the refresh job, cause JOB_TASK): bronze_gauge_readings_ai output 0 rows each time,
gold refreshed 30 rows -> Auto Loader reads each photo exactly once; re-runs never re-call the model.
```

Data-quality expectations (event log, summed across updates):

```
dataset                  expectation            passed  failed
silver_gauge_readings    vlm_call_succeeded       30      0
silver_gauge_readings    response_parsed          30      0
silver_gauge_readings    reading_within_scale     30      0
silver_gauge_readings    unit_present             29      1   (warn: kept and routed to review)
bronze_gauge_metadata    gauge_id_present         30      0
bronze_gauge_metadata    captured_at_valid        30      0
```

### 2. Unity AI Gateway: every model call attributed and costed

```
system.ai_gateway.usage -> gold_vlm_usage_daily (2026-10-06, service system.ai.gpt-5-5, source AI_QUERY)
requests 33 (30 photos + 3 test calls)   errors 0   input tokens 65,063   output tokens 31,717 (29,422 reasoning)
est. cost $1.2688 at list price  ->  $0.0423 per photo
```

### 3. Unity Catalog: explicit grants and lineage

```
SHOW GRANTS ON TABLE  ...pressure_gauge.gold_gauge_readings_final   account users        SELECT
SHOW GRANTS ON VOLUME ...pressure_gauge.raw                          app service principal READ VOLUME
SHOW GRANTS ON TABLE  ...pressure_gauge.bronze_gauge_readings_ai    (no grants to analysts or the app)
system.ai (model services)                                           account users        EXECUTE

system.access.table_lineage:
  files -> bronze_gauge_readings_ai -> silver_gauge_readings -> gold_gauge_readings_final
  lb_reading_overrides_history (reviewer decisions from Lakebase) -> gold_gauge_readings_final
  system.ai_gateway.usage + system.billing.list_prices -> gold_vlm_usage_daily
```

### 4. Lakebase serving tables: query result (what the app reads)

```
databricks_postgres=> SELECT count(*) AS rows, count(*) FILTER (WHERE needs_review) AS needs_review, ...
                      FROM pressure_gauge.gauge_readings_serving;
 rows | needs_review | unexpectedly_high | human_corrected
   30 |            9 |                 4 |               1

databricks_postgres=> SELECT image_id, gauge_id, site, final_value, unit, confidence, reading_status, review_status
                      FROM pressure_gauge.gauge_readings_serving ORDER BY ... LIMIT 6;
 gauge_004.jpg | PI-1101 | Northbay Refinery |      | unknown | 0.00 | unreadable | pending_review
 gauge_003.jpg | PI-6102 | Ridgeway Terminal |  190 | psi     | 0.42 | normal     | pending_review
 gauge_006.jpg | PI-6103 | Ridgeway Terminal |  0.2 | kg/cm2  | 0.42 | normal     | pending_review
 gauge_027.jpg | PI-5102 | Ridgeway Terminal |  115 | unknown | 0.45 | normal     | pending_review
 gauge_002.jpg | PI-6101 | Ridgeway Terminal |  4.1 | psi     | 0.58 | normal     | pending_review
 gauge_030.jpg | PI-4108 | Northbay Refinery |  620 | kPa     | 0.62 | high       | pending_review
```

### 5. Human correction round trip: app -> Lakebase -> Delta -> gold -> Lakebase

```
1 App writes review.reading_overrides (Lakebase):  override_id 2 | gauge_009.jpg | override | human_value 1 |
  "Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end" | 2026-10-06 13:28:01 UTC
2 Lakehouse Sync (CDC) -> Delta lb_reading_overrides_history:  insert | _pg_lsn 30799832 | 2026-10-06T13:28:01.399
3 Pipeline (job run, cause JOB_TASK) -> gold:  PI-3102 | ai_value 5.0 | final_value 1.0 bar | overridden | is_human_corrected true
4 Snapshot sync -> pressure_gauge.gauge_readings_serving:  gauge_009.jpg | ai_value 5 | final_value 1 | overridden | t
```

### 6. Deployed Databricks App: live API responses

```
GET https://gauge-review-7474650602871732.aws.databricksapps.com/api/readings   -> HTTP 200
30 readings · lastReadAt 2026-10-06T12:49:26Z · reviewConfidenceThreshold 0.7
{ "image_id": "gauge_009.jpg", "gauge_id": "PI-3102", "ai_value": 5, "final_value": 1, "unit": "bar",
  "vlm_confidence": 0.86, "review_status": "overridden",
  "override_reason": "Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end" }

GET /api/model-usage   -> HTTP 200   { "requests": "33", "images_read": "30", "errors": "0", "est_cost_usd": 1.2688 }
GET /api/review-stats  -> HTTP 200   { "decisions": 1, "images_reviewed": 1 }
```

### 7. Genie Agent: question, generated SQL and answer

```
Q: Are any pressure readings unusually high?
Generated SQL:
  SELECT captured_at, image_id, gauge_id, site, unit_area, final_value, unit, normal_max,
         (final_value - normal_max) AS above_normal_max
  FROM serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final
  WHERE reading_status = 'high' AND final_value IS NOT NULL AND normal_max IS NOT NULL ...
  ORDER BY above_normal_max DESC
Result:
  PI-3103 | Steam & Utilities | 187.0 psi | normal max 175.0  | +12.0
  PI-3104 | Steam & Utilities |  68.0 psi | normal max 60.0   | +8.0
  PI-4108 | Instrument Air    | 620.0 kPa | normal max 615.0  | +5.0
  PI-2101 | Hydrotreater      |  20.0 bar | normal max 18.75  | +1.25
Answer: "Yes — 4 pressure readings are above their normal maximums ... The largest excursion is PI-3103."

Q: Which image readings have needed human intervention?
Generated SQL: SELECT image_id, gauge_id, site, ai_value, human_value, unit, override_reason, reviewed_by, reviewed_at
               FROM ...gold_gauge_readings_final WHERE is_human_corrected = true ORDER BY reviewed_at DESC
Answer: "1 image reading needed human intervention: gauge_009.jpg for gauge PI-3102 at Northbay Refinery.
         The AI reading was 5.0 bar, the human-corrected reading was 1.0 bar ..."
```

### Key pipeline code

Bronze: each new photo is read once by the vision model inside the Auto Loader streaming table (`src/pipeline/transformations/bronze_gauge_readings_ai.sql`, prompt abridged):

```sql
CREATE OR REFRESH STREAMING TABLE bronze_gauge_readings_ai AS
SELECT
  regexp_extract(path, '([^/]+)$', 1) AS image_file,
  path AS image_path,
  '${gauge.vlm_model}'               AS model_name,      -- system.ai.gpt-5-5 (Unity AI Gateway)
  current_timestamp()                AS read_at,
  ai_query(
    '${gauge.vlm_model}',
    'You are reading an analog pressure gauge from an inspection photo ... Return ONLY a JSON object with:
     reading_value, unit, scale_min, scale_max, confidence (0-1, within 2% of full scale), readable, issues, notes',
    files           => content,
    responseFormat  => '{"type":"json_object"}',
    failOnError     => false,
    modelParameters => named_struct('max_tokens', 16000)
  ) AS vlm
FROM STREAM read_files('${gauge.raw_path}/images/', format => 'binaryFile', pathGlobFilter => '*.{jpg,jpeg,png}');
```

Gold: business rules calculated once, so the app, Genie and reports agree (`gold_gauge_readings_final.sql`, excerpt):

```sql
ROUND(COALESCE(m.normal_max_override, 0.75 * r.scale_max), 2) AS normal_max,          -- each gauge's operating limit
CASE review_action WHEN 'override' THEN human_value WHEN 'unreadable' THEN NULL
                   ELSE ai_value END                                AS final_value,   -- latest human decision wins
(NOT vlm_readable OR vlm_confidence < ${gauge.review_threshold} OR ai_value > normal_max) AS ai_flagged,
CASE WHEN final_value IS NULL THEN 'unreadable'
     WHEN final_value > normal_max THEN 'high' ELSE 'normal' END     AS reading_status,
CASE review_action WHEN 'override' THEN 'overridden' WHEN 'confirm' THEN 'confirmed'
                   WHEN 'unreadable' THEN 'marked_unreadable'
     ELSE CASE WHEN ai_flagged THEN 'pending_review' ELSE 'auto_accepted' END END AS review_status
```

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

## More evidence

See [VALIDATION.md](VALIDATION.md) for the full run evidence behind every stage, committed as text in `evidence/`.
