# Genie Agent: questions, generated SQL and answers

_Captured 2026-10-06 13:40 UTC from the build workspace by `src/setup/capture_evidence.py`._

## Which image readings have needed human intervention?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT `image_id`, `gauge_id`, `site`, `ai_value`, `human_value`, `unit`, `override_reason`, `reviewed_by`, `reviewed_at` FROM `serverless_stable_kx6lwb_catalog`.`pressure_gauge`.`gold_gauge_readings_final` WHERE `is_human_corrected` = true ORDER BY `reviewed_at` DESC
```

**Result:**

| image_id | gauge_id | site | ai_value | human_value | unit | override_reason | reviewed_by | reviewed_at |
|---|---|---|---|---|---|---|---|---|
| gauge_009.jpg | PI-3102 | Northbay Refinery | 5.0 | 1.0 | bar | Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end | alex.dmitrewski@databricks.com | 2026-10-06T13:28:01.398Z |

**Answer:** **1 image reading** needed human intervention: image ID **gauge_009.jpg** for gauge **PI-3102** at **Northbay Refinery** was corrected from AI value **5.0 bar** to human value **1.0 bar**. The override reason was **"Read the wrong scale: needle tip is at ~1.0 bar; the AI read the counterweight end"**, and the review was completed by **alex.dmitrewski@databricks.com** at **2026-10-06T13:28:01.398Z**.

## Are any pressure readings unusually high?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT `gauge_id`, `site`, `unit_area`, `final_value`, `unit`, `normal_max`, `pct_of_scale`, `captured_at` FROM `serverless_stable_kx6lwb_catalog`.`pressure_gauge`.`gold_gauge_readings_final` WHERE `reading_status` = 'high' AND `pct_of_scale` IS NOT NULL ORDER BY `pct_of_scale` DESC
```

**Result:**

| gauge_id | site | unit_area | final_value | unit | normal_max | pct_of_scale | captured_at |
|---|---|---|---|---|---|---|---|
| PI-2101 | Northbay Refinery | Hydrotreater | 20.0 | bar | 18.75 | 0.8 | 2026-09-29T07:34:00.000Z |
| PI-4108 | Northbay Refinery | Instrument Air | 620.0 | kPa | 615.0 | 0.62 | 2026-10-02T06:27:00.000Z |
| PI-3104 | Northbay Refinery | Steam & Utilities | 68.0 | psi | 60.0 | 0.618 | 2026-09-29T18:10:00.000Z |
| PI-3103 | Northbay Refinery | Steam & Utilities | 187.0 | psi | 175.0 | 0.468 | 2026-10-04T06:45:00.000Z |

**Answer:** **Yes** — there are **4** unusually high pressure readings in the results, all from **Northbay Refinery**. Examples include:
- **PI-2101** in **Hydrotreater** at **20.0 bar** (normal max **18.75 bar**)
- **PI-4108** in **Instrument Air** at **620.0 kPa** (normal max **615.0 kPa**)
- **PI-3104** in **Steam & Utilities** at **68.0 psi** (normal max **60.0 psi**)
- **PI-3103** in **Steam & Utilities** at **187.0 psi** (normal max **175.0 psi**)
The largest over-limit reading shown is **PI-3104**, which is **8.0 psi** above its normal max.

## How many readings are still waiting for review?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT COUNT(*) AS `readings_waiting_for_review`
FROM `serverless_stable_kx6lwb_catalog`.`pressure_gauge`.`gold_gauge_readings_final`
WHERE `needs_review` = true
```

**Result:**

| readings_waiting_for_review |
|---|
| 9 |

**Answer:** There are **9** readings still waiting for review. Based on the single result returned, the current count of readings with `needs_review = true` is **9**.

## Which dials could not be read, and why?

**Status:** COMPLETED

**Generated SQL:**

```sql
SELECT gold_gauge_readings_final.image_id, gold_gauge_readings_final.gauge_id, gold_gauge_readings_final.site, gold_gauge_readings_final.unit_area, gold_gauge_readings_final.captured_at, gold_gauge_readings_final.vlm_issues
FROM serverless_stable_kx6lwb_catalog.pressure_gauge.gold_gauge_readings_final
WHERE gold_gauge_readings_final.reading_status = 'unreadable'
  AND gold_gauge_readings_final.vlm_issues IS NOT NULL
ORDER BY gold_gauge_readings_final.captured_at DESC
```

**Result:**

| image_id | gauge_id | site | unit_area | captured_at | vlm_issues |
|---|---|---|---|---|---|
| gauge_004.jpg | PI-1101 | Northbay Refinery | Crude Distillation Unit | 2026-09-29T18:04:00.000Z | dirty, blur, glare |

**Answer:** The unreadable dial shown is **gauge ID PI-1101** at **Northbay Refinery**, **Crude Distillation Unit**, from **image_id gauge_004.jpg** captured at **2026-09-29T18:04:00.000Z**. The recorded reason for unreadability is **dirty, blur, glare**; in this result, **1 dial** could not be read and all listed issues are visibility-related.
